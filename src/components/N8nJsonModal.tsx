import React, { useState } from "react";
import { Copy, Check, X, Download, Code2, Terminal } from "lucide-react";

interface N8nJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  n8nJson: any;
}

export const N8nJsonModal: React.FC<N8nJsonModalProps> = ({
  isOpen,
  onClose,
  workflowName,
  n8nJson,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(n8nJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.n8n.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                קובץ הגדרות n8n JSON (תואם REST API)
              </h3>
              <p className="text-xs text-slate-400">{workflowName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-n8n-json-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "הועתק ללוח!" : "העתק JSON"}</span>
            </button>
            <button
              id="download-n8n-json-btn"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>הורד קובץ .json</span>
            </button>
            <button
              id="close-n8n-json-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            טיפ: בתוך לוח העבודה של n8n, לחיצה על Ctrl+V מדביקה את ה-JSON ישירות למערכת.
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {n8nJson?.nodes?.length || 0} צמתים · {Object.keys(n8nJson?.connections || {}).length} חיבורים
          </span>
        </div>

        {/* JSON Code Viewer */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-xs text-emerald-400/90 leading-relaxed select-text">
          <pre>{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
