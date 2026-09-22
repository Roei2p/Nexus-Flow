import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// ---------------------------------------------------------------------------
// LLM providers
//
// Primary  : NVIDIA API Catalog - OpenAI-compatible, keyed by NVIDIA_API_KEY.
//            Candidate models are the ones verified usable on this account
//            (11 of the 82 catalog models), ordered for structured JSON.
// Fallback : Google Gemini, keyed by GEMINI_API_KEY, only attempted when that
//            key is present. Kept so an existing Gemini setup still works.
//
// Each provider/model pair gets one short retry on transient trouble, then we
// move to the next model. If nothing succeeds the caller falls back to its own
// deterministic blueprint builder - a missing or slow LLM must never 500 the
// endpoint.
// ---------------------------------------------------------------------------

const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

const NVIDIA_CANDIDATE_MODELS = [
  "deepseek-ai/deepseek-v4.1-flash",
  "openai/gpt-oss-20b",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "meta/llama-3.2-11b-vision-instruct",
  "poolside/laguna-xs-2.1",
];

const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

/** Models often wrap JSON in ```json fences - strip whatever they put around it. */
function stripCodeFence(text: string): string {
  const match = text.match(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  return (match ? match[1] : text).trim();
}

/** Transient provider trouble that is worth one short retry. */
function isTransientError(errMessage: string): boolean {
  const msg = errMessage.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("resource_exhausted") ||
    msg.includes("etimedout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("abort")
  );
}

/** NVIDIA_MODELS=a,b,c overrides the default candidate list. */
function nvidiaCandidateModels(): string[] {
  const fromEnv = (process.env.NVIDIA_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : NVIDIA_CANDIDATE_MODELS;
}

/** NVIDIA API Catalog: POST {base}/chat/completions (OpenAI-compatible). */
async function callNvidia(promptText: string): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  for (const model of nvidiaCandidateModels()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 4096,
            messages: [{ role: "user", content: promptText }],
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${detail.slice(0, 300)}`);
        }

        const payload: any = await res.json();
        const text = payload?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
        throw new Error("empty completion");
      } catch (err: any) {
        const errMsg = err?.message || String(err || "");
        if (isTransientError(errMsg) && attempt === 1) {
          // Short delay before single retry
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        // Try next candidate model
        break;
      }
    }
  }

  return null;
}

// Lazy initialization for Gemini AI SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Google Gemini fallback, reached only when GEMINI_API_KEY is set.
 * Handles transient 503 high-demand, 429 rate limits, and network blips.
 */
async function callGemini(promptText: string): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: { responseMimeType: "application/json" },
        });
        const text = response.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err || "");
        if (isTransientError(errMsg) && attempt === 1) {
          // Short delay before single retry
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        // Try next candidate model
        break;
      }
    }
  }

  return null;
}

/**
 * Resilient LLM generation with provider fallback: NVIDIA first, then Gemini
 * when it is configured. Returns null when neither succeeds so callers can use
 * their deterministic blueprint builder.
 */
async function callLLMWithFallback(promptText: string): Promise<string | null> {
  const text = (await callNvidia(promptText)) ?? (await callGemini(promptText));
  return text ? stripCodeFence(text) : null;
}

// In-memory persistent state for live web dashboard session
interface AbstractTrigger {
  name: string;
  type: string;
  service: string;
  configuration: Record<string, any>;
}

interface AbstractCondition {
  field: string;
  operator: string;
  value: any;
  description: string;
}

interface AbstractAction {
  name: string;
  service: string;
  operation: string;
  parameters: Record<string, any>;
}

interface AbstractWorkflowSchema {
  title: string;
  summary: string;
  trigger: AbstractTrigger;
  conditions: AbstractCondition[];
  actions: AbstractAction[];
  required_credentials: string[];
}

interface WorkflowRecord {
  id: string;
  title: string;
  original_prompt: string;
  n8n_workflow_id: string;
  n8n_workflow_json: any;
  abstract_schema: AbstractWorkflowSchema;
  status: "draft" | "deployed" | "active" | "error" | "self_healing";
  is_active: boolean;
  webhook_url: string;
  version: number;
  created_at: string;
  updated_at: string;
  executions: ExecutionRecord[];
}

interface ExecutionRecord {
  id: string;
  workflow_id: string;
  n8n_execution_id: string;
  status: "success" | "failed" | "healed";
  input_payload: any;
  output_payload?: any;
  error_trace?: string;
  was_self_healed: boolean;
  healing_summary?: string;
  created_at: string;
}

const mockWorkflows: WorkflowRecord[] = [
  {
    id: "wf-default-1",
    title: "הפקת חשבונית מ-Google Sheets ושליחה בטלגרם",
    original_prompt:
      "בכל פעם שנוספת שורה ב-Google Sheets, בדוק את תקינות האימייל, הפק חשבונית מס ב-PDF ושלח אותה בטלגרם",
    n8n_workflow_id: "n8n-live-78219",
    status: "active",
    is_active: true,
    webhook_url: "http://localhost:5678/webhook/nexus-gsheet-inv",
    version: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    abstract_schema: {
      title: "הפקת חשבונית מ-Google Sheets ושליחה בטלגרם",
      summary:
        "האוטומציה עוקבת אחר שורות חדשות בגליון Google Sheets, בודקת את תקינות כתובת האימייל של הלקוח, מפיקה חשבונית מס דיגיטלית ושולחת אותה מיידית בהודעת טלגרם.",
      trigger: {
        name: "קליטת שורה חדשה ב-Google Sheets",
        type: "polling",
        service: "google_sheets",
        configuration: {
          sheet_id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
          sheet_name: "Invoices",
        },
      },
      conditions: [
        {
          field: "email",
          operator: "is_not_empty",
          value: true,
          description: "וידוא שכתובת האימייל קיימת ותקינה לפני הפקת החשבונית",
        },
      ],
      actions: [
        {
          name: "הפקת חשבונית מס PDF",
          service: "pdf_generator",
          operation: "createDocument",
          parameters: { format: "A4", template: "tax_invoice" },
        },
        {
          name: "שליחת התראה וקובץ בטלגרם",
          service: "telegram",
          operation: "sendMessage",
          parameters: {
            chat_id: "-100234567890",
            text: "={{ '🤖 Nexus-Flow התראה:\\nחשבונית: ' + $json.invoice_id + '\\nנמען: ' + $json.recipient }}",
          },
        },
      ],
      required_credentials: ["google_sheets", "telegram"],
    },
    n8n_workflow_json: {
      name: "הפקת חשבונית מ-Google Sheets ושליחה בטלגרם",
      nodes: [
        {
          id: "node-1",
          name: "קליטת שורה ב-Sheets",
          type: "n8n-nodes-base.googleSheetsTrigger",
          typeVersion: 1,
          position: [240, 300],
          parameters: {
            pollTimes: { item: [{ mode: "everyMinute" }] },
            event: "rowAdded",
            documentId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
            sheetName: "Invoices",
          },
        },
        {
          id: "node-2",
          name: "בדיקת תקינות אימייל",
          type: "n8n-nodes-base.if",
          typeVersion: 2,
          position: [500, 300],
          parameters: {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
              conditions: [
                {
                  id: "cond-1",
                  leftValue: "={{ $json.email }}",
                  rightValue: "",
                  operator: { type: "string", operation: "notEmpty" },
                },
              ],
            },
          },
        },
        {
          id: "node-3",
          name: "הפקת חשבונית מס PDF",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [760, 300],
          parameters: {
            mode: "runOnceForEachItem",
            jsCode:
              "const item = $input.item.json;\nreturn {\n  invoice_id: 'INV-' + Math.floor(Math.random() * 900000 + 100000),\n  recipient: item.email || 'customer@example.com',\n  amount: item.amount || 149.00,\n  currency: 'ILS',\n  status: 'GENERATED',\n  generated_at: new Date().toISOString()\n};",
          },
        },
        {
          id: "node-4",
          name: "שליחה בטלגרם",
          type: "n8n-nodes-base.telegram",
          typeVersion: 1.2,
          position: [1020, 300],
          parameters: {
            resource: "message",
            operation: "sendMessage",
            chatId: "-100234567890",
            text: "={{ '🤖 Nexus-Flow התראה:\\nחשבונית: ' + $json.invoice_id + '\\nנמען: ' + $json.recipient }}",
            additionalFields: { parse_mode: "Markdown" },
          },
        },
      ],
      connections: {
        "קליטת שורה ב-Sheets": {
          main: [[{ node: "בדיקת תקינות אימייל", type: "main", index: 0 }]],
        },
        "בדיקת תקינות אימייל": {
          main: [[{ node: "הפקת חשבונית מס PDF", type: "main", index: 0 }]],
        },
        "הפקת חשבונית מס PDF": {
          main: [[{ node: "שליחה בטלגרם", type: "main", index: 0 }]],
        },
      },
      settings: {
        executionOrder: "v1",
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
        saveManualExecutions: true,
      },
    },
    executions: [
      {
        id: "exec-init-1",
        workflow_id: "wf-default-1",
        n8n_execution_id: "exec-98241",
        status: "success",
        input_payload: {
          name: "ישראל ישראלי",
          email: "israel@enterprise-corp.co.il",
          amount: 540.0,
          tier: "עסקי",
        },
        output_payload: {
          invoice_id: "INV-892401",
          telegram_message_id: 48921,
          status: "נמסר בהצלחה",
        },
        was_self_healed: false,
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
];

function buildFallbackBlueprint(prompt: string): { schema: AbstractWorkflowSchema; n8nJson: any } {
  const p = prompt.toLowerCase();
  const isHebrew = /[\u0590-\u05FF]/.test(prompt);

  let triggerService = "webhook";
  let triggerName = isHebrew ? "קליטת אירוע (Webhook)" : "Webhook Ingress";
  let triggerConfig: any = { path: "nexus-" + Math.random().toString(36).substring(2, 8) };

  if (p.includes("sheet") || p.includes("שיטס") || p.includes("גוגל") || p.includes("גיליון") || p.includes("טבלה")) {
    triggerService = "google_sheets";
    triggerName = isHebrew ? "קליטת שורה ב-Google Sheets" : "Google Sheets Trigger";
    triggerConfig = { sheet_id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", sheet_name: "Sheet1" };
  } else if (p.includes("stripe") || p.includes("payment") || p.includes("סטרייפ") || p.includes("תשלום") || p.includes("אשראי")) {
    triggerService = "stripe";
    triggerName = isHebrew ? "קליטת תשלום ב-Stripe" : "Stripe Payment Ingress";
    triggerConfig = { event: "charge.succeeded" };
  } else if (p.includes("github") || p.includes("גיטהאב")) {
    triggerService = "github";
    triggerName = isHebrew ? "האזנה ל-GitHub" : "GitHub Webhook";
    triggerConfig = { events: ["issues"] };
  }

  const conditions: AbstractCondition[] = [];
  if (p.includes("validate") || p.includes("email") || p.includes("check") || p.includes("אימייל") || p.includes("מייל") || p.includes("בדיק") || p.includes("תקינ")) {
    conditions.push({
      field: "email",
      operator: "is_not_empty",
      value: true,
      description: isHebrew ? "וידוא שכתובת האימייל קיימת ומלאה" : "Verify email attribute is present and valid",
    });
  }

  const actions: AbstractAction[] = [];
  if (p.includes("pdf") || p.includes("invoice") || p.includes("חשבונית") || p.includes("קבלה")) {
    actions.push({
      name: isHebrew ? "הפקת חשבונית מס PDF" : "Generate PDF Invoice",
      service: "pdf_generator",
      operation: "createDocument",
      parameters: { format: "A4", template: "tax_invoice" },
    });
  }
  if (p.includes("telegram") || p.includes("טלגרם")) {
    actions.push({
      name: isHebrew ? "שליחת התראה בטלגרם" : "Dispatch Telegram Alert",
      service: "telegram",
      operation: "sendMessage",
      parameters: { chatId: "-100234567890", text: "={{ '🤖 Nexus-Flow התראה: ' + JSON.stringify($json) }}" },
    });
  } else if (p.includes("slack") || p.includes("סלאק")) {
    actions.push({
      name: isHebrew ? "שליחת הודעה ל-Slack" : "Post Slack Message",
      service: "slack",
      operation: "postMessage",
      parameters: { channel: "#alerts", text: "={{ '🚀 אירוע נקלט ועובד: ' + $json.id }}" },
    });
  } else if (p.includes("email") || p.includes("mail") || p.includes("מייל") || p.includes("דואל")) {
    actions.push({
      name: isHebrew ? "שליחת אימייל ללקוח" : "Send Confirmation Email",
      service: "email",
      operation: "send",
      parameters: { subject: "הודעה אוטומטית מ-Nexus-Flow" },
    });
  } else {
    actions.push({
      name: isHebrew ? "שליחת נתונים ל-API חיצוני" : "HTTP API Dispatcher",
      service: "http_request",
      operation: "postWebhook",
      parameters: { url: "https://api.nexusflow.internal/dispatch" },
    });
  }

  const title = isHebrew
    ? `אוטומציה: מ-${triggerName} אל ${actions[actions.length - 1].name}`
    : `Nexus: ${triggerName} to ${actions[actions.length - 1].name}`;

  const summary = isHebrew
    ? `תהליך אוטומטי המגיב לאירוע ${triggerName}, בודק את הנתונים ומבצע ${actions.map((a) => a.name).join(" ו-")}.`
    : `Autonomous pipeline responding to ${triggerName} and routing validated payloads to ${actions.map((a) => a.name).join(" and ")}.`;

  const schema: AbstractWorkflowSchema = {
    title,
    summary,
    trigger: {
      name: triggerName,
      type: triggerService === "google_sheets" ? "polling" : "webhook",
      service: triggerService,
      configuration: triggerConfig,
    },
    conditions,
    actions,
    required_credentials: [triggerService, ...actions.map((a) => a.service)],
  };

  // Build n8n nodes
  const nodes: any[] = [];
  const connections: any = {};
  let curX = 240;
  const startY = 300;

  // Trigger Node
  if (triggerService === "google_sheets") {
    nodes.push({
      id: "node-trig-" + Date.now(),
      name: triggerName,
      type: "n8n-nodes-base.googleSheetsTrigger",
      typeVersion: 1,
      position: [curX, startY],
      parameters: {
        pollTimes: { item: [{ mode: "everyMinute" }] },
        event: "rowAdded",
        documentId: triggerConfig.sheet_id,
        sheetName: triggerConfig.sheet_name,
      },
    });
  } else if (triggerService === "stripe") {
    nodes.push({
      id: "node-trig-" + Date.now(),
      name: triggerName,
      type: "n8n-nodes-base.stripeTrigger",
      typeVersion: 1,
      position: [curX, startY],
      parameters: { events: ["charge.succeeded"] },
    });
  } else {
    nodes.push({
      id: "node-trig-" + Date.now(),
      name: triggerName,
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [curX, startY],
      parameters: {
        httpMethod: "POST",
        path: triggerConfig.path || "nexus-event",
        responseMode: "onReceived",
      },
    });
  }

  let prevNode = triggerName;
  curX += 260;

  if (conditions.length > 0) {
    const ifNodeName = `Validate ${conditions[0].field.toUpperCase()}`;
    nodes.push({
      id: "node-if-" + Date.now(),
      name: ifNodeName,
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [curX, startY],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
          conditions: [
            {
              id: "cond-auto",
              leftValue: `={{ $json.${conditions[0].field} }}`,
              rightValue: "",
              operator: { type: "string", operation: "notEmpty" },
            },
          ],
        },
      },
    });
    connections[prevNode] = {
      main: [[{ node: ifNodeName, type: "main", index: 0 }]],
    };
    prevNode = ifNodeName;
    curX += 260;
  }

  actions.forEach((act, idx) => {
    let nodeType = "n8n-nodes-base.httpRequest";
    let params: any = {};

    if (act.service === "pdf_generator") {
      nodeType = "n8n-nodes-base.code";
      params = {
        mode: "runOnceForEachItem",
        jsCode:
          "return {\n  invoice_id: 'INV-' + Math.floor(Math.random() * 900000 + 100000),\n  recipient: $input.item.json.email || 'user@example.com',\n  amount: $input.item.json.amount || 299.00,\n  currency: 'USD',\n  status: 'PROCESSED'\n};",
      };
    } else if (act.service === "telegram") {
      nodeType = "n8n-nodes-base.telegram";
      params = {
        resource: "message",
        operation: "sendMessage",
        chatId: "-100234567890",
        text: "={{ '🤖 Nexus-Flow Alert:\\n' + JSON.stringify($json) }}",
        additionalFields: { parse_mode: "Markdown" },
      };
    } else if (act.service === "slack") {
      nodeType = "n8n-nodes-base.slack";
      params = {
        resource: "chat",
        operation: "postMessage",
        channel: "#alerts",
        text: "={{ '🚀 Event processed: ' + $json.id }}",
      };
    } else if (act.service === "email") {
      nodeType = "n8n-nodes-base.emailSend";
      params = {
        toEmail: "={{ $json.email || 'customer@nexusflow.ai' }}",
        subject: "Nexus-Flow Automated Notification",
        text: "Your action was processed successfully by Nexus-Flow.",
      };
    } else {
      nodeType = "n8n-nodes-base.httpRequest";
      params = {
        method: "POST",
        url: "https://api.nexusflow.internal/dispatch",
        sendBody: true,
      };
    }

    nodes.push({
      id: "node-act-" + idx + "-" + Date.now(),
      name: act.name,
      type: nodeType,
      typeVersion: 2,
      position: [curX, startY + (idx % 2 === 0 ? 10 : -10)],
      parameters: params,
    });

    connections[prevNode] = {
      main: [[{ node: act.name, type: "main", index: 0 }]],
    };
    prevNode = act.name;
    curX += 260;
  });

  const n8nJson = {
    name: schema.title,
    nodes,
    connections,
    settings: {
      executionOrder: "v1",
      saveDataErrorExecution: "all",
      saveDataSuccessExecution: "all",
      saveManualExecutions: true,
    },
  };

  return { schema, n8nJson };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // =====================================================================
  // API Routes
  // =====================================================================

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "Nexus-Flow Autonomous Automation Factory",
      timestamp: new Date().toISOString(),
      llm: {
        provider: "nvidia",
        nvidia_available: !!process.env.NVIDIA_API_KEY,
        gemini_fallback: !!process.env.GEMINI_API_KEY,
      },
    });
  });

  // System stats
  app.get("/api/stats", (req, res) => {
    const totalWorkflows = mockWorkflows.length;
    const activeWorkflows = mockWorkflows.filter((w) => w.is_active).length;
    let totalExecutions = 0;
    let healedExecutions = 0;
    mockWorkflows.forEach((w) => {
      totalExecutions += w.executions.length;
      healedExecutions += w.executions.filter((e) => e.was_self_healed).length;
    });

    res.json({
      total_workflows: totalWorkflows,
      active_workflows: activeWorkflows,
      total_executions: totalExecutions,
      healed_executions: healedExecutions,
      healing_rate: totalExecutions > 0 ? Math.round((healedExecutions / totalExecutions) * 100) : 100,
    });
  });

  // Get all workflows
  app.get("/api/workflows", (req, res) => {
    res.json(mockWorkflows);
  });

  // Get single workflow
  app.get("/api/workflows/:id", (req, res) => {
    const wf = mockWorkflows.find((w) => w.id === req.params.id);
    if (!wf) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    res.json(wf);
  });

  // Generate workflow using Gemini Agent Engine (Component A)
  app.post("/api/workflows/generate", async (req, res) => {
    try {
      const { prompt, auto_activate = true } = req.body;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
        return res.status(400).json({ error: "Prompt must be at least 5 characters." });
      }

      let schema: AbstractWorkflowSchema;
      let n8nJson: any;

      const isHebrew = /[\u0590-\u05FF]/.test(prompt);
      const systemPrompt = `You are Nexus-Flow Spec & Orchestrator Agent.
The user wants to automate a business workflow with an autonomous cloud execution engine.
Parse their prompt into an Abstract Workflow Schema with:
- title: concise workflow name (if user prompt is in Hebrew, write the title in fluent Hebrew)
- summary: 1-2 sentence simple description (if user prompt is in Hebrew, write in fluent Hebrew)
- trigger: { name, type: ('webhook'|'polling'|'schedule'), service: ('google_sheets'|'stripe'|'webhook'|'github'), configuration: {} }
- conditions: array of { field, operator, value, description }
- actions: array of { name, service: ('pdf_generator'|'telegram'|'slack'|'email'|'http_request'), operation, parameters: {} }
- required_credentials: array of services needing authentication

IMPORTANT: If the user wrote in Hebrew, write the title, summary, action names, and descriptions in clear, simple Hebrew without technical jargon.
Return STRICT JSON matching this structure.`;

      const fallback = buildFallbackBlueprint(prompt);
      const raw = await callLLMWithFallback(`${systemPrompt}\n\nUser Request: ${prompt}`);

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          schema = {
            title: parsed.title || fallback.schema.title,
            summary: parsed.summary || fallback.schema.summary,
            trigger: parsed.trigger || fallback.schema.trigger,
            conditions: Array.isArray(parsed.conditions) ? parsed.conditions : fallback.schema.conditions,
            actions: Array.isArray(parsed.actions) && parsed.actions.length > 0 ? parsed.actions : fallback.schema.actions,
            required_credentials: parsed.required_credentials || fallback.schema.required_credentials,
          };
          n8nJson = fallback.n8nJson;
          n8nJson.name = schema.title;
        } catch {
          schema = fallback.schema;
          n8nJson = fallback.n8nJson;
        }
      } else {
        schema = fallback.schema;
        n8nJson = fallback.n8nJson;
      }

      // Extract webhook path
      let webhookUrl = "http://localhost:5678/webhook/nexus-auto";
      for (const node of n8nJson.nodes) {
        if (node.type?.includes("webhook") && node.parameters?.path) {
          webhookUrl = `http://localhost:5678/webhook/${node.parameters.path}`;
          break;
        }
      }

      const newWf: WorkflowRecord = {
        id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: schema.title,
        original_prompt: prompt,
        n8n_workflow_id: `n8n-${Math.floor(Math.random() * 90000 + 10000)}`,
        status: auto_activate ? "active" : "deployed",
        is_active: auto_activate,
        webhook_url: webhookUrl,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        abstract_schema: schema,
        n8n_workflow_json: n8nJson,
        executions: [],
      };

      mockWorkflows.unshift(newWf);

      res.status(201).json({
        success: true,
        workflow: newWf,
        summary: schema.summary,
      });
    } catch (err: any) {
      console.error("Workflow generation failed:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Toggle active status
  app.post("/api/workflows/:id/activate", (req, res) => {
    const wf = mockWorkflows.find((w) => w.id === req.params.id);
    if (!wf) return res.status(404).json({ error: "Workflow not found" });

    const { activate = true } = req.body;
    wf.is_active = activate;
    wf.status = activate ? "active" : "draft";
    wf.updated_at = new Date().toISOString();

    res.json({ success: true, workflow: wf });
  });

  // Execute workflow (simulate or run)
  app.post("/api/workflows/:id/execute", (req, res) => {
    const wf = mockWorkflows.find((w) => w.id === req.params.id);
    if (!wf) return res.status(404).json({ error: "Workflow not found" });

    const { simulate_failure = false, error_type = "telegram_400", custom_payload } = req.body;

    const inputPayload = custom_payload || {
      customer_id: "CUST-4819",
      email: "alex.taylor@enterprise-corp.com",
      amount: 1240.0,
      tier: "Gold",
      timestamp: new Date().toISOString(),
    };

    const execId = `exec-${Math.floor(Math.random() * 900000 + 100000)}`;

    if (simulate_failure) {
      let errorTrace = "";
      let failedNode = "";

      if (error_type === "telegram_400") {
        failedNode = "Dispatch Telegram Alert";
        errorTrace = `NodeApiError: Bad Request: can't parse entities: Character '(' is reserved and must be escaped with the preceding '\\'
    at Object.telegramApiRequest (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/Telegram/GenericFunctions.js:142:15)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at Object.execute (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/Telegram/Telegram.node.js:891:36)
Error Code: 400 | Node: Dispatch Telegram Alert | Chat: -100234567890`;
      } else if (error_type === "sheets_missing_column") {
        failedNode = "Validate Email";
        errorTrace = `TypeError: Cannot read properties of undefined (reading 'email')
    at Object.execute (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/If/If.node.js:124:28)
    at Workflow.runNode (/usr/local/lib/node_modules/n8n/packages/core/src/Workflow.ts:658:19)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
Error Code: UNCAUGHT_EXCEPTION | Node: Validate Email`;
      } else {
        failedNode = "HTTP API Dispatcher";
        errorTrace = `ETIMEDOUT: Connection to remote webhook destination timed out after 10000ms
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1494:16)
Error Code: ETIMEDOUT | Node: HTTP API Dispatcher`;
      }

      const failureLog: ExecutionRecord = {
        id: execId,
        workflow_id: wf.id,
        n8n_execution_id: `n8n-run-${Date.now()}`,
        status: "failed",
        input_payload: inputPayload,
        error_trace: errorTrace,
        was_self_healed: false,
        created_at: new Date().toISOString(),
      };

      wf.status = "error";
      wf.executions.unshift(failureLog);

      return res.json({
        success: false,
        status: "failed",
        execution: failureLog,
        failed_node: failedNode,
        self_healing_available: true,
        message: "Execution encountered a node failure. Self-Healing Agent is standing by.",
      });
    }

    // Success execution
    const successLog: ExecutionRecord = {
      id: execId,
      workflow_id: wf.id,
      n8n_execution_id: `n8n-run-${Date.now()}`,
      status: "success",
      input_payload: inputPayload,
      output_payload: {
        status: "success",
        processed_at: new Date().toISOString(),
        execution_time_ms: 384,
        nodes_executed: wf.n8n_workflow_json.nodes.length,
        output_data: {
          invoice_id: "INV-" + Math.floor(Math.random() * 900000 + 100000),
          delivered: true,
        },
      },
      was_self_healed: false,
      created_at: new Date().toISOString(),
    };

    wf.status = "active";
    wf.executions.unshift(successLog);

    res.json({
      success: true,
      status: "success",
      execution: successLog,
      message: "Workflow executed successfully without runtime errors.",
    });
  });

  // Component C: Self-Healing Agent
  app.post("/api/workflows/:id/self-heal", async (req, res) => {
    try {
      const wf = mockWorkflows.find((w) => w.id === req.params.id);
      if (!wf) return res.status(404).json({ error: "Workflow not found" });

      const { execution_id, error_trace, failed_node } = req.body;

      let diagnosis = {
        root_cause: "הודעת הטלגרם נכשלה בגלל תווים מיוחדים שלא קודדו כראוי בפורמט Markdown.",
        failed_node_name: failed_node || "שליחה בטלגרם",
        fix_applied:
          "המערכת שינתה באופן אוטונומי את הגדרת ההודעה לתצורת HTML בטוחה ועטפה את הנתונים במבנה מוגן מפני שגיאות.",
        prevention_tip: "מומלץ להשתמש בפורמט HTML עבור הודעות מערכת דינמיות למניעת שגיאות קידוד.",
      };

      if (error_trace) {
        const healPrompt = `You are the Self-Healing & Monitoring Agent in Nexus-Flow.
An execution failed with this error:
"${error_trace}"
Failed node: "${failed_node || "unknown"}"

Provide a structured JSON diagnosis in clear, friendly HEBREW with:
- root_cause: 1 clear sentence in Hebrew explaining what went wrong in plain words
- failed_node_name: name of node
- fix_applied: 1 sentence in Hebrew explaining the automatic fix applied
- prevention_tip: 1 sentence in Hebrew with a simple tip

Return STRICT JSON.`;

        const raw = await callLLMWithFallback(healPrompt);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.root_cause && parsed.fix_applied) {
              diagnosis = parsed;
            }
          } catch {
            // Keep default robust Hebrew diagnosis
          }
        }
      }

      // Patch the n8n nodes
      const patchedJson = JSON.parse(JSON.stringify(wf.n8n_workflow_json));
      for (const node of patchedJson.nodes) {
        if (node.name === diagnosis.failed_node_name || node.type?.includes("telegram")) {
          node.parameters = node.parameters || {};
          node.parameters.additionalFields = { parse_mode: "HTML" };
          node.parameters.text =
            "={{ '🤖 <b>Nexus-Flow Alert:</b>\\n<code>' + JSON.stringify($json, null, 2) + '</code>' }}";
        } else if (node.type?.includes("if")) {
          node.parameters.conditions.options.typeValidation = "loose";
        }
      }

      wf.n8n_workflow_json = patchedJson;
      wf.version += 1;
      wf.status = "active";
      wf.updated_at = new Date().toISOString();

      if (execution_id) {
        const log = wf.executions.find((e) => e.id === execution_id);
        if (log) {
          log.was_self_healed = true;
          log.status = "healed";
          log.healing_summary = diagnosis.fix_applied;
        }
      }

      res.json({
        success: true,
        workflow: wf,
        diagnosis,
        diff_summary: `Healed node '${diagnosis.failed_node_name}': ${diagnosis.fix_applied}`,
        new_version: wf.version,
      });
    } catch (err: any) {
      console.error("Self-healing error:", err);
      res.status(500).json({ error: err.message || "Failed to execute self-healing" });
    }
  });

  // Source Code Explorer endpoint (provides Python & Docker project files)
  app.get("/api/project-code", (req, res) => {
    try {
      const files: Record<string, string> = {};
      const load = (filePath: string, key: string) => {
        const full = path.join(process.cwd(), filePath);
        if (fs.existsSync(full)) {
          files[key] = fs.readFileSync(full, "utf8");
        }
      };

      load("docker-compose.yml", "docker-compose.yml");
      load("backend/main.py", "backend/main.py");
      load("backend/models.py", "backend/models.py");
      load("backend/n8n_service.py", "backend/n8n_service.py");
      load("backend/agent_engine.py", "backend/agent_engine.py");
      load("backend/database.py", "backend/database.py");
      load("backend/requirements.txt", "backend/requirements.txt");
      load("backend/Dockerfile", "backend/Dockerfile");
      load(".env.example", ".env.example");

      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // =====================================================================
  // Vite Integration (Development vs. Production)
  // =====================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexus-Flow Orchestrator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
