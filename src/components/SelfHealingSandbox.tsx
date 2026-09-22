import React, { useState } from "react";
import {
  WorkflowRecord,
  ExecutionRecord,
  HealingDiagnosis,
} from "../types";
import {
  Play,
  Bug,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Terminal,
  ArrowRight,
  Cpu,
} from "lucide-react";

interface SelfHealingSandboxProps {
  workflow: WorkflowRecord;
  onExecute: (simulateFailure: boolean, errorType: string) => Promise<any>;
  onSelfHeal: (executionId: string, errorTrace: string, failedNode?: string) => Promise<any>;
  isExecuting: boolean;
  isHealing: boolean;
}

export const SelfHealingSandbox: React.FC<SelfHealingSandboxProps> = ({
  workflow,
  onExecute,
  onSelfHeal,
  isExecuting,
  isHealing,
}) => {
  const [simulateFailure, setSimulateFailure] = useState(true);
  const [errorType, setErrorType] = useState("telegram_400");
  const [lastResult, setLastResult] = useState<any>(null);
  const [lastDiagnosis, setLastDiagnosis] = useState<HealingDiagnosis | null>(null);

  const handleRunExecution = async () => {
    setLastDiagnosis(null);
    const result = await onExecute(simulateFailure, errorType);
    setLastResult(result);
  };

  const handleTriggerHeal = async () => {
    if (!lastResult?.execution) return;
    const diag = await onSelfHeal(
      lastResult.execution.id,
      lastResult.execution.error_trace || "",
      lastResult.failed_node
    );
    if (diag?.diagnosis) {
      setLastDiagnosis(diag.diagnosis);
    }
  };

  const executions = workflow.executions || [];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-6 w-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Cpu className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-semibold text-slate-100">
              Component C: Self-Healing & Monitoring Sandbox
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate real executions or inject runtime failures. The Self-Healing Agent intercepts the error stack trace, diagnoses the bug, and patches the n8n blueprint.
          </p>
        </div>

        {/* Execution Trigger Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Failure Injection toggle */}
          <div className="flex items-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                id="inject-failure-toggle"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500"
              />
              <span className="flex items-center gap-1">
                <Bug className="h-3 w-3 text-rose-400" />
                Inject Error
              </span>
            </label>

            {simulateFailure && (
              <select
                id="error-type-select"
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className="ml-2 bg-slate-900 text-slate-300 text-[11px] font-mono rounded px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="telegram_400">Telegram 400 Bad Request</option>
                <option value="sheets_missing_column">Sheets Missing Column</option>
                <option value="http_timeout">Downstream Timeout</option>
              </select>
            )}
          </div>

          {/* Run Button */}
          <button
            id="run-execution-test-btn"
            onClick={handleRunExecution}
            disabled={isExecuting || isHealing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md ${
              simulateFailure
                ? "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/10"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10"
            } disabled:opacity-50`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Executing Node Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{simulateFailure ? "Test Injected Failure" : "Execute Test Run"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Diagnostics & Self-Healing Action Banner */}
      {lastResult && !lastResult.success && !lastDiagnosis && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 shadow-lg space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mt-0.5 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-200">
                  Execution Failed in Node:{" "}
                  <span className="underline font-mono">{lastResult.failed_node || "Execution Node"}</span>
                </h4>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  Runtime exception captured from n8n execution telemetry. Self-Healing Agent ready to repair.
                </p>
              </div>
            </div>

            <button
              id="activate-self-heal-btn"
              onClick={handleTriggerHeal}
              disabled={isHealing}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20 shrink-0"
            >
              {isHealing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Agent Repairing Node Config...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Activate Self-Healing Agent</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Stack Trace Box */}
          <div className="bg-slate-950 rounded-lg p-3 border border-rose-900/50 font-mono text-[11px] text-rose-300/90 overflow-x-auto whitespace-pre leading-relaxed">
            {lastResult.execution?.error_trace}
          </div>
        </div>
      )}

      {/* Healed Report Card */}
      {lastDiagnosis && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 shadow-lg space-y-3 animate-in fade-in">
          <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Self-Healing Loop Completed Successfully (Upgraded to v{workflow.version})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Root Cause Diagnosis:</span>
              <p className="text-slate-200">{lastDiagnosis.root_cause}</p>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium">Applied Configuration Fix:</span>
              <p className="text-emerald-300 font-mono text-[11px]">{lastDiagnosis.fix_applied}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              <strong className="text-slate-300">Prevention Tip:</strong> {lastDiagnosis.prevention_tip}
            </span>
            <span className="text-emerald-400 font-mono font-medium">Status: n8n Re-synced</span>
          </div>
        </div>
      )}

      {/* Successful Execution Preview */}
      {lastResult && lastResult.success && (
        <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-4 space-y-2 animate-in fade-in">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Workflow Executed Cleanly</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre>{JSON.stringify(lastResult.execution?.output_payload, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Execution Telemetry Log Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-slate-400" />
            Execution Telemetry History ({executions.length} Runs)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Real-time n8n API Polling</span>
        </div>

        {executions.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">
            No executions recorded yet. Click "Execute Test Run" to trigger the workflow.
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
            <div className="divide-y divide-slate-800">
              {executions.map((exec) => (
                <div key={exec.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3">
                    {exec.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {exec.status === "failed" && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                    {exec.status === "healed" && <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-300 font-medium">{exec.n8n_execution_id}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                            exec.status === "healed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : exec.status === "failed"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {exec.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {new Date(exec.created_at).toLocaleTimeString()} · Trigger payload: {Object.keys(exec.input_payload || {}).join(", ") || "raw"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {exec.was_self_healed ? (
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Auto-repaired by Agent
                      </span>
                    ) : exec.status === "failed" ? (
                      <span className="text-[11px] text-rose-400 font-mono">
                        Error intercepted
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        200 OK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
