import React from "react";
import { Sparkles, CheckCircle2, ShieldCheck, Terminal, Cpu, Zap } from "lucide-react";

interface LandingHeroProps {
  onScrollToGenerator?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = () => {
  return (
    <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 pb-1 relative">
      {/* Subtle Cyber Glow & HUD Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cyber Tag Badge */}
      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-mono tracking-wide shadow-sm max-w-full">
        <Terminal className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 shrink-0" />
        <span className="truncate">[AUTONOMOUS_BUSINESS_CORE // CLIENT_LEVEL]</span>
      </div>

      {/* Main Punchy Heading with Cyber Flair */}
      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 tracking-tight leading-snug sm:leading-tight font-sans">
        מנוע אוטומציות AI{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
          ברמת לקוח — באוטופיילוט מלא
        </span>
      </h1>

      {/* 1 Clear Subtitle */}
      <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed px-2">
        בלי מתכנתים, בלי שעות מומחה יקרות ובלי סיבוכים. ה-AI מרכיב, מחבר ומריץ עבורך סוכנים
        חכמים שמסווגים לידים, מנסחים מענה אישי בוואטסאפ ומפיקים חשבוניות 24/7.
      </p>

      {/* Micro Cyber Trust Proof Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-1 text-[10px] sm:text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400 shrink-0" />
          <span>חיבור בקליק (ללא קוד)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
          <Cpu className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 shrink-0" />
          <span>מוח AI חושב ומנסח אנושי</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
          <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-300 shrink-0" />
          <span>מחיר: ₪29 עד ₪99 לחודש</span>
        </div>
      </div>
    </div>
  );
};

