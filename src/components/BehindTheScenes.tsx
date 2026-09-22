import React, { useState } from "react";
import { WorkflowRecord } from "../types";
import { WorkflowVisualizer } from "./WorkflowVisualizer";
import { WorkflowsFleet } from "./WorkflowsFleet";
import { CodeExplorer } from "./CodeExplorer";
import { SelfHealingSandbox } from "./SelfHealingSandbox";
import {
  Code2,
  Layers,
  Server,
  Bug,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface BehindTheScenesProps {
  workflow: WorkflowRecord;
  workflows: WorkflowRecord[];
  onSelectWorkflow: (wf: WorkflowRecord) => void;
  onToggleActive: (wfId: string, active: boolean) => Promise<void>;
  onExecute: (simulateFailure: boolean, errorType: string) => Promise<any>;
  onSelfHeal: (executionId: string, errorTrace: string, failedNode?: string) => Promise<any>;
  isExecuting: boolean;
  isHealing: boolean;
  onOpenJsonModal: () => void;
  onBackToSimple: () => void;
}

export const BehindTheScenes: React.FC<BehindTheScenesProps> = ({
  workflow,
  workflows,
  onSelectWorkflow,
  onToggleActive,
  onExecute,
  onSelfHeal,
  isExecuting,
  isHealing,
  onOpenJsonModal,
  onBackToSimple,
}) => {
  const [subTab, setSubTab] = useState<"visualizer" | "fleet" | "code" | "sandbox">("visualizer");

  return (
    <div className="space-y-6">
      {/* Top Banner with return button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              מאחורי הקלעים
            </span>
            <h2 className="text-lg font-bold text-slate-100">
              פרטים טכניים, קוד n8n וארכיטקטורה
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            כאן שמורים כל החלקים הטכניים המורכבים (Docker, מבנה הצמתים, קבצי FastAPI ו-JSON) מבלי להעמיס על המשתמש הרגיל.
          </p>
        </div>

        <button
          type="button"
          id="back-to-simple-view-btn"
          onClick={onBackToSimple}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <ArrowRight className="h-4 w-4" />
          <span>חזרה לממשק הפשוט והנקי</span>
        </button>
      </div>

      {/* Sub navigation for advanced developer tools */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
        <button
          type="button"
          id="subtab-visualizer-btn"
          onClick={() => setSubTab("visualizer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            subTab === "visualizer"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>מבנה צמתי n8n ו-Webhook</span>
        </button>

        <button
          type="button"
          id="subtab-fleet-btn"
          onClick={() => setSubTab("fleet")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            subTab === "fleet"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>כל האוטומציות שנשמרו ({workflows.length})</span>
        </button>

        <button
          type="button"
          id="subtab-code-btn"
          onClick={() => setSubTab("code")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            subTab === "code"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          <span>קוד השרת (FastAPI ו-Docker)</span>
        </button>

        <button
          type="button"
          id="subtab-sandbox-btn"
          onClick={() => setSubTab("sandbox")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            subTab === "sandbox"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Bug className="h-3.5 w-3.5" />
          <span>מעבדת תיקון עצמי מעמיקה</span>
        </button>
      </div>

      {/* Content based on subTab */}
      {subTab === "visualizer" && (
        <WorkflowVisualizer
          workflow={workflow}
          onOpenJsonModal={onOpenJsonModal}
        />
      )}

      {subTab === "fleet" && (
        <WorkflowsFleet
          workflows={workflows}
          activeWorkflowId={workflow.id}
          onSelectWorkflow={onSelectWorkflow}
          onToggleActive={onToggleActive}
          onTriggerTest={async () => {
            setSubTab("visualizer");
          }}
        />
      )}

      {subTab === "code" && <CodeExplorer />}

      {subTab === "sandbox" && (
        <SelfHealingSandbox
          workflow={workflow}
          onExecute={onExecute}
          onSelfHeal={onSelfHeal}
          isExecuting={isExecuting}
          isHealing={isHealing}
        />
      )}
    </div>
  );
};
