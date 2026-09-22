import React, { useState } from "react";
import { Calculator, TrendingUp, Clock, DollarSign, ArrowDown, Sparkles } from "lucide-react";

interface RoiSavingsCalculatorProps {
  onApplySavings: (hours: number) => void;
}

export const RoiSavingsCalculator: React.FC<RoiSavingsCalculatorProps> = ({
  onApplySavings,
}) => {
  const [hoursPerWeek, setHoursPerWeek] = useState(15);
  const [teamSize, setTeamSize] = useState(2);
  const [hourlyCost, setHourlyCost] = useState(110);

  // Calculations
  const monthlyHoursSaved = Math.round(hoursPerWeek * 4.33 * teamSize);
  const monthlyMoneySaved = Math.round(monthlyHoursSaved * hourlyCost);
  const annualSavings = monthlyMoneySaved * 12;

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm transition-all">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1.5">
              <Calculator className="h-3.5 w-3.5" />
              <span>מחשבון חיסכון בזמן וכסף לעסק שלך</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100">
              כמה כסף ושעות עבודה אוטומציה יכולה לחסוך לך בחודש?
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              הזז את המחוונים כדי לראות בדיוק כמה זמן וכסף מתפנים לצמיחת העסק
            </p>
          </div>

          <div className="text-right sm:text-left self-start sm:self-auto bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">חיסכון שנתי צפוי:</span>
            <span className="text-lg font-extrabold text-emerald-400">
              ₪{annualSavings.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Weekly Hours */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                שעות עבודה ידניות בשבוע:
              </span>
              <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {hoursPerWeek} שעות
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={40}
              step={1}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              הזנת לידים, הפקת חשבוניות, שליחת הודעות ומיילים
            </p>
          </div>

          {/* Slider 2: Team Size */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                כמות עובדים המבצעים פעולות אלו:
              </span>
              <span className="text-sm font-extrabold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {teamSize} עובדים
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              נציגי מכירות, שירות לקוחות ומנהלי משרד
            </p>
          </div>

          {/* Slider 3: Hourly Cost */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                עלות שעת עבודה ממוצעת:
              </span>
              <span className="text-sm font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ₪{hourlyCost} לשעה
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={250}
              step={10}
              value={hourlyCost}
              onChange={(e) => setHourlyCost(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              כולל הפרשות סוציאליות, שכר ועלויות עקיפות
            </p>
          </div>
        </div>

        {/* Dynamic Calculation Outcome Card */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-sky-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>התוצאה לעסק שלך בחודש אחד בלבד:</span>
            </div>
            <div className="flex items-baseline gap-4 pt-1 flex-wrap">
              <div>
                <span className="text-3xl font-black text-slate-100">
                  ₪{monthlyMoneySaved.toLocaleString()}
                </span>
                <span className="text-xs text-slate-300 font-medium mr-1.5">
                  חיסכון ישיר בעלויות
                </span>
              </div>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <div>
                <span className="text-3xl font-black text-emerald-400">
                  {monthlyHoursSaved}
                </span>
                <span className="text-xs text-slate-300 font-medium mr-1.5">
                  שעות שמתפנות למכירות
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onApplySavings(monthlyHoursSaved)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer shrink-0"
          >
            <span>בנה אוטומציה שתחסוך את השעות האלו</span>
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
