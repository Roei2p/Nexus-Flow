import React, { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Loader2, Wand2, Terminal, Zap } from "lucide-react";

interface PromptStudioProps {
  onGenerate: (prompt: string, autoActivate: boolean) => Promise<void>;
  isGenerating: boolean;
  generationStep: string;
}

const TEMPLATES = [
  {
    title: "Google Sheets ➔ PDF Invoice ➔ Telegram",
    prompt:
      "When a new row is added to Google Sheets, validate the email, generate a PDF invoice, and send it via Telegram",
    badge: "Specification Benchmark",
  },
  {
    title: "Stripe Charge ➔ Slack Notification ➔ CRM",
    prompt:
      "When a Stripe charge succeeds, verify the transaction amount is greater than $100, post an alert to #sales on Slack, and log the customer in CRM",
    badge: "Fintech Ops",
  },
  {
    title: "GitHub Issue ➔ AI Summarizer ➔ Discord",
    prompt:
      "When a new issue is opened on GitHub, run sentiment analysis, format an executive summary, and dispatch to the Discord engineering webhook",
    badge: "DevOps Pipeline",
  },
  {
    title: "Webhook ➔ Fraud Filter ➔ Email Notification",
    prompt:
      "Receive webhook orders, validate customer email and country code, and send an automated order confirmation email with delivery tracking",
    badge: "E-Commerce",
  },
];

export const PromptStudio: React.FC<PromptStudioProps> = ({
  onGenerate,
  isGenerating,
  generationStep,
}) => {
  const [prompt, setPrompt] = useState(
    "When a new row is added to Google Sheets, validate the email, generate a PDF invoice, and send it via Telegram"
  );
  const [autoActivate, setAutoActivate] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), autoActivate);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wand2 className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-semibold text-slate-100">
              Component A: Spec & Orchestrator Agent
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            State your automation requirements in natural language. The agent structures triggers, conditions, and actions into a production n8n blueprint.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="auto-activate-toggle"
              checked={autoActivate}
              onChange={(e) => setAutoActivate(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <span className="text-slate-300">Auto-deploy & activate in n8n</span>
          </label>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            id="prompt-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. When a new row is added to Google Sheets, validate the email, generate a PDF invoice, and send it via Telegram..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans resize-none"
          />
        </div>

        {/* Quick starter templates */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-emerald-400" />
              Quick Templates
            </span>
            <span className="text-[11px] text-slate-500">Click to load into generator</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                id={`template-btn-${idx}`}
                onClick={() => setPrompt(tmpl.prompt)}
                disabled={isGenerating}
                className="text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/40 hover:border-slate-700/80 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {tmpl.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50">
                    {tmpl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {tmpl.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button & Active Progress */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {isGenerating ? (
            <div className="flex items-center space-x-2.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="font-mono">{generationStep || "Orchestrator Agent synthesizing blueprint..."}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Terminal className="h-3.5 w-3.5 text-slate-500" />
              <span>Target Engine:</span>
              <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                n8n v1.x REST API
              </span>
            </div>
          )}

          <button
            type="submit"
            id="synthesize-workflow-btn"
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs tracking-wide transition-all shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Workflow...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Synthesize & Deploy Workflow</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
