import React, { useState } from "react";
import {
  Check,
  Sparkles,
  Zap,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Activity,
  Sliders,
} from "lucide-react";

interface PricingPlansProps {
  onSelectPlan?: (planName: string) => void;
  onNavigateToStudio?: () => void;
  onNavigateToRoadmap?: () => void;
}

export const PricingPlans: React.FC<PricingPlansProps> = ({
  onSelectPlan,
  onNavigateToStudio,
}) => {
  const [selectedInterfaces, setSelectedInterfaces] = useState<number>(2);
  const [subscribedModal, setSubscribedModal] = useState<string | null>(null);

  // Dynamic calculation strictly between ₪29 and ₪99 based on interfaces & scope
  // 1-2 interfaces: ₪29
  // 3-4 interfaces: ₪59
  // 5+ interfaces (unlimited): ₪99
  const getDynamicPlan = (interfacesCount: number) => {
    if (interfacesCount <= 2) {
      return {
        price: 29,
        name: "Starter Cyber",
        label: "בסיסי (1-2 ממשקים)",
        actionsLimit: "2,500",
        features: [
          "1-2 ממשקים מחוברים (וואטסאפ / Sheets / מייל)",
          "עד 2,500 פעולות וניסוחי AI בחודש",
          "סוכן אוטונומי 24/7 בענן",
          "בנייה עצמית ב-AI בקליק ללא צורך במתכנת",
          "אבטחת תקשורת מוצפנת ברמת לקוח",
        ],
      };
    } else if (interfacesCount <= 4) {
      return {
        price: 59,
        name: "Business Cyber",
        label: "מורחב (3-4 ממשקים)",
        actionsLimit: "7,500",
        features: [
          "עד 4 ממשקים פעילים בו-זמנית",
          "עד 7,500 פעולות וניסוחי AI בחודש",
          "שילוב מוח AI לסיווג כוונות ותעדוף פניות",
          "חיבור ישיר ל-CRM, טפסים ומערכות דיוור",
          "תיקון תקלות עצמי אוטומטי",
        ],
      };
    } else {
      return {
        price: 99,
        name: "Full Cyber Matrix",
        label: "מלא (ממשקים ללא הגבלה)",
        actionsLimit: "20,000",
        features: [
          "ממשקים ואינטגרציות ללא הגבלה",
          "עד 20,000 פעולות AI בחודש",
          "הפקת חשבוניות מס ירוקות + סליקה מלאה",
          "ניתוב חכם רב-ערוצי לכל הצוות",
          "תעדוף משאבי ענן מרבי וביצועים מהירים",
        ],
      };
    }
  };

  const currentPlan = getDynamicPlan(selectedInterfaces);

  const handleSubscribe = (title: string) => {
    setSubscribedModal(title);
    if (onSelectPlan) onSelectPlan(title);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Cyber Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wide">
          <Terminal className="h-3.5 w-3.5" />
          <span>[SYSTEM_COST: CLIENT_LEVEL_AUTONOMY // ₪29 - ₪99]</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          תמחור שקוף וסמלי:{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            בין ₪29 ל-₪99 לחודש
          </span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          הכל מופעל ומנוהל עצמאית ברמת לקוח דרך ה-AI בלחיצה אחת. ללא צורך במתכנתים, ללא שעות מומחה
          יקרות, ובלי שום סיבוכים טכניים.
        </p>
      </div>

      {/* Interactive Cyber Scope Selector */}
      <div className="cyber-card rounded-2xl p-5 sm:p-6 border border-cyan-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>בחר את היקף העבודה ומספר הממשקים שתרצה לחבר:</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                המחיר מתכוונן אוטומטית בהתאם לצורך העסק שלך (החל מ-₪29 ועד ₪99 בלבד)
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 self-start sm:self-center bg-slate-950 px-4 py-2 rounded-xl border border-emerald-500/40">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              ₪{currentPlan.price}
            </span>
            <span className="text-xs text-slate-400 font-semibold">/ חודש</span>
          </div>
        </div>

        {/* Step Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">
              כמות ממשקים נדרשת (וואטסאפ, שיטס, סליקה, CRM ועוד):
            </span>
            <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/25">
              {selectedInterfaces >= 5 ? "5+ ממשקים (ללא הגבלה)" : `${selectedInterfaces} ממשקים`}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={selectedInterfaces}
            onChange={(e) => setSelectedInterfaces(Number(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          <div className="grid grid-cols-3 text-center text-[11px] text-slate-400 pt-1">
            <div
              className={`cursor-pointer transition-colors ${
                selectedInterfaces <= 2 ? "text-emerald-400 font-bold" : ""
              }`}
              onClick={() => setSelectedInterfaces(2)}
            >
              ₪29 (1-2 ממשקים)
            </div>
            <div
              className={`cursor-pointer transition-colors ${
                selectedInterfaces > 2 && selectedInterfaces <= 4 ? "text-cyan-400 font-bold" : ""
              }`}
              onClick={() => setSelectedInterfaces(3)}
            >
              ₪59 (3-4 ממשקים)
            </div>
            <div
              className={`cursor-pointer transition-colors ${
                selectedInterfaces >= 5 ? "text-teal-300 font-bold" : ""
              }`}
              onClick={() => setSelectedInterfaces(5)}
            >
              ₪99 (מלא / ללא הגבלה)
            </div>
          </div>
        </div>
      </div>

      {/* 3 Clear Cyber Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {[
          {
            price: 29,
            name: "Starter Cyber",
            desc: "לעסקים קטנים ולידים בודדים",
            interfaces: "1-2 ממשקים",
            actions: "עד 2,500 פעולות AI",
            isCurrent: currentPlan.price === 29,
            accentBorder: "border-slate-800 hover:border-emerald-500/50",
            activeGlow: "border-emerald-500 bg-slate-900/90 shadow-emerald-500/10",
            badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
            btnColor: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
          },
          {
            price: 59,
            name: "Business Pro",
            desc: "הפופולרי לעסקים פעילים",
            interfaces: "עד 4 ממשקים",
            actions: "עד 7,500 פעולות AI",
            isCurrent: currentPlan.price === 59,
            accentBorder: "border-slate-800 hover:border-cyan-500/50",
            activeGlow: "border-cyan-400 bg-slate-900/90 shadow-cyan-500/10",
            badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
            btnColor: "bg-cyan-500 hover:bg-cyan-400 text-slate-950",
          },
          {
            price: 99,
            name: "Full Matrix",
            desc: "עומס מלא, סליקה וארגון",
            interfaces: "ממשקים ללא הגבלה",
            actions: "עד 20,000 פעולות AI",
            isCurrent: currentPlan.price === 99,
            accentBorder: "border-slate-800 hover:border-teal-500/50",
            activeGlow: "border-teal-400 bg-slate-900/90 shadow-teal-500/10",
            badgeColor: "bg-teal-500/10 text-teal-300 border-teal-500/30",
            btnColor: "bg-teal-500 hover:bg-teal-400 text-slate-950",
          },
        ].map((plan) => (
          <div
            key={plan.price}
            className={`cyber-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 border-2 ${
              plan.isCurrent ? plan.activeGlow : plan.accentBorder
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${plan.badgeColor}`}
                  >
                    {plan.interfaces}
                  </span>
                  <h4 className="text-base font-bold text-slate-100 mt-1">{plan.name}</h4>
                  <p className="text-[11px] text-slate-400">{plan.desc}</p>
                </div>

                <div className="text-left font-mono">
                  <span className="text-2xl sm:text-3xl font-black text-slate-100">
                    ₪{plan.price}
                  </span>
                  <span className="text-[10px] text-slate-500 block">/ חודש</span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>{plan.actions}</strong> בחודש
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>מוח AI מנסח הודעות אישיות</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>חיבור בלחיצת כפתור אחת</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>100% עצמאי ברמת לקוח (ללא מתכנת)</span>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800/80 mt-4">
              <button
                type="button"
                onClick={() => handleSubscribe(`${plan.name} (₪${plan.price}/חודש)`)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${plan.btnColor}`}
              >
                <span>הפעל מנוי (₪{plan.price}/חודש)</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cyber Proof Guarantee Banner */}
      <div className="cyber-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-right">
            <h5 className="font-bold text-slate-100">14 ימי התנסות חינם מלאים</h5>
            <p className="text-slate-400 text-[11px]">
              ללא התחייבות. ביטול בכל רגע בלחיצה אחת מלוח הבקרה.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span>99.9% Uptime</span>
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3 text-emerald-400" />
            <span>Zero-Code Auto Pilot</span>
          </span>
        </div>
      </div>

      {/* Success Modal */}
      {subscribedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="cyber-card rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center border border-cyan-500/40">
            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">המנוי הופעל בהצלחה!</h3>
              <p className="text-xs text-cyan-300 font-mono font-semibold">{subscribedModal}</p>
              <p className="text-xs text-slate-300 mt-1">
                הגישה פתוחה מידית. כעת תוכל לבנות ולהריץ אוטומציות AI ישירות בסטודיו ללא הגבלה.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubscribedModal(null);
                if (onNavigateToStudio) onNavigateToStudio();
              }}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              המשך לבניית האוטומציה בסטודיו AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
