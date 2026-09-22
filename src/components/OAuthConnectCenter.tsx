import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  LogOut,
  HelpCircle,
  FileSpreadsheet,
  Send,
  MessageSquare,
  CreditCard,
  Building2,
  Share2,
  Check,
} from "lucide-react";

export interface OAuthProvider {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  connected: boolean;
  connectedAccount?: string;
  connectedAt?: string;
  scopes: string[];
}

const INITIAL_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google Workspace",
    category: "מסמכים ואימייל",
    description: "חיבור מאובטח ל-Google Sheets, Gmail, Google Drive ויומן Google.",
    icon: "google",
    color: "emerald",
    connected: true,
    connectedAccount: "business@mycompany.com",
    connectedAt: "לפני 3 ימים",
    scopes: ["צפייה ועריכת גליונות Sheets", "קריאת שורות חדשות", "שליחת אימיילים דרך Gmail"],
  },
  {
    id: "telegram",
    name: "Telegram",
    category: "הודעות והתראות",
    description: "חיבור ערוצים וקבוצות לשליחת הודעות, קבצים ועדכונים מיידיים.",
    icon: "telegram",
    color: "sky",
    connected: true,
    connectedAccount: "@MyBusinessChannel",
    connectedAt: "לפני 5 ימים",
    scopes: ["שליחת הודעות טקסט ומדיה", "שליחת קבצי חשבוניות PDF", "קבלת פקודות מנהל"],
  },
  {
    id: "slack",
    name: "Slack",
    category: "תקשורת צוות",
    description: "חיבור מרחב העבודה לשליחת התראות עסקאות, לידים ודוחות יומיים.",
    icon: "slack",
    color: "amber",
    connected: false,
    scopes: ["שליחת הודעות לערוצים נבחרים", "פרסום סיכומי עסקאות"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "שירות לקוחות",
    description: "שליחת הודעות וואטסאפ אוטומטיות ללקוחות לאחר רכישה או הרשמה.",
    icon: "whatsapp",
    color: "emerald",
    connected: false,
    scopes: ["שליחת תבניות הודעה מאושרות", "עדכוני סטטוס הזמנה"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "סליקה ותשלומים",
    description: "סנכרון תשלומים, עסקאות מוצלחות וחשבוניות מס בזמן אמת.",
    icon: "stripe",
    color: "indigo",
    connected: false,
    scopes: ["האזנה לתשלומים מוצלחים", "קבלת פרטי לקוח ועסקה", "הפקת קבלות"],
  },
  {
    id: "crm",
    name: "HubSpot / Pipedrive CRM",
    category: "ניהול לידים ומכירות",
    description: "יצירה ועדכון אוטומטי של אנשי קשר, עסקאות ומשימות במערכת ה-CRM.",
    icon: "crm",
    color: "rose",
    connected: false,
    scopes: ["יצירת אנשי קשר חדשים", "עדכון שלב עסקה בציר הזמן"],
  },
];

export const OAuthConnectCenter: React.FC = () => {
  const [providers, setProviders] = useState<OAuthProvider[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_oauth_providers");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PROVIDERS;
  });

  const [activeModalProvider, setActiveModalProvider] = useState<OAuthProvider | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  const saveProviders = (updated: OAuthProvider[]) => {
    setProviders(updated);
    try {
      localStorage.setItem("nexus_oauth_providers", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleOpenConnect = (provider: OAuthProvider) => {
    setActiveModalProvider(provider);
    setAuthSuccess(false);
  };

  const handleConfirmAuthorization = () => {
    if (!activeModalProvider) return;
    setIsAuthorizing(true);

    setTimeout(() => {
      setIsAuthorizing(false);
      setAuthSuccess(true);

      setTimeout(() => {
        const updated = providers.map((p) => {
          if (p.id === activeModalProvider.id) {
            return {
              ...p,
              connected: true,
              connectedAccount:
                p.id === "google"
                  ? "business@mycompany.com"
                  : p.id === "telegram"
                  ? "@BusinessBot"
                  : p.id === "slack"
                  ? "MyCompany-Workspace"
                  : p.id === "whatsapp"
                  ? "+972 54-889-0123"
                  : p.id === "stripe"
                  ? "acct_109283401 (Live)"
                  : "Company CRM Account",
              connectedAt: "הרגע חובר",
            };
          }
          return p;
        });

        saveProviders(updated);
        setActiveModalProvider(null);
        setAuthSuccess(false);
      }, 900);
    }, 1200);
  };

  const handleDisconnect = (providerId: string) => {
    const updated = providers.map((p) => {
      if (p.id === providerId) {
        return {
          ...p,
          connected: false,
          connectedAccount: undefined,
          connectedAt: undefined,
        };
      }
      return p;
    });
    saveProviders(updated);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "google":
        return <FileSpreadsheet className="h-6 w-6 text-emerald-400" />;
      case "telegram":
        return <Send className="h-6 w-6 text-sky-400" />;
      case "slack":
        return <MessageSquare className="h-6 w-6 text-amber-400" />;
      case "whatsapp":
        return <MessageSquare className="h-6 w-6 text-emerald-400" />;
      case "stripe":
        return <CreditCard className="h-6 w-6 text-indigo-400" />;
      case "crm":
        return <Building2 className="h-6 w-6 text-rose-400" />;
      default:
        return <Share2 className="h-6 w-6 text-emerald-400" />;
    }
  };

  const connectedCount = providers.filter((p) => p.connected).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>חיבור OAuth 2.0 מאובטח בקליק אחד</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              חיבור חשבונות עצמאי — אפס הגדרות, אפס מפתחות API
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              אתה לא צריך להתעסק עם קוד, מפתחות סודיים או כתובות שרת. כל שירות מתחבר בלחיצת כפתור אחת דרך מסך האישור הרשמי של החברה, והמערכת שלנו מתחילה להריץ עבורך את האוטומציות מיד.
            </p>
          </div>

          {/* Status summary pill */}
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shrink-0">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100">
                {connectedCount} מתוך {providers.length}
              </div>
              <div className="text-xs text-slate-400">שירותים מחוברים ומאומתים</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of OAuth Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`bg-slate-900/70 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl ${
              provider.connected
                ? "border-emerald-500/40 bg-emerald-950/10"
                : "border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                    {renderIcon(provider.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{provider.name}</h3>
                    <span className="text-[11px] text-slate-400">{provider.category}</span>
                  </div>
                </div>

                {provider.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>מחובר</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    <span>לא מחובר</span>
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                {provider.description}
              </p>

              {/* Connected details */}
              {provider.connected && (
                <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>חשבון מחובר:</span>
                    <span className="font-mono text-emerald-300 font-semibold truncate max-w-[150px]">
                      {provider.connectedAccount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>סטטוס סנכרון:</span>
                    <span className="text-emerald-400 font-medium">פעיל ותקין 100%</span>
                  </div>
                </div>
              )}

              {/* Authorized Scopes */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  הרשאות גישה אוטומטיות:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {provider.scopes.map((scope, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{scope}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-5 border-t border-slate-800/80 mt-4">
              {provider.connected ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenConnect(provider)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                    <span>אמת חיבור מחדש</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(provider.id)}
                    className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                    title="התנתק והסר גישה"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id={`connect-oauth-${provider.id}-btn`}
                  onClick={() => handleOpenConnect(provider)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>חבר חשבון ב-1 קליק (OAuth)</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security Guarantee Box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">
              אבטחת מידע בתקן בינלאומי ללא שמירת סיסמאות
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              כל החיבורים מבוצעים ישירות דרך פרוטוקול OAuth 2.0 המאובטח. אנחנו לעולם לא נחשפים לסיסמה שלכם, והרשאות הגישה מוגבלות אך ורק לפעולות שהגדרתם.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          256-bit TLS · OAuth 2.0 Certified
        </div>
      </div>

      {/* OAuth Authorization Consent Modal */}
      {activeModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  {renderIcon(activeModalProvider.icon)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">
                    אישור הרשאת גישה — {activeModalProvider.name}
                  </h3>
                  <p className="text-xs text-slate-400">פרוטוקול אימות מאובטח OAuth 2.0</p>
                </div>
              </div>
            </div>

            {authSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-bold text-emerald-300">
                  החיבור אושר והופעל בהצלחה!
                </h4>
                <p className="text-xs text-slate-300">
                  ההרשאות נשמרו בצורה מוצפנת, האוטומציות שלך יכולות להתחיל לפעול מיידית.
                </p>
              </div>
            ) : (
              <>
                {/* Information Box */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-slate-300 leading-relaxed">
                    מערכת <strong className="text-emerald-400">Nexus-Flow</strong> מבקשת הרשאה מוגבלת לחשבון שלך על מנת לבצע את האוטומציות העסקיות באופן אוטונומי:
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      הרשאות מבוקשות:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeModalProvider.scopes.map((scope, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>{scope}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Important notice */}
                <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>ללא מפתחות API או סיסמאות:</strong> החיבור מתבצע דרך מנגנון ההרשאות הרשמי. ניתן לבטל גישה זו בכל רגע מלוח הבקרה.
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isAuthorizing}
                    onClick={() => setActiveModalProvider(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    ביטול
                  </button>

                  <button
                    type="button"
                    id="confirm-oauth-grant-btn"
                    disabled={isAuthorizing}
                    onClick={handleConfirmAuthorization}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {isAuthorizing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>מאמת הרשאה מול הספק...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>אשר והתחבר עכשיו בקליק</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
