import React, { useState } from "react";
import {
  Rocket,
  CheckCircle2,
  Circle,
  Globe,
  CreditCard,
  Lock,
  Users,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export const ProductionLaunchRoadmap: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    "step-1": true,
    "step-2": true,
  });

  const [expandedStep, setExpandedStep] = useState<string>("step-3");

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const steps = [
    {
      id: "step-1",
      number: 1,
      title: "בניית מנוע האוטומציה והממשק הלקוחי (הושלם בהצלחה)",
      summary: "המערכת מוכנה: סטודיו בעברית, חיבורי OAuth ללא מפתחות, דשבורד מנהלים ומנוע ריפוי עצמי.",
      icon: <Sparkles className="h-5 w-5 text-emerald-400" />,
      tag: "הושלם במערכת",
      details: [
        "ממשק משתמש קל ונטול מונחים טכניים הממוקד בחיסכון בזמן וכסף",
        "הדמיה מונפשת חיה של תהליכי הלקוח באזור 'האוטומציות שלי'",
        "דשבורד מנהלים שמודד שעות עבודה שנחסכו ושווי כספי",
        "מרכז חיבור חשבונות בקליק אחד ללא מפתחות API",
      ],
    },
    {
      id: "step-2",
      number: 2,
      title: "קביעת מודל התמחור ברמת לקוח (הושלם בהצלחה)",
      summary: "מסלולים סמליים ונגישים בין ₪29 ל-₪99 לחודש בהתאם להיקף הממשקים, ללא עלויות הקמה וללא צורך במתכנת.",
      icon: <CreditCard className="h-5 w-5 text-cyan-400" />,
      tag: "הושלם במערכת",
      details: [
        "מסלול Starter Cyber (₪29/חודש) ל-1-2 ממשקים ועד 2,500 פעולות",
        "מסלול Business Pro (₪59/חודש) לעד 4 ממשקים ועד 7,500 פעולות עם מוח AI מנסח",
        "מסלול Full Matrix (₪99/חודש) לממשקים ללא הגבלה וסליקה מלאה",
        "100% שירות עצמי ברמת לקוח – ללא דמי הקמה יקרים וללא שעות מומחה",
      ],
    },
    {
      id: "step-3",
      number: 3,
      title: "חיבור סליקת אשראי והפקת חשבוניות מס אוטומטית",
      summary: "חיבור ספק סליקה עבור המנויים החודשיים של הלקוחות והפקת קבלות דיגיטליות.",
      icon: <CreditCard className="h-5 w-5 text-amber-400" />,
      tag: "צעד הבא ליישום",
      details: [
        "חיבור חשבון Stripe עסקי ישראלי או מסוף ישראלי (משולם / קארדקום / טרנזילה)",
        "הפעלת דף תשלום מאובטח עם אפשרות לכרטיסי אשראי, Apple Pay ו-Google Pay",
        "סנכרון הפקת חשבונית מס ירוקה אוטומטית בכל חיוב (Morning / iCount / חשבונית ירוקה)",
        "הגדרת תקופת ניסיון של 14 ימים בחינם ללא חיוב מיידי",
      ],
    },
    {
      id: "step-4",
      number: 4,
      title: "דומיין מותאם אישית ותשתית ענן רשמית (Custom Domain)",
      summary: "הפעלת האפליקציה תחת כתובת האינטרנט של המותג שלכם עם תעודת SSL מאובטחת.",
      icon: <Globe className="h-5 w-5 text-emerald-400" />,
      tag: "תשתית ומיתוג",
      details: [
        "רכישת דומיין ישראלי או בינלאומי (לדוגמה: app.yourbusiness.co.il)",
        "חיבור הדומיין לשרת ה-Cloud Run או ה-DNS דרך רשומת CNAME פשוטה",
        "הפעלת תעודת הצפנה SSL/TLS אוטומטית (HTTPS) לבטיחות מירבית",
        "הגדרת כתובת אימייל רשמית לשירות לקוחות (support@yourbusiness.co.il)",
      ],
    },
    {
      id: "step-5",
      number: 5,
      title: "אימות אפליקציות רשמי (Google OAuth & WhatsApp Business API)",
      summary: "אישור מסך החיבור של Google וחיבור מספר וואטסאפ עסקי רשמי לשליחת הודעות.",
      icon: <MessageSquare className="h-5 w-5 text-indigo-400" />,
      tag: "חיבורים רשמיים",
      details: [
        "העלאת לוגו החברה, קישור למדיניות פרטיות ותנאי שימוש ב-Google Cloud Console",
        "קבלת אישור Google OAuth Verification כך שהלקוחות יראו חיבור רשמי ומאושר ללא אזהרות",
        "פתיחת חשבון Meta for Developers וחיבור WhatsApp Cloud API רשמי או ספקית וואטסאפ מקומית",
      ],
    },
    {
      id: "step-6",
      number: 6,
      title: "גיוס 10 הלקוחות המשלמים הראשונים (Go-to-Market)",
      summary: "אסטרטגיית חדירה מומלצת לשיווק, מכירות וסגירת עסקאות ראשונות.",
      icon: <Users className="h-5 w-5 text-purple-400" />,
      tag: "מכירות וצמיחה",
      details: [
        "הצעת 'בטא בלעדית': בניית האוטומציה הראשונה חינם עליכם + 14 ימי ניסיון ללא התחייבות",
        "פנייה ישירה לעסקים קטנים שמבזבזים זמן ידני (משרדי עו״ד, סוכנויות שיווק, חנויות איקומרס)",
        "הצגת מחשבון החיסכון: 'במקום לשלם לעובד ₪6,000 בחודש, שלם ₪499 וקבל אפס טעויות'",
        "איסוף המלצות וסרטוני עדות מלקוחות מרוצים לטובת הכפלת המכירות",
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Cyber Header */}
      <div className="cyber-card border border-cyan-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30">
              <Rocket className="h-3.5 w-3.5 text-cyan-400" />
              <span>[PRODUCTION_DEPLOY_PROTOCOL // CLIENT_LEVEL]</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans">
              איך עוברים ל-Production והשקת המערכת
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              המדריך המעשי לפריסה רשמית: חיבור סליקה, דומיין משלך, ואימותי גישה עבור הלקוחות.
            </p>
          </div>

          {/* Progress Summary Card */}
          <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 text-center shrink-0 min-w-[200px]">
            <span className="text-xs text-slate-400 block mb-1">התקדמות כללית:</span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {Math.round(
                  (Object.values(completedSteps).filter(Boolean).length / steps.length) * 100
                )}
                %
              </span>
              <span className="text-xs text-slate-400">מוכן להשקה</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (Object.values(completedSteps).filter(Boolean).length / steps.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step by Step Checklist */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isDone = !!completedSteps[step.id];
          const isExpanded = expandedStep === step.id;

          return (
            <div
              key={step.id}
              className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                isDone
                  ? "bg-slate-900/60 border-emerald-500/30"
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Header Row */}
              <div
                onClick={() => setExpandedStep(isExpanded ? "" : step.id)}
                className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-4">
                  {/* Complete checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStep(step.id);
                    }}
                    className={`h-7 w-7 rounded-xl flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-400">שלב {step.number}</span>
                      <h3
                        className={`text-sm sm:text-base font-bold ${
                          isDone ? "text-emerald-300 line-through opacity-90" : "text-slate-100"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {step.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{step.summary}</p>
                  </div>
                </div>

                <div className="text-slate-400 shrink-0">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/50">
                  <div className="space-y-2.5 text-xs text-slate-300">
                    {step.details.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
