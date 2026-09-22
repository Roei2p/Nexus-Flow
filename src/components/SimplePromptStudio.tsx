import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, ArrowLeft, Bot, MessageSquare, FileText, Terminal, Cpu, Zap } from "lucide-react";

interface SimplePromptStudioProps {
  onGenerate: (prompt: string, autoActivate: boolean) => Promise<void>;
  isGenerating: boolean;
  generationStep: string;
  externalPrompt?: string;
}

const CREATIVE_AI_PRESETS = [
  {
    icon: MessageSquare,
    tag: "וואטסאפ חכם",
    title: "ליד חדש ➔ ניתוח כוונות ב-AI ➔ וואטסאפ אישי",
    prompt:
      "כאשר מתקבל ליד חדש, סוכן ה-AI ינתח את תחום העניין והדחיפות, וינסח לו מיידית הודעת וואטסאפ אישית וחמה להמשך טיפול.",
  },
  {
    icon: FileText,
    tag: "כספים וחשבוניות",
    title: "רכישה / תשלום ➔ חילוץ נתונים ב-AI ➔ חשבונית מס ירוקה",
    prompt:
      "בכל רכישה מאושרת, ה-AI יחלץ את פרטי העסקה והמע״מ, יפיק חשבונית מס דיגיטלית בפורמט PDF וישלח קישור ישיר ללקוח.",
  },
  {
    icon: Bot,
    tag: "שירות ושימור",
    title: "פניית לקוח ➔ סיווג דחיפות ב-AI ➔ תעדוף והתראה לצוות",
    prompt:
      "בכל פניית שירות, ה-AI יזהה את רמת הדחיפות ומידת שביעות הרצון, יתעדף את הפנייה ויתריע למנהל הרלוונטי בטלגרם או Slack.",
  },
];

export const SimplePromptStudio: React.FC<SimplePromptStudioProps> = ({
  onGenerate,
  isGenerating,
  generationStep,
  externalPrompt,
}) => {
  const [prompt, setPrompt] = useState(
    "כאשר מתקבל ליד חדש, סוכן ה-AI ינתח את תחום העניין והדחיפות, וינסח לו מיידית הודעת וואטסאפ אישית וחמה להמשך טיפול."
  );
  const [autoActivate, setAutoActivate] = useState(true);
  const [activeAiCapability, setActiveAiCapability] = useState<string>("agent");

  useEffect(() => {
    if (externalPrompt) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), autoActivate);
  };

  const handleApplyPreset = (p: string) => {
    setPrompt(p);
  };

  return (
    <div
      id="generator-box"
      className="cyber-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-5 sm:space-y-6"
    >
      {/* Background Cyber Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cyber Header & Concept */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 sm:mt-0">
            <Terminal className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-100 flex flex-wrap items-center gap-2">
              <span>מה תרצה שהאוטומציה תבצע עבורך?</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                AUTONOMOUS // 100% SELF-SERVE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ה-AI מקים הכל ברמת לקוח ללא צורך במתכנת — משבץ מוח חושב, מקבל החלטות ומנסח מענה אישי.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0 font-mono self-start sm:self-center">
          <input
            type="checkbox"
            id="auto-activate-check"
            checked={autoActivate}
            onChange={(e) => setAutoActivate(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-cyan-500"
          />
          <span className="text-slate-300">הפעלה מיידית בענן</span>
        </label>
      </div>

      {/* Creative AI Capabilities Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {[
          {
            id: "agent",
            label: "✍️ ניסוח מענה אישי (AI Copy)",
            desc: "במקום תבניות יבשות — ה-AI מנסח הודעת וואטסאפ אנושית, אישית וחמה.",
          },
          {
            id: "classifier",
            label: "🧠 סיווג וסינון כוונות (Classifier)",
            desc: "ה-AI קורא את כוונת הפונה, מזהה דחיפות ותקציב ומנתב במדויק.",
          },
          {
            id: "extractor",
            label: "📑 חילוץ נתונים וחשבוניות (Extractor)",
            desc: "ה-AI מחלץ פרטים ומפיק חשבוניות מס ירוקות ישירות ללקוח.",
          },
        ].map((cap) => (
          <div
            key={cap.id}
            onClick={() => setActiveAiCapability(cap.id)}
            className={`p-3 rounded-2xl border text-right cursor-pointer transition-all ${
              activeAiCapability === cap.id
                ? "bg-cyan-500/10 border-cyan-500/50 text-slate-200 shadow-sm"
                : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span className="text-xs font-bold text-slate-200 block">{cap.label}</span>
            <span className="text-[11px] text-slate-400 leading-normal mt-1 block">
              {cap.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Input Form with Cyber Styling */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            id="workflow-prompt-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="לדוגמה: כאשר מתקבל ליד חדש, סוכן ה-AI ינתח את הפנייה וינסח וואטסאפ אישי..."
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none shadow-inner leading-relaxed"
            disabled={isGenerating}
          />
        </div>

        {/* Live Generation Progress Indicator */}
        {isGenerating && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-pulse font-mono">
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-cyan-400" />
            <span>{generationStep || "מרכיב ומפעיל את סוכן ה-AI בענן..."}</span>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400 text-right w-full sm:w-auto font-mono text-[11px]">
            [PRESETS_AVAILABLE // בחר השראה מוכנה או הקלד חופשי]:
          </span>

          <button
            type="submit"
            id="generate-workflow-btn"
            disabled={isGenerating || !prompt.trim()}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isGenerating
                ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>מרכיב את האוטומציה...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>הרכב והפעל בקליק אחד</span>
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* 3 Fast AI Inspiration Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {CREATIVE_AI_PRESETS.map((preset, idx) => {
          const Icon = preset.icon;
          const isSelected = prompt === preset.prompt;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset.prompt)}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-slate-950 border-cyan-500/60 shadow-md shadow-cyan-500/10"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25">
                  {preset.tag}
                </span>
                <Icon className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                {preset.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
