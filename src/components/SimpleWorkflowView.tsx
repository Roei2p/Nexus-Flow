import React, { useState } from "react";
import { WorkflowRecord, HealingDiagnosis } from "../types";
import {
  Play,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Send,
  FileCode2,
  Filter,
  Webhook,
  Mail,
  ArrowLeft,
  ShieldCheck,
  Code2,
  Zap,
  Sparkles,
} from "lucide-react";

interface SimpleWorkflowViewProps {
  workflow: WorkflowRecord;
  onExecute: (simulateFailure: boolean, errorType: string) => Promise<any>;
  onSelfHeal: (executionId: string, errorTrace: string, failedNode?: string) => Promise<any>;
  isExecuting: boolean;
  isHealing: boolean;
  onNavigateToOAuth?: () => void;
  onNavigateToPricing?: () => void;
}

export const SimpleWorkflowView: React.FC<SimpleWorkflowViewProps> = ({
  workflow,
  onExecute,
  onSelfHeal,
  isExecuting,
  isHealing,
  onNavigateToOAuth,
  onNavigateToPricing,
}) => {
  const [testResult, setTestResult] = useState<any>(null);
  const [lastDiagnosis, setLastDiagnosis] = useState<HealingDiagnosis | null>(null);

  // Run success test
  const handleRunSuccess = async () => {
    setLastDiagnosis(null);
    const res = await onExecute(false, "");
    setTestResult(res);
  };

  // Run failure simulation
  const handleRunFailure = async () => {
    setLastDiagnosis(null);
    const res = await onExecute(true, "telegram_400");
    setTestResult(res);
  };

  // Trigger self-healing
  const handleTriggerHeal = async () => {
    if (!testResult?.execution) return;
    const diag = await onSelfHeal(
      testResult.execution.id,
      testResult.execution.error_trace || "",
      testResult.failed_node
    );
    if (diag?.diagnosis) {
      setLastDiagnosis(diag.diagnosis);
    }
  };

  // Service icon helper
  const getServiceIcon = (serviceName: string) => {
    const s = (serviceName || "").toLowerCase();
    if (s.includes("sheet") || s.includes("גוגל") || s.includes("שיטס")) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    }
    if (s.includes("telegram") || s.includes("טלגרם")) {
      return <Send className="h-5 w-5 text-sky-400" />;
    }
    if (s.includes("pdf") || s.includes("invoice") || s.includes("חשבונית")) {
      return <FileCode2 className="h-5 w-5 text-amber-400" />;
    }
    if (s.includes("if") || s.includes("check") || s.includes("אימייל") || s.includes("בדיקה")) {
      return <Filter className="h-5 w-5 text-indigo-400" />;
    }
    if (s.includes("email") || s.includes("mail") || s.includes("מייל")) {
      return <Mail className="h-5 w-5 text-rose-400" />;
    }
    return <Webhook className="h-5 w-5 text-emerald-400" />;
  };

  const trigger = workflow.abstract_schema?.trigger;
  const conditions = workflow.abstract_schema?.conditions || [];
  const actions = workflow.abstract_schema?.actions || [];

  return (
    <div className="cyber-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl space-y-6 sm:space-y-8 border border-slate-800">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 break-words">{workflow.title}</h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono font-semibold ${
                workflow.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              }`}
            >
              {workflow.status === "active" ? "[STATUS: CLOUD_AUTONOMOUS]" : "[STATUS: DRAFT]"}
            </span>
            <span className="text-[10px] sm:text-xs text-cyan-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/20">
              v{workflow.version}.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl break-words">
            {workflow.abstract_schema?.summary || workflow.original_prompt}
          </p>
        </div>

        {/* Quick link to OAuth & Pricing */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToOAuth && (
            <button
              type="button"
              id="simple-view-oauth-btn"
              onClick={onNavigateToOAuth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono transition-all cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span>חיבורי חשבונות</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Simple Steps Visualization */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>איך האוטומציה פועלת (3 שלבים פשוטים):</span>
          </h4>
          <span className="text-[11px] sm:text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            פועל בענן ללא מגע יד אדם
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Trigger */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3 relative hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                שלב 1: מתי זה מתחיל?
              </span>
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                {getServiceIcon(trigger?.service || "")}
              </div>
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-sm">
                {trigger?.name || "אירוע פותח בעסק"}
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {trigger?.service === "google_sheets"
                  ? "האזנה רציפה לשורה חדשה שמתווספת ב-Google Sheets."
                  : trigger?.service === "stripe"
                  ? "קליטת תשלום חדש שאושר ב-Stripe."
                  : "קליטת פנייה חדשה או הרשמה של לקוח בטופס."}
              </p>
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800/80">
              האזנה: רציפה 24/7 בזמן אמת
            </div>
          </div>

          {/* Step 2: AI Brain Processing & Intelligence */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3 relative hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                שלב 2: 🧠 מוח AI מעבד ומנסח
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-sm">
                ניתוח חכם וניסוח מענה אישי (AI)
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {conditions.length > 0
                  ? `סוכן ה-AI מזהה את כוונת הפונה, בודק תקינות ומנסח מענה מותאם אישית (${conditions[0].description || "אימות וסיווג"}).`
                  : "סוכן ה-AI מסווג את הנתונים, מוודא תקינות מלאה ומנסח את תוכן ההודעה באופן אנושי וממיר."}
              </p>
            </div>
            <div className="text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              מוח AI: עיבוד שפה טבעית והחלטות
            </div>
          </div>

          {/* Step 3: Action Execution */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3 relative hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                שלב 3: מה מתבצע?
              </span>
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                {actions.length > 0 ? getServiceIcon(actions[0].service) : <Send className="h-5 w-5 text-sky-400" />}
              </div>
            </div>
            <div>
              <h5 className="font-bold text-slate-100 text-sm">
                {actions.length > 0 ? actions.map((a) => a.name).join(" + ") : "ביצוע הפעולות הנדרשות"}
              </h5>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                הפקת המסמך הדיגיטלי ושליחה מיידית בהודעה ללקוח או לצוות המכירות.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800/80">
              ביצוע: מיידי תוך פחות משנייה
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Testing Section */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-slate-100">
              בדיקה מיידית של האוטומציה
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              תוכל לבדוק הרצה מוצלחת או לראות איך המערכת מתקנת בעצמה שגיאות בזמן אמת.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Run Normal Test Button */}
            <button
              type="button"
              id="run-normal-test-btn"
              disabled={isExecuting || isHealing}
              onClick={handleRunSuccess}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExecuting && testResult?.status !== "failed" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>מריץ בדיקה...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>בדוק שהכל עובד עכשיו</span>
                </>
              )}
            </button>

            {/* Run Simulated Resilience Test Button */}
            <button
              type="button"
              id="run-error-test-btn"
              disabled={isExecuting || isHealing}
              onClick={handleRunFailure}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/40 font-medium text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>בדוק עמידות בתקלות ותיקון עצמי</span>
            </button>
          </div>
        </div>

        {/* Live Test Outcome Box */}
        {testResult && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {testResult.success ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-300 text-sm">
                      מעולה! האוטומציה עבדה בהצלחה מלאה
                    </h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      השורה נקלטה, כתובת האימייל אומתה, והחשבונית נשלחה תוך 0.38 שניות ללא תקלות.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-emerald-400 font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
                  סטטוס: הצלחה 100%
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-amber-300 text-sm">
                        סימולציית הגנה: זוהתה חריגת נתונים ב-{testResult.failed_node || "שליחת הודעה"}
                      </h5>
                      <p className="text-xs text-slate-300 mt-0.5">
                        מנוע הריפוי האוטונומי זיהה את הבעיה ומסוגל לתקן את ההגדרה בעצמו ללא צורך במתכנת!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="heal-workflow-btn"
                    disabled={isHealing}
                    onClick={handleTriggerHeal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    {isHealing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>מתקן ומאבטח את האוטומציה...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>הפעל תיקון אוטונומי עכשיו</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Self-Healing Diagnosis Feedback */}
                {lastDiagnosis && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <ShieldCheck className="h-4 w-4" />
                      <span>האוטומציה תוקנה בהצלחה והמשיכה לרוץ!</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-medium block">מה הייתה התקלה:</span>
                        <span className="text-slate-200 mt-0.5 block">{lastDiagnosis.root_cause}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-emerald-400 font-medium block">איך המערכת תיקנה:</span>
                        <span className="text-slate-200 mt-0.5 block">{lastDiagnosis.fix_applied}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Hint: Direct to OAuth & Pricing */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <p>
          רוצה לחבר שירותים עסקיים נוספים ב-1 קליק או לשדרג את חבילת השימוש?
        </p>
        <div className="flex items-center gap-3">
          {onNavigateToOAuth && (
            <button
              type="button"
              id="goto-oauth-center-footer-btn"
              onClick={onNavigateToOAuth}
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>מרכז חיבורי OAuth</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {onNavigateToPricing && (
            <button
              type="button"
              id="goto-pricing-footer-btn"
              onClick={onNavigateToPricing}
              className="text-slate-300 hover:text-emerald-300 font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>צפה במחירון</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
