import React, { useState } from "react";
import {
  Sparkles,
  Layers,
  Lock,
  CreditCard,
  Rocket,
  Terminal,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { SystemStats } from "../types";

export type NavView = "studio" | "fleet" | "oauth" | "pricing" | "roadmap";

interface HeaderProps {
  stats: SystemStats;
  activeView: NavView;
  onViewChange: (view: NavView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  activeView,
  onViewChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectView = (view: NavView) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: "studio", label: "סטודיו AI", icon: <Sparkles className="h-3.5 w-3.5 shrink-0" /> },
    {
      id: "fleet",
      label: "אוטומציות",
      icon: <Layers className="h-3.5 w-3.5 shrink-0" />,
      badge: stats.total_workflows > 0 ? stats.total_workflows : undefined,
    },
    { id: "pricing", label: "מחירון", icon: <CreditCard className="h-3.5 w-3.5 shrink-0" /> },
  ];

  const secondaryItems: { id: NavView; label: string; icon: React.ReactNode }[] = [
    { id: "oauth", label: "חיבורים", icon: <Lock className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> },
    { id: "roadmap", label: "ל-Prod", icon: <Rocket className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> },
  ];

  return (
    <>
      <header className="border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-15">
            {/* Cyber Logo & Brand */}
            <div
              className="flex items-center gap-2.5 cursor-pointer group shrink-0"
              onClick={() => handleSelectView("studio")}
            >
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-cyan-500 to-teal-400 p-0.5 shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                  <div className="h-full w-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                    <Terminal className="h-4 w-4 text-cyan-400" />
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-100 text-sm sm:text-base tracking-tight font-mono">
                  Nexus<span className="text-cyan-400">Cyber</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  AUTONOMOUS
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Hidden on mobile/tablet < md) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`nav-${item.id}-btn`}
                    onClick={() => handleSelectView(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isActive ? "bg-slate-950 text-cyan-300" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Desktop Secondary Quick Actions */}
            <div className="hidden md:flex items-center gap-1.5 shrink-0">
              {secondaryItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`nav-${item.id}-btn`}
                    onClick={() => handleSelectView(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      isActive
                        ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30"
                    }`}
                  >
                    {item.icon}
                    <span className="font-mono text-[11px]">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Header Controls (< md) */}
            <div className="flex md:hidden items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {activeView === "studio" && "סטודיו AI"}
                {activeView === "fleet" && "אוטומציות"}
                {activeView === "pricing" && "מחירון"}
                {activeView === "oauth" && "חיבורים"}
                {activeView === "roadmap" && "ל-Prod"}
              </span>

              <button
                type="button"
                id="mobile-menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                aria-label="פתח תפריט ניווט"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-cyan-500/20 bg-slate-950/98 px-4 py-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
            <div className="text-[10px] font-mono text-slate-400 pb-1">
              [NAV_MATRIX // ניווט מהיר]:
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectView(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === item.id
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            ))}

            <div className="border-t border-slate-900 my-1 pt-1.5 space-y-1">
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectView(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeView === item.id
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Persistent Mobile Bottom Navigation Bar (< md) for instant 1-thumb switching */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-cyan-500/20 px-3 py-1.5 shadow-2xl">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => handleSelectView("studio")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
              activeView === "studio"
                ? "text-cyan-400 font-bold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-4 w-4 mb-0.5" />
            <span>סטודיו</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectView("fleet")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] transition-all cursor-pointer relative ${
              activeView === "fleet"
                ? "text-cyan-400 font-bold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4 mb-0.5" />
            <span>אוטומציות</span>
            {stats.total_workflows > 0 && (
              <span className="absolute top-1 right-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectView("pricing")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
              activeView === "pricing"
                ? "text-cyan-400 font-bold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CreditCard className="h-4 w-4 mb-0.5" />
            <span>מחירון</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectView("oauth")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
              activeView === "oauth"
                ? "text-cyan-400 font-bold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="h-4 w-4 mb-0.5" />
            <span>חיבורים</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectView("roadmap")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
              activeView === "roadmap"
                ? "text-cyan-400 font-bold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Rocket className="h-4 w-4 mb-0.5" />
            <span>ל-Prod</span>
          </button>
        </div>
      </div>
    </>
  );
};

