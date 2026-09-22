import React, { useState, useEffect } from "react";
import { Header, NavView } from "./components/Header";
import { LandingHero } from "./components/LandingHero";
import { SimplePromptStudio } from "./components/SimplePromptStudio";
import { SimpleWorkflowView } from "./components/SimpleWorkflowView";
import { WorkflowsFleet } from "./components/WorkflowsFleet";
import { OAuthConnectCenter } from "./components/OAuthConnectCenter";
import { PricingPlans } from "./components/PricingPlans";
import { ProductionLaunchRoadmap } from "./components/ProductionLaunchRoadmap";
import { WorkflowRecord, SystemStats } from "./types";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<NavView>("studio");
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>("");
  const [externalPrompt, setExternalPrompt] = useState<string>("");
  const [stats, setStats] = useState<SystemStats>({
    total_workflows: 1,
    active_workflows: 1,
    total_executions: 1,
    healed_executions: 0,
    healing_rate: 100,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isHealing, setIsHealing] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch initial workflows and stats
  useEffect(() => {
    fetch("/api/workflows")
      .then((res) => res.json())
      .then((data: WorkflowRecord[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setWorkflows(data);
          setActiveWorkflowId(data[0].id);
        }
      })
      .catch((err) => console.error("Error loading workflows:", err));

    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.total_workflows === "number") {
          setStats(data);
        }
      })
      .catch((err) => console.error("Error loading stats:", err));
  }, []);

  const refreshStats = () => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  };

  const activeWorkflow =
    workflows.find((w) => w.id === activeWorkflowId) || workflows[0] || null;

  // Handle Workflow Generation
  const handleGenerateWorkflow = async (prompt: string, autoActivate: boolean) => {
    setIsGenerating(true);
    setGenerationStep("מנתח את כוונת המשתמש ומזהה את השירותים המבוקשים...");

    try {
      setTimeout(() => {
        setGenerationStep("בונה את תהליך האוטומציה: טריגר, תנאי בדיקה ופעולות...");
      }, 700);

      setTimeout(() => {
        setGenerationStep("מחבר את השלבים ומפעיל את האוטומציה בענן...");
      }, 1400);

      const response = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, auto_activate: autoActivate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "יצירת האוטומציה נכשלה");
      }

      const data = await response.json();
      if (data.workflow) {
        setWorkflows((prev) => [data.workflow, ...prev]);
        setActiveWorkflowId(data.workflow.id);
        showToast("האוטומציה נבנתה בהצלחה ופועלת בענן! ✨");
        refreshStats();

        // Scroll to workflow preview
        setTimeout(() => {
          const el = document.getElementById("active-workflow-container");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "אירעה שגיאה ביצירת האוטומציה", "error");
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  // Handle Execution Simulation / Run
  const handleExecuteWorkflow = async (simulateFailure: boolean, errorType: string) => {
    if (!activeWorkflow) return;
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/workflows/${activeWorkflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate_failure: simulateFailure, error_type: errorType }),
      });

      const data = await res.json();

      // Update local workflow state with latest execution
      setWorkflows((prev) =>
        prev.map((w) => {
          if (w.id === activeWorkflow.id && data.execution) {
            return {
              ...w,
              status: data.status === "failed" ? "error" : "active",
              executions: [data.execution, ...(w.executions || [])],
            };
          }
          return w;
        })
      );

      refreshStats();
      return data;
    } catch (err: any) {
      showToast("שגיאה בהרצת הבדיקה: " + err.message, "error");
      return { success: false };
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Self-Healing
  const handleSelfHeal = async (executionId: string, errorTrace: string, failedNode?: string) => {
    if (!activeWorkflow) return;
    setIsHealing(true);
    try {
      const res = await fetch(`/api/workflows/${activeWorkflow.id}/self-heal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execution_id: executionId,
          error_trace: errorTrace,
          failed_node: failedNode,
        }),
      });

      const data = await res.json();
      if (data.workflow) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === data.workflow.id ? data.workflow : w))
        );
        showToast(`האוטומציה תוקנה אוטומטית בהצלחה (גרסה v${data.new_version})!`);
        refreshStats();
      }
      return data;
    } catch (err: any) {
      showToast("ניסיון התיקון העצמי נכשל: " + err.message, "error");
    } finally {
      setIsHealing(false);
    }
  };

  // Handle Activation Toggle
  const handleToggleActive = async (wfId: string, active: boolean) => {
    try {
      const res = await fetch(`/api/workflows/${wfId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activate: active }),
      });
      const data = await res.json();
      if (data.workflow) {
        setWorkflows((prev) => prev.map((w) => (w.id === wfId ? data.workflow : w)));
        showToast(active ? "האוטומציה הופעלה בענן" : "האוטומציה הושבתה");
        refreshStats();
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const scrollToGenerator = () => {
    const el = document.getElementById("generator-box");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden w-full max-w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-auto z-50 animate-in slide-in-from-bottom-5 fade-in duration-200 max-w-md">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold ${
              toastMessage.type === "success"
                ? "bg-slate-900 border-emerald-500/40 text-emerald-300"
                : "bg-slate-900 border-rose-500/40 text-rose-300"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Global Header with 4 Customer Views */}
      <Header
        stats={stats}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 pb-20 sm:pb-10 space-y-8 sm:space-y-10">
        {/* VIEW 1: STUDIO (Simple, Smart & Creative AI Workflow Experience) */}
        {activeView === "studio" && (
          <div className="space-y-8">
            {/* Friendly, Crisp Landing Intro */}
            <LandingHero />

            {/* Simple Natural Language Input Studio with Creative AI Superpowers */}
            <SimplePromptStudio
              onGenerate={handleGenerateWorkflow}
              isGenerating={isGenerating}
              generationStep={generationStep}
              externalPrompt={externalPrompt}
            />

            {/* Active Workflow Pipeline with AI Brain step */}
            <div id="active-workflow-container">
              {activeWorkflow ? (
                <SimpleWorkflowView
                  workflow={activeWorkflow}
                  onExecute={handleExecuteWorkflow}
                  onSelfHeal={handleSelfHeal}
                  isExecuting={isExecuting}
                  isHealing={isHealing}
                  onNavigateToOAuth={() => setActiveView("oauth")}
                  onNavigateToPricing={() => setActiveView("pricing")}
                />
              ) : (
                <div className="text-center py-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
                  <Sparkles className="h-7 w-7 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">עדיין אין אוטומציה פעילה</p>
                  <p className="text-xs text-slate-400 mt-1">
                    בחר באחת הדוגמאות למעלה או הקלד מה תרצה שיקרה — המערכת תבנה זאת מיד.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: FLEET (Customer Workflows Management) */}
        {activeView === "fleet" && (
          <WorkflowsFleet
            workflows={workflows}
            activeWorkflowId={activeWorkflowId}
            onSelectWorkflow={(wf) => {
              setActiveWorkflowId(wf.id);
              setActiveView("studio");
              setTimeout(() => {
                const el = document.getElementById("active-workflow-container");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 150);
            }}
            onToggleActive={handleToggleActive}
          />
        )}

        {/* VIEW 3: OAUTH CONNECT CENTER (1-Click OAuth without API keys) */}
        {activeView === "oauth" && <OAuthConnectCenter />}

        {/* VIEW 4: PRICING PLANS */}
        {activeView === "pricing" && (
          <PricingPlans
            onSelectPlan={(plan) => {
              showToast(`נבחר מסלול ${plan}! 14 ימי ניסיון חינם הופעלו.`);
            }}
            onNavigateToStudio={() => setActiveView("studio")}
            onNavigateToRoadmap={() => setActiveView("roadmap")}
          />
        )}

        {/* VIEW 5: PRODUCTION LAUNCH ROADMAP */}
        {activeView === "roadmap" && <ProductionLaunchRoadmap />}
      </main>

      {/* Clean Customer-Facing Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mb-14 md:mb-0 text-center text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">
          Nexus-Flow · פלטפורמת האוטומציות החכמה לעסקים
        </p>
        <p className="text-slate-500">
          חיבורי OAuth 2.0 מאובטחים בלחיצה אחת · אפס מפתחות API · מנוע תיקון תקלות אוטונומי 24/7
        </p>
      </footer>
    </div>
  );
}
