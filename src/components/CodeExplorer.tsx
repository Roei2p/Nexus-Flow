import React, { useState, useEffect } from "react";
import {
  Code2,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  Server,
  Layers,
  Cpu,
  Database,
} from "lucide-react";

interface CodeExplorerProps {
  onBackToFactory?: () => void;
}

export const CodeExplorer: React.FC<CodeExplorerProps> = () => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>("backend/agent_engine.py");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/project-code")
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load project files:", err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    if (!files[selectedFile]) return;
    navigator.clipboard.writeText(files[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!files[selectedFile]) return;
    const blob = new Blob([files[selectedFile]], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.split("/").pop() || "source.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileList = [
    {
      id: "backend/agent_engine.py",
      name: "agent_engine.py",
      tag: "Component A & C",
      desc: "Spec translation & Self-Healing loop",
      icon: <Cpu className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      id: "backend/n8n_service.py",
      name: "n8n_service.py",
      tag: "Component B",
      desc: "REST client for local n8n instance",
      icon: <Server className="h-3.5 w-3.5 text-sky-400" />,
    },
    {
      id: "backend/main.py",
      name: "main.py",
      tag: "FastAPI Core",
      desc: "API endpoints & webhook listener",
      icon: <Layers className="h-3.5 w-3.5 text-amber-400" />,
    },
    {
      id: "backend/models.py",
      name: "models.py",
      tag: "Database",
      desc: "SQLAlchemy Models (Workflow, Execution)",
      icon: <Database className="h-3.5 w-3.5 text-indigo-400" />,
    },
    {
      id: "docker-compose.yml",
      name: "docker-compose.yml",
      tag: "Phase 1 Docker",
      desc: "PostgreSQL + n8n + FastAPI containers",
      icon: <Terminal className="h-3.5 w-3.5 text-rose-400" />,
    },
    {
      id: "backend/database.py",
      name: "database.py",
      tag: "Engine",
      desc: "Async engine & session generator",
      icon: <FileCode className="h-3.5 w-3.5 text-slate-400" />,
    },
    {
      id: "backend/requirements.txt",
      name: "requirements.txt",
      tag: "Dependencies",
      desc: "FastAPI, LangChain, SDKs",
      icon: <FileCode className="h-3.5 w-3.5 text-slate-400" />,
    },
    {
      id: ".env.example",
      name: ".env.example",
      tag: "Config",
      desc: "Environment variables blueprint",
      icon: <FileCode className="h-3.5 w-3.5 text-slate-400" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Architecture Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-emerald-400" />
              Nexus-Flow Production Source Code & Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Phases 1-4 full implementation matching the project specification: Docker Compose, FastAPI Core, SQLAlchemy Models, n8n API Client Wrapper, and Multi-Agent Engine.
            </p>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Terminal className="h-3.5 w-3.5" />
            <span>docker compose up -d</span>
          </div>
        </div>

        {/* 3 Pillars Architecture Map */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
              Component A: Spec & Orchestrator
            </span>
            <p className="text-xs text-slate-200 font-medium">Prompt ➔ Abstract Schema ➔ n8n Blueprint</p>
            <p className="text-[11px] text-slate-500">
              agent_engine.py parses triggers, validations, actions, and positions nodes on n8n graph.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-sky-400">
              Component B: n8n Integration Layer
            </span>
            <p className="text-xs text-slate-200 font-medium">Local n8n REST API (5678) Client</p>
            <p className="text-[11px] text-slate-500">
              n8n_service.py manages workflow create, update, activate, and webhook URL extraction.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400">
              Component C: Self-Healing Guard
            </span>
            <p className="text-xs text-slate-200 font-medium">Telemetry Interceptor & Auto-Patcher</p>
            <p className="text-[11px] text-slate-500">
              Listens for error traces, prompts LLM for parameter repair, and re-deploys updated workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Navigator Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Project Files
          </span>
          <div className="space-y-1">
            {fileList.map((item) => (
              <button
                key={item.id}
                id={`file-btn-${item.name.replace(/\./g, "-")}`}
                onClick={() => setSelectedFile(item.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col gap-1 ${
                  selectedFile === item.id
                    ? "bg-slate-800/90 border-emerald-500/40 text-slate-100 shadow-sm"
                    : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono font-medium">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {item.tag}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Code Content Area */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
          {/* File Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-slate-200 font-semibold">{selectedFile}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                UTF-8
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="copy-code-btn"
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </button>
              <button
                id="download-file-btn"
                onClick={handleDownload}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Download className="h-3 w-3" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="p-5 bg-slate-950 flex-1 overflow-auto max-h-[600px] font-mono text-xs text-slate-300 leading-relaxed select-text">
            {loading ? (
              <div className="py-12 text-center text-slate-500">Loading file contents...</div>
            ) : files[selectedFile] ? (
              <pre>{files[selectedFile]}</pre>
            ) : (
              <div className="py-12 text-center text-slate-500">File not found or empty.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
