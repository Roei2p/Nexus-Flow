import React from "react";
import { Star, ShieldCheck, Lock, Headphones, Award, CheckCircle2 } from "lucide-react";

export const CustomerTestimonials: React.FC = () => {
  const reviews = [
    {
      name: "יונתן ארד",
      role: "מנכ״ל סוכנות דיגיטל LeadGen",
      content:
        "הלידים מדפי הנחיתה מגיעים לוואטסאפ של המוכר בתוך 3 שניות בדיוק. אחוז הסגירה שלנו זינק ב-28% ולא איבדנו אפילו פנייה אחת.",
      metric: "חיסכון של 24 שעות שבועיות",
      stars: 5,
    },
    {
      name: "שירה דגן",
      role: "מייסדת מותג האונליין PureStyle",
      content:
        "בעבר היינו מקדישים חצי יום רק להפקת חשבוניות ועדכון חברת השליחויות. עכשיו הכל קורה אוטומטית ברגע שהתשלום עובר באשראי. אפס תקלות.",
      metric: "₪6,500 חיסכון חודשי בעלויות",
      stars: 5,
    },
    {
      name: "עו״ד גיא לוין",
      role: "שותף מנהל, לוין ושות׳ עורכי דין",
      content:
        "התזכורות האוטומטיות ביומן הורידו את ביטולי הפגישות של לקוחות ב-80%. הממשק פשוט להפליא ואין צורך בשום הבנה טכנית כדי להפעיל אותו.",
      metric: "ירידה של 80% בביטולי פגישות",
      stars: 5,
    },
  ];

  return (
    <div className="space-y-6 pt-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-100">
          מה מספרים בעלי עסקים שכבר חוסכים זמן וכסף מדי יום
        </h3>
        <p className="text-xs text-slate-400">
          מעל 450 תהליכים אוטומטיים פועלים ברקע ומייצרים שקט נפשי מלא
        </p>
      </div>

      {/* Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <div
            key={i}
            className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(r.stars)].map((_, idx) => (
                  <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{r.content}"
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-xs">{r.name}</h4>
                  <span className="text-[10px] text-slate-400">{r.role}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {r.metric}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trust & Guarantee Badges Row */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">14 ימי ניסיון חינם</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
          <Lock className="h-4 w-4 text-sky-400 shrink-0" />
          <span className="font-semibold">הצפנת SSL בתקן בנקאי</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
          <Award className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold">אפס מפתחות או קוד</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
          <Headphones className="h-4 w-4 text-indigo-400 shrink-0" />
          <span className="font-semibold">תמיכה בעברית מלאה</span>
        </div>
      </div>
    </div>
  );
};
