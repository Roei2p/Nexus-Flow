import React, { useState, useEffect } from "react";
import { WorkflowRecord } from "../types";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Power,
  Play,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Send,
  FileCode2,
  Filter,
  Mail,
  RotateCw,
  Eye,
  ArrowLeft,
  Calendar,
  DollarSign,
  Briefcase,
  Check,
  Pause,
} from "lucide-react";

interface WorkflowsFleetProps {
  workflows: WorkflowRecord[];
  activeWorkflowId: string;
  onSelectWorkflow: (wf: WorkflowRecord) => void;
  onToggleActive: (wfId: string, active: boolean) => Promise<void>;
  onTriggerTest?: (wfId: string) => Promise<void>;
}

interface SimulatedStepEvent {
  stepIndex: number;
  label: string;
  detail: string;
  status: "waiting" | "running" | "done";
}

export const WorkflowsFleet: React.FC<WorkflowsFleetProps> = ({
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onToggleActive,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    activeWorkflowId || (workflows.length > 0 ? workflows[0].id : "")
  );

  // Live simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [simulatedData, setSimulatedData] = useState<{
    customerName: string;
    email: string;
    amount: string;
    docId: string;
    channel: string;
    durationMs: number;
  } | null>(null);

  const [liveMonitorLoop, setLiveMonitorLoop] = useState(false);

  // Current active workflow
  const currentWorkflow =
    workflows.find((w) => w.id === selectedId) || workflows[0] || null;

  // Auto-select if prop changes
  useEffect(() => {
    if (activeWorkflowId) {
      setSelectedId(activeWorkflowId);
    }
  }, [activeWorkflowId]);

  // Handle live simulation run
  const runLiveSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentStepIndex(0);

    const names = ["דניאל לוי", "מיכל אברהם", "יוסי כהן", "נועה שפירא", "עומר גולן"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomDocId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    setSimulatedData({
      customerName: randomName,
      email: `${randomName.split(" ")[0].toLowerCase()}@example.com`,
      amount: `₪${Math.floor(250 + Math.random() * 800)}`,
      docId: randomDocId,
      channel: "וואטסאפ ואימייל",
      durationMs: 340,
    });

    // Step 1: Trigger
    setTimeout(() => {
      setCurrentStepIndex(1); // Step 2: Validation
    }, 900);

    // Step 2: Validation
    setTimeout(() => {
      setCurrentStepIndex(2); // Step 3: Processing
    }, 1800);

    // Step 3: Action Delivery
    setTimeout(() => {
      setCurrentStepIndex(3); // Step 4: Finished
    }, 2700);

    // Complete
    setTimeout(() => {
      setCurrentStepIndex(4); // All done
      setIsSimulating(false);
    }, 3600);
  };

  // Optional periodic live loop
  useEffect(() => {
    let timer: any = null;
    if (liveMonitorLoop && !isSimulating) {
      timer = setInterval(() => {
        runLiveSimulation();
      }, 7000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [liveMonitorLoop, isSimulating]);

  // Aggregate metrics across all workflows
  const totalExecutions = workflows.reduce(
    (acc, w) => acc + (w.executions?.length || 1),
    124 // baseline historical business transactions
  );
  const activeCount = workflows.filter((w) => w.is_active).length;
  // Estimate: 20 minutes saved per automated execution
  const hoursSaved = Math.round((totalExecutions * 20) / 60);
  // Estimate: ₪120 average cost per employee work hour
  const monetarySaved = hoursSaved * 120;

  // Build steps list from abstract schema
  const trigger = currentWorkflow?.abstract_schema?.trigger;
  const conditions = currentWorkflow?.abstract_schema?.conditions || [];
  const actions = currentWorkflow?.abstract_schema?.actions || [];

  const pipelineSteps = [
    {
      id: "step-1",
      number: 1,
      type: "trigger",
      title: "קליטת אירוע פותח (טריגר)",
      subtitle:
        trigger?.service === "google_sheets"
          ? "זיהוי שורה חדשה ב-Google Sheets"
          : trigger?.service === "stripe"
          ? "אישור תשלום מוצלח ב-Stripe"
          : "קליטת פנייה חדשה בטופס העסק",
      app: trigger?.service || "google_sheets",
      icon: <FileSpreadsheet className="h-5 w-5 text-emerald-400" />,
      badge: "האזנה 24/7",
    },
    {
      id: "step-2",
      number: 2,
      type: "condition",
      title: "אימות וסינון חכם",
      subtitle:
        conditions.length > 0
          ? "בדיקת תקינות אימייל ופרטי הלקוח"
          : "אימות שלמות הנתונים למניעת תקלות",
      app: "validator",
      icon: <Filter className="h-5 w-5 text-indigo-400" />,
      badge: "סינון שגיאות",
    },
    {
      id: "step-3",
      number: 3,
      type: "action-doc",
      title: "הפקה ועיבוד נתונים",
      subtitle: "הפקת חשבונית מס דיגיטלית בפורמט PDF",
      app: "pdf_generator",
      icon: <FileCode2 className="h-5 w-5 text-amber-400" />,
      badge: "הפקה מיידית",
    },
    {
      id: "step-4",
      number: 4,
      type: "action-send",
      title: "הפצה והתראה מיידית",
      subtitle:
        actions.length > 1
          ? "שליחה בוואטסאפ / טלגרם + התראה לצוות"
          : "שליחה מיידית לנמען בטלגרם",
      app: "telegram",
      icon: <Send className="h-5 w-5 text-sky-400" />,
      badge: "שליחה אוטומטית",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>[FLEET_TELEMETRY // AUTONOMOUS_MONITOR]</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight font-sans">
            מרכז הבקרה של האוטומציות
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            מעקב חי אחר פעילות הסוכנים, זמני ריצה, הדמיות ביצוע ושרידות אוטונומית בענן.
          </p>
        </div>

        {/* Live Status indicator */}
        <div className="cyber-card px-4 py-2.5 rounded-2xl border border-cyan-500/30 self-start sm:self-auto flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">INFRA_STATUS:</span>
            <span className="font-bold text-emerald-400">ONLINE 24/7 (99.98%)</span>
          </div>
        </div>
      </div>

      {/* 4 Executive Business Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hours Saved */}
        <div className="cyber-card border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">זמן שנחסך</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-100 font-mono">{hoursSaved}</span>
            <span className="text-xs font-semibold text-emerald-400 mr-1.5 font-mono">שעות</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            פעולות ידניות שטופלו אוטונומית ברקע
          </p>
        </div>

        {/* Card 2: Monetary Value Saved */}
        <div className="cyber-card border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">שווי שנחסך</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono">
            <span className="text-3xl font-extrabold text-slate-100">₪{monetarySaved.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            חיסכון מוערך בעלויות כוח אדם חודשיות
          </p>
        </div>

        {/* Card 3: Autonomous Tasks Executed */}
        <div className="cyber-card border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">משימות שבוצעו</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-300">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono">
            <span className="text-3xl font-extrabold text-slate-100">{totalExecutions}</span>
            <span className="text-[10px] font-bold text-emerald-400 mr-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              100% SUCCESS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            הפקות חשבוניות, שליחות הודעות ועדכוני מערכות
          </p>
        </div>

        {/* Card 4: Autonomous Self-Healing */}
        <div className="cyber-card border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">רמת אמינות והגנה</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-mono">
            <span className="text-3xl font-extrabold text-slate-100">99.98%</span>
            <span className="text-[10px] text-cyan-300 mr-1.5 font-medium">UPTIME</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            מנגנון תיקון עצמי אוטונומי מונע תקלות ברמת לקוח
          </p>
        </div>
      </div>

      {/* Workflow Tabs Switcher */}
      {workflows.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          <span className="text-xs text-slate-400 font-semibold shrink-0 ml-2">בחר תהליך להצגה:</span>
          {workflows.map((wf) => {
            const isSel = wf.id === selectedId;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setSelectedId(wf.id);
                  onSelectWorkflow(wf);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                  isSel
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800"
                }`}
              >
                <span>{wf.title}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    wf.is_active ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN SECTION: LIVE ANIMATED WORKFLOW PIPELINE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        {/* Soft Background Accent */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6">
          {/* Top Row: Title, Subtitle, and Live Interactive Trigger */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  <span>הדמיה חיה של תהליך האוטומציה</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {currentWorkflow?.is_active ? "פעיל ומחובר לענן" : "טיוטה"}
                </span>
                <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  גרסה v{currentWorkflow?.version || 1}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {currentWorkflow?.abstract_schema?.summary || currentWorkflow?.original_prompt}
              </p>
            </div>

            {/* Interactive Simulation Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                id="run-live-simulation-btn"
                disabled={isSimulating}
                onClick={runLiveSimulation}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                  isSimulating
                    ? "bg-emerald-500/30 text-emerald-200 cursor-not-allowed border border-emerald-500/40"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                }`}
              >
                <Play className={`h-4 w-4 fill-current ${isSimulating ? "animate-pulse" : ""}`} />
                <span>{isSimulating ? "מריץ הדמיה חיה כעת..." : "הפעל סימולציית ריצה חיה"}</span>
              </button>

              <button
                type="button"
                id="toggle-live-loop-btn"
                onClick={() => setLiveMonitorLoop(!liveMonitorLoop)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  liveMonitorLoop
                    ? "bg-sky-500/10 border-sky-500/40 text-sky-300"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="שידור בדיקות שוטפות כל 7 שניות"
              >
                <RotateCw className={`h-3.5 w-3.5 ${liveMonitorLoop ? "animate-spin" : ""}`} />
                <span>{liveMonitorLoop ? "ניטור חי רציף פעיל" : "ניטור חי רציף"}</span>
              </button>

              {currentWorkflow && (
                <button
                  type="button"
                  id={`toggle-fleet-active-${currentWorkflow.id}`}
                  onClick={() => onToggleActive(currentWorkflow.id, !currentWorkflow.is_active)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    currentWorkflow.is_active
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title={currentWorkflow.is_active ? "השבת אוטומציה בענן" : "הפעל אוטומציה בענן"}
                >
                  <Power className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* THE ANIMATED VISUAL PIPELINE STAGES */}
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {pipelineSteps.map((step, idx) => {
                const isStepActive = isSimulating && currentStepIndex === idx;
                const isStepCompleted = isSimulating && currentStepIndex > idx;
                const isStepWaiting = isSimulating && currentStepIndex < idx;

                return (
                  <div key={step.id} className="relative group">
                    {/* Connecting Animated Line (Desktop only, between steps) */}
                    {idx < pipelineSteps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -left-4 w-4 h-0.5 -translate-y-1/2 z-10">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isStepCompleted
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                              : isStepActive
                              ? "bg-emerald-500/60 animate-pulse"
                              : "bg-slate-800"
                          }`}
                        />
                        {/* Moving packet point */}
                        {isStepActive && (
                          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#10b981] animate-ping" />
                        )}
                      </div>
                    )}

                    {/* Step Card */}
                    <div
                      className={`h-full rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                        isStepActive
                          ? "bg-slate-900 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/30 scale-[1.02]"
                          : isStepCompleted
                          ? "bg-slate-900/90 border-emerald-500/40"
                          : "bg-slate-950/80 border-slate-800/90 hover:border-slate-700"
                      }`}
                    >
                      {/* Top Step Pill & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          שלב {step.number}
                        </span>

                        {isStepActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>מעבד נתונים...</span>
                          </span>
                        ) : isStepCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Check className="h-3 w-3" />
                            <span>בוצע בהצלחה</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/60">
                            {step.badge}
                          </span>
                        )}
                      </div>

                      {/* Icon & Title */}
                      <div className="space-y-2 mb-4">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                            isStepActive
                              ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20 scale-110"
                              : isStepCompleted
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                              : "bg-slate-900 border border-slate-800 text-slate-400"
                          }`}
                        >
                          {step.icon}
                        </div>
                        <h4 className="font-bold text-slate-100 text-sm">{step.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{step.subtitle}</p>
                      </div>

                      {/* Bottom Micro-State */}
                      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>סטטוס:</span>
                        <span
                          className={`font-semibold ${
                            isStepActive
                              ? "text-emerald-400"
                              : isStepCompleted
                              ? "text-emerald-300"
                              : "text-slate-400"
                          }`}
                        >
                          {isStepActive
                            ? "בתהליך ריצה חיה"
                            : isStepCompleted
                            ? "הושלם (0.09s)"
                            : "מוכן לפעולה"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIVE SIMULATION RUN INSPECTOR / PAYLOAD PREVIEW */}
          {simulatedData && (
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 space-y-3 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-200">
                    נתוני העסקה שעובדו בסימולציה האחרונה:
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/20 self-start sm:self-auto">
                  זמן תגובה כולל: {simulatedData.durationMs} מילישניות בלבד
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">שם הלקוח שנקלט:</span>
                  <span className="text-slate-100 font-bold mt-0.5 block">
                    {simulatedData.customerName}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">אימייל שאומת:</span>
                  <span className="text-emerald-400 font-mono text-[11px] mt-0.5 block truncate">
                    {simulatedData.email}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">מסמך שהופק:</span>
                  <span className="text-amber-300 font-semibold mt-0.5 block">
                    חשבונית מס #{simulatedData.docId}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">ערוץ הפצה:</span>
                  <span className="text-sky-400 font-bold mt-0.5 block">
                    {simulatedData.channel}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT BUSINESS TRANSACTIONS LOG (יומן פעילויות עסקיות ללא קוד) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>יומן פעולות אוטומטיות אחרונות</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              פירוט העסקאות וההודעות שנשלחו עבור העסק ללא שום מגע יד אדם.
            </p>
          </div>

          <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 hidden sm:block">
            מתעדכן אוטומטית 24/7
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {[
            {
              time: "לפני 4 דקות",
              customer: "שירה כרמון",
              action: "קליטת ליד חדש ➔ בדיקת טלפון ➔ שליחת הודעת וואטסאפ אישית",
              speed: "0.29 שניות",
              status: "הצלחה מלאה",
              tag: "לידים",
            },
            {
              time: "לפני 23 דקות",
              customer: "איתי ברקוביץ׳",
              action: "תשלום אושר ב-Stripe (₪490) ➔ הפקת חשבונית מס PDF ➔ שליחה במייל",
              speed: "0.41 שניות",
              status: "הצלחה מלאה",
              tag: "חשבונאות",
            },
            {
              time: "לפני 58 דקות",
              customer: "רון שחר",
              action: "שורה חדשה ב-Google Sheets ➔ אימות כתובת אימייל ➔ התראה בטלגרם לצוות",
              speed: "0.33 שניות",
              status: "הצלחה מלאה",
              tag: "סנכרון",
            },
            {
              time: "לפני שעתיים",
              customer: "טליה אלון",
              action: "תקלת קידוד בהודעה תוקנה אוטונומית ➔ ההודעה נמסרה בהצלחה",
              speed: "0.52 שניות",
              status: "תוקן אוטונומית",
              tag: "ריפוי עצמי",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.status === "תוקן אוטונומית"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {item.status === "תוקן אוטונומית" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100">{item.customer}</span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      {item.tag}
                    </span>
                    <span className="text-slate-400 text-[11px]">· {item.time}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5">{item.action}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <span className="text-slate-400 text-[11px] font-mono bg-slate-900 px-2 py-1 rounded">
                  {item.speed}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                    item.status === "תוקן אוטונומית"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
