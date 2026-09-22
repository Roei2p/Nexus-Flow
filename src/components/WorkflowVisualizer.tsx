import React, { useState } from "react";
import {
  WorkflowRecord,
  AbstractWorkflowSchema,
} from "../types";
import {
  FileSpreadsheet,
  Send,
  FileCode2,
  Filter,
  Webhook,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Key,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Terminal,
} from "lucide-react";

interface WorkflowVisualizerProps {
  workflow: WorkflowRecord;
  onOpenJsonModal: () => void;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  workflow,
  onOpenJsonModal,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleCopyWebhook = () => {
    if (!workflow.webhook_url) return;
    navigator.clipboard.writeText(workflow.webhook_url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyCurl = () => {
    const curl = `curl -X POST "${workflow.webhook_url}" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "client@enterprise.com", "amount": 450.00, "customer": "Acme Corp"}'`;
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const getNodeIcon = (type: string, name: string) => {
    const t = type.toLowerCase();
    const n = name.toLowerCase();
    if (t.includes("sheet") || n.includes("sheet")) return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    if (t.includes("telegram") || n.includes("telegram")) return <Send className="h-5 w-5 text-sky-400" />;
    if (t.includes("code") || t.includes("pdf") || n.includes("invoice") || n.includes("code"))
      return <FileCode2 className="h-5 w-5 text-amber-400" />;
    if (t.includes("if") || n.includes("validate") || n.includes("condition"))
      return <Filter className="h-5 w-5 text-indigo-400" />;
    if (t.includes("email") || t.includes("mail")) return <Mail className="h-5 w-5 text-rose-400" />;
    return <Webhook className="h-5 w-5 text-emerald-400" />;
  };

  const nodes = workflow.n8n_workflow_json?.nodes || [];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      {/* Top Banner: Workflow Header & Metadata */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-slate-100">{workflow.title}</h3>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${
                workflow.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : workflow.status === "error"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {workflow.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">v{workflow.version}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            {workflow.abstract_schema?.summary || workflow.original_prompt}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            id="view-n8n-json-btn"
            onClick={onOpenJsonModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>n8n JSON Blueprint</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Canvas / Node Graph */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            Operational Node Pipeline ({nodes.length} Nodes)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Execution Order: v1 Linear Pipeline
          </span>
        </div>

        <div className="overflow-x-auto pb-4 pt-2">
          <div className="flex items-center min-w-max space-x-3 py-2">
            {nodes.map((node, index) => {
              const isLast = index === nodes.length - 1;
              const nodeTypeShort = node.type.replace("n8n-nodes-base.", "");

              return (
                <React.Fragment key={node.id || index}>
                  {/* Node Card */}
                  <div className="w-64 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg transition-all relative group">
                    {/* Header with Type badge and Icon */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
                          {getNodeIcon(node.type, node.name)}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">
                            {node.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {nodeTypeShort}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Parameters Snippet */}
                    <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
                      {node.parameters?.event && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">event:</span>
                          <span className="text-emerald-400">{node.parameters.event}</span>
                        </div>
                      )}
                      {node.parameters?.documentId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">sheet:</span>
                          <span className="text-slate-300 truncate max-w-[120px]">
                            {node.parameters.sheetName || "Sheet1"}
                          </span>
                        </div>
                      )}
                      {node.parameters?.chatId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">chat_id:</span>
                          <span className="text-sky-300 truncate max-w-[120px]">
                            {node.parameters.chatId}
                          </span>
                        </div>
                      )}
                      {node.parameters?.operation && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">op:</span>
                          <span className="text-amber-300">{node.parameters.operation}</span>
                        </div>
                      )}
                      {node.parameters?.conditions && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">rule:</span>
                          <span className="text-indigo-300">not_empty(email)</span>
                        </div>
                      )}
                      {node.type.includes("code") && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">mode:</span>
                          <span className="text-emerald-300">invoice_synthesis</span>
                        </div>
                      )}
                    </div>

                    {/* Node status footer */}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-900">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Operational
                      </span>
                      <span className="text-slate-500 font-mono">
                        pos: [{node.position?.[0] || 0}, {node.position?.[1] || 0}]
                      </span>
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  {!isLast && (
                    <div className="flex items-center justify-center text-slate-600 px-1">
                      <div className="h-0.5 w-6 bg-slate-800" />
                      <ArrowRight className="h-4 w-4 text-emerald-500/70 -ml-1" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Webhook Endpoint & Credentials Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Webhook Ingress Link */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Webhook className="h-3.5 w-3.5 text-emerald-400" />
              Ingress Webhook Endpoint
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                id="copy-webhook-url-btn"
                onClick={handleCopyWebhook}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800 transition-colors"
              >
                {copiedWebhook ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedWebhook ? "Copied" : "Copy URL"}</span>
              </button>
              <button
                id="copy-curl-btn"
                onClick={handleCopyCurl}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800 transition-colors"
              >
                {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Terminal className="h-3 w-3" />}
                <span>{copiedCurl ? "Copied" : "Copy cURL"}</span>
              </button>
            </div>
          </div>
          <p className="font-mono text-xs text-emerald-400 bg-slate-900/90 px-3 py-2 rounded border border-slate-800 truncate">
            {workflow.webhook_url || "http://localhost:5678/webhook/nexus-auto"}
          </p>
        </div>

        {/* Credentials & Permissions */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-amber-400" />
            Connected Credentials & API Bindings
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {workflow.abstract_schema?.required_credentials?.map((cred, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {cred.replace("_", " ").toUpperCase()} OAuth/API
              </span>
            )) || (
              <span className="text-xs text-slate-500">No external credentials required</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
