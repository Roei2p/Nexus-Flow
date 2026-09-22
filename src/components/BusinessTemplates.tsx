import React from "react";
import {
  Sparkles,
  Zap,
  FileSpreadsheet,
  Receipt,
  MessageSquare,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

interface BusinessTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export const POPULAR_TEMPLATES = [
  {
    id: "lead-whatsapp",
    title: "קליטת לידים מיידית לוואטסאפ",
    category: "מכירות ולידים",
    benefit: "מענה תוך 3 שניות מעלה סגירת עסקאות ב-30%",
    icon: <MessageSquare className="h-5 w-5 text-emerald-400" />,
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    prompt:
      "כאשר מתקבל ליד חדש בטופס באתר, אמת את מספר הטלפון, שלח התראה מיידית לוואטסאפ של מנהל המכירות עם פרטי הפנייה ושלח SMS תודה ללקוח",
  },
  {
    id: "auto-invoice",
    title: "הפקת חשבונית מס אוטומטית ברכישה",
    category: "כספים וגבייה",
    benefit: "חוסך 15 שעות עבודה בחודש ומבטל טעויות אנוש",
    icon: <Receipt className="h-5 w-5 text-amber-400" />,
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    prompt:
      "בכל פעם שמתקבל תשלום מוצלח ב-Stripe, הפק אוטומטית חשבונית מס ירוקה ב-PDF, שלח אותה באימייל ללקוח ועדכן את טבלת ההכנסות",
  },
  {
    id: "google-sheet-sync",
    title: "סנכרון Google Sheets להתראות טלגרם",
    category: "תפעול וסנכרון",
    benefit: "כל הצוות מעודכן בזמן אמת ללא צורך במעקב ידני",
    icon: <FileSpreadsheet className="h-5 w-5 text-sky-400" />,
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    prompt:
      "בכל פעם שנוספת שורה חדשה ב-Google Sheets, בדוק את תקינות האימייל, הפק מסמך סיכום ושלח אותו מיידית לערוץ הטלגרם של הצוות",
  },
  {
    id: "meeting-reminder",
    title: "תזכורות אוטומטיות לפגישות ביומן",
    category: "ניהול פגישות",
    benefit: "מפחית ביטולי פגישות של לקוחות ב-80%",
    icon: <Calendar className="h-5 w-5 text-indigo-400" />,
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    prompt:
      "24 שעות לפני פגישה שנקבעה ביומן Google Calendar, שלח הודעת תזכורת אוטומטית בוואטסאפ ללקוח עם פרטי הפגישה, שעת ההגעה וקישור ישיר ל-Waze",
  },
];

export const BusinessTemplates: React.FC<BusinessTemplatesProps> = ({
  onSelectTemplate,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">
            תבניות פופולריות מוכנות לשימוש מיידי
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          לחץ על תבנית כדי להפעיל אותה ב-1 קליק
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {POPULAR_TEMPLATES.map((tpl) => (
          <div
            key={tpl.id}
            onClick={() => onSelectTemplate(tpl.prompt)}
            className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/95 rounded-2xl p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.01]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tpl.badgeColor}`}
                >
                  {tpl.category}
                </span>
                <div className="h-8 w-8 rounded-lg bg-slate-950 flex items-center justify-center">
                  {tpl.icon}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 text-sm group-hover:text-emerald-300 transition-colors">
                  {tpl.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {tpl.benefit}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold group-hover:underline inline-flex items-center gap-1">
                <span>בחר תבנית זו</span>
                <ArrowLeft className="h-3 w-3" />
              </span>
              <span className="text-[10px] text-slate-500">הפעלה מיידית</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
