import React, { useState, DragEvent, ChangeEvent, useEffect, useRef } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import ResumeEditor, { ResumeEditorData } from "./ResumeEditor";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MatchResult {
  match_score: number;
  matched_skills: string[];
  missing_core_skills: string[];
  industry_analysis: string;
  experience_level: string;
  score_breakdown: {
    exact_matches: number;
    cosine_similarity: { overall: number };
  };
}
interface AtsResult {
  ats_score: number;
  grade: string;
  breakdown: {
    contact_info: number;
    section_headers: number;
    keyword_match: number;
    formatting: number;
    quantifiable_achievements: number;
  };
  recommendations: string[];
  word_count: number;
  sections_found: string[];
}
interface PipelineResult {
  match_result: MatchResult;
  ats_result: AtsResult;
  selected_projects: string[];
  pdf_b64: string;
  tailored_data: ResumeEditorData;
}
interface ResumeData {
  resume_text: string;
  skills: string[];
  job_title?: string;
  structured_data?: ResumeEditorData;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 44, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const badgeCls = score >= 75
    ? "bg-green-50 text-green-700"
    : score >= 50
    ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700";
  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 56 56)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
        <text x="56" y="51" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="800" fill={color}>{score}</text>
        <text x="56" y="68" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#94a3b8">/ 100</text>
      </svg>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeCls}`}>{label}</span>
    </div>
  );
}

function Chip({ label, variant }: { label: string; variant: "matched" | "missing" | "neutral" }) {
  const cls = {
    matched: "bg-green-50 text-green-700 border-green-100",
    missing: "bg-red-50 text-red-700 border-red-100",
    neutral: "bg-indigo-50 text-indigo-700 border-indigo-100",
  }[variant];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      {variant === "matched" && <span className="mr-1">✓</span>}
      {variant === "missing" && <span className="mr-1">✗</span>}
      {label}
    </span>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildResumeText(d: ResumeEditorData): string {
  const lines: string[] = [
    d.personal.name,
    [d.personal.phone, d.personal.email, d.personal.linkedin].filter(Boolean).join(" | "),
    "", "EDUCATION",
    ...d.education.map((e) =>
      `${e.degree} | GPA: ${e.gpa} | ${e.graduation} | ${e.institution}`
    ),
    "", "TECHNICAL SKILLS",
    `Languages: ${(d.skills.languages || []).join(", ")}`,
    `Frameworks: ${(d.skills.frameworks || []).join(", ")}`,
    `Tools: ${(d.skills.tools || []).join(", ")}`,
    "", "TECHNICAL PROJECTS",
    ...d.projects.flatMap((p) => [
      p.title, p.duration, p.keyHighlight || "",
      ...p.bullets.map((b) => `- ${b}`),
    ]),
    "", "WORK EXPERIENCE",
    ...d.experience.flatMap((e) => [
      `${e.position} | ${e.company}`, e.duration,
      ...e.bullets.map((b) => `- ${b}`),
    ]),
    "", "EXTRACURRICULAR ACTIVITIES",
    ...d.activities.flatMap((a) => [
      a.title, a.duration, a.keyHighlight || "",
      ...a.bullets.map((b) => `- ${b}`),
    ]),
  ];
  return lines.join("\n");
}

function SkillInput({ onAdd }: { onAdd: (skill: string) => void }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const t = draft.trim();
    if (t) { onAdd(t); setDraft(""); }
  };
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
      onBlur={commit}
      placeholder="+ add skill"
      className="text-xs bg-transparent outline-none text-gray-500 placeholder-gray-300 min-w-[80px] flex-1 py-0.5"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type Stage = "idle" | "uploading" | "ready" | "running" | "done";

export default function ResumeDropzone({ initialResume }: { initialResume?: ResumeData | null }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [jobDesc, setJobDesc] = useState("");
  const [industry, setIndustry] = useState("");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);
  const [tab, setTab] = useState<"match" | "ats" | "edit">("match");
  const [pdfName, setPdfName] = useState("");
  const [tailoredData, setTailoredData] = useState<ResumeEditorData | null>(null);
  const [userResumeData, setUserResumeData] = useState<ResumeEditorData | null>(null);
  const [masterProfile, setMasterProfile] = useState<ResumeEditorData | null>(null);

  // Hydration-safe: read localStorage only after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lumascan_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserResumeData(parsed);
        setMasterProfile(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (initialResume) {
      setResumeText(initialResume.resume_text);
      setSkills(initialResume.skills);
      setFileName(initialResume.job_title || "Loaded resume");
      setStage("ready");
      setResult(null);
      setError(null);
      if (initialResume.structured_data) {
        setUserResumeData(initialResume.structured_data);
        try { localStorage.setItem("lumascan_user_profile", JSON.stringify(initialResume.structured_data)); } catch {}
      }
    }
  }, [initialResume]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setStage("uploading");
    setError(null);
    setResult(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await fetch("`${API}/api/upload`", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const data = await res.json();
      setResumeText(data.resume_text || "");
      setSkills(data.skills || []);
      // Use LLM-parsed structure; prefer existing saved profile if user already has one
      if (data.structured_data) {
        const parsed: ResumeEditorData = data.structured_data;
        setUserResumeData(parsed);
        try { localStorage.setItem("lumascan_user_profile", JSON.stringify(parsed)); } catch {}
      }
      setStage("ready");
    } catch (e: any) {
      setError(e.message);
      setStage("idle");
      setFileName(null);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (stage !== "running") handleFiles(e.dataTransfer.files);
  };

  // ── Pipeline ───────────────────────────────────────────────────────────────
  const runPipeline = async (overrides?: { resumeText?: string; userData?: typeof userResumeData }) => {
    const effectiveResumeText = overrides?.resumeText ?? resumeText;
    const effectiveUserData   = overrides?.userData   ?? userResumeData;

    if (!effectiveResumeText) { setError("Upload a resume first."); return; }
    if (!jobDesc.trim()) { setError("Paste a job description."); return; }

    setStage("running");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("`${API}/api/resume/generate`", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: effectiveResumeText,
          job_desc: jobDesc,
          industry: industry.trim() || null,
          user_data: effectiveUserData || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Pipeline failed");
      const data: PipelineResult = await res.json();
      setResult(data);
      setTailoredData(data.tailored_data ?? null);
      setStage("done");
      // Persist to localStorage so Resume Builder can list it
      try {
        const saved = JSON.parse(localStorage.getItem("lumascan_resumes") || "[]");
        saved.unshift({
          id: Date.now(),
          savedAt: new Date().toISOString(),
          jobSnippet: jobDesc.substring(0, 80),
          tailored_data: data.tailored_data,
          pdf_b64: data.pdf_b64,
        });
        localStorage.setItem("lumascan_resumes", JSON.stringify(saved.slice(0, 20)));
      } catch {}

      if (user) {
        await supabase.from("resumes").upsert({
          user_id: user.id,
          resume_text: resumeText,
          skills,
          job_title: jobDesc.substring(0, 50),
        });
      }
    } catch (e: any) {
      setError(e.message);
      setStage("ready");
    }
  };

  const downloadPdf = () => {
    if (!result?.pdf_b64) return;
    const bytes = Uint8Array.from(atob(result.pdf_b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    const safeName = pdfName.trim().replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Tailored_Resume";
    a.download = `${safeName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setStage("idle");
    setFileName(null);
    setResumeText("");
    setSkills([]);
    setJobDesc("");
    setIndustry("");
    setResult(null);
    setError(null);
    setUserResumeData(null);
    try { localStorage.removeItem("lumascan_user_profile"); } catch {}
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mr = result?.match_result;
  const ar = result?.ats_result;
  const canRun = stage !== "running" && stage !== "uploading" && !!resumeText && !!jobDesc.trim();

  return (
    <div className="space-y-4">

      {/* ── STEP 1: Upload ─────────────────────────────────────────────────── */}
      <div className="card p-2">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 mb-3">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
          <span className="text-sm font-semibold text-gray-800">Upload your resume</span>
        </div>

        {stage === "idle" || stage === "uploading" ? (
          <div
            className={`mx-2 mb-2 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
              ${dragActive ? "border-indigo-400 bg-indigo-50 dropzone-glow" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
            onDragEnter={handleDrag} onDragOver={handleDrag}
            onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => stage === "idle" && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={(e) => handleFiles(e.target.files)} accept="application/pdf" />

            {stage === "uploading" ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner />
                <p className="text-sm text-indigo-600 font-medium">Parsing resume…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {dragActive ? "Drop it here" : "Drag & drop your PDF resume"}
                </p>
                <p className="text-xs text-gray-400">or <span className="text-indigo-600 font-medium">click to browse</span></p>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-2 mb-2 flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-800">{fileName}</p>
                <p className="text-xs text-gray-500">
                  {skills.length} skills
                  <button onClick={() => setShowFullText(!showFullText)} className="ml-2 text-indigo-500 hover:text-indigo-700 font-medium">
                    {showFullText ? "hide text" : "view text"}
                  </button>
                </p>
              </div>
            </div>
            <button onClick={resetAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              Replace
            </button>
          </div>
        )}

        {/* Editable skills */}
        {(skills.length > 0 || stage === "ready" || stage === "done") && stage !== "idle" && stage !== "uploading" && (
          <div className="mx-2 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Skills · {skills.length}
              </p>
              <p className="text-[10px] text-gray-300">Click × to remove · type to add</p>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-gray-100 rounded-xl bg-gray-50/50 min-h-[40px]">
              {skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full shadow-sm group/chip">
                  {s}
                  <button
                    onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}
                    className="text-gray-300 hover:text-red-400 transition leading-none opacity-0 group-hover/chip:opacity-100"
                    tabIndex={-1}
                  >✕</button>
                </span>
              ))}
              <SkillInput onAdd={(skill) => {
                if (!skills.includes(skill)) setSkills([...skills, skill]);
              }} />
            </div>
            {showFullText && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {resumeText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Use master resume shortcut (idle only) ────────────────────────── */}
      {stage === "idle" && masterProfile && (
        <div className="mx-2 mb-3">
          <button
            onClick={() => {
              const text = buildResumeText(masterProfile);
              const s = [
                ...(masterProfile.skills.languages || []),
                ...(masterProfile.skills.frameworks || []),
                ...(masterProfile.skills.tools || []),
              ];
              setResumeText(text);
              setSkills(s);
              setUserResumeData(masterProfile);
              setFileName(masterProfile.personal?.name ? `${masterProfile.personal.name}'s Resume` : "My Resume");
              setStage("ready");
              setResult(null);
              setError(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-700">Use my master resume</p>
              <p className="text-[10px] text-indigo-400 truncate">
                {masterProfile.personal?.name || "Saved in Resume Builder"}
              </p>
            </div>
            <svg className="w-4 h-4 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 2: Job Description ────────────────────────────────────────── */}
      <div className="card p-2">
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 mb-3">
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${stage !== "idle" && stage !== "uploading" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
          <span className="text-sm font-semibold text-gray-800">Paste the job description</span>
        </div>
        <div className="mx-2 mb-2 space-y-2">
          <textarea
            rows={6}
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            disabled={stage === "running"}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none transition disabled:opacity-60"
            placeholder="Paste the full job description here…"
          />
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={stage === "running"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition disabled:opacity-60"
            placeholder="Industry (optional) — e.g. Tech, Finance, Healthcare"
          />
        </div>
      </div>

      {/* ── STEP 3: Analyze & Generate ─────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${stage === "done" ? "bg-green-500 text-white" : stage === "running" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"}`}>
            {stage === "done"
              ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              : "3"}
          </span>
          <span className="text-sm font-semibold text-gray-800">Analyze match &amp; generate tailored resume</span>
        </div>

        {/* Loading status — only shown while actually running */}
        {stage === "running" && (
          <div className="mb-4 flex items-center gap-3 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 animate-fade-in">
            <Spinner />
            <span>AI is analyzing your resume and tailoring content for this job…</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={runPipeline}
            disabled={!canRun}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90 shadow-sm"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {stage === "running" ? (
              <><Spinner /> Analyzing…</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {stage === "done" ? "Re-analyze" : "Analyze & Build Resume"}
              </>
            )}
          </button>

          {stage === "done" && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center border border-indigo-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-300">
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="Resume filename…"
                  className="text-sm text-gray-700 placeholder-gray-400 px-3 py-2.5 outline-none w-44"
                />
                <span className="text-xs text-gray-400 pr-3 select-none">.pdf</span>
              </div>
              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 text-indigo-700 bg-white border border-indigo-200 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            </div>
          )}

          {!user && (
            <p className="text-xs text-gray-400 ml-auto">Sign in to save results</p>
          )}
        </div>
      </div>

      {/* ── RESULTS ────────────────────────────────────────────────────────── */}
      {result && mr && ar && (
        <div className="card p-6 animate-slide-up">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
            {(["match", "ats", "edit"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  tab === t ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
                style={tab === t ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}
              >
                {t === "ats" ? "ATS Score" : t === "edit" ? "✏️ Edit & Preview" : "Match Analysis"}
              </button>
            ))}
          </div>

          {/* ── Match tab ──────────────────────────────────────────────────── */}
          {tab === "match" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-5 items-center bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <ScoreRing score={mr.match_score}
                  label={mr.match_score >= 75 ? "Strong Match" : mr.match_score >= 50 ? "Moderate Match" : "Weak Match"} />
                <div className="flex-1 w-full space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                      <p className="text-xl font-bold text-green-500">{mr.matched_skills?.length ?? 0}</p>
                      <p className="text-xs text-gray-400">Matched</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                      <p className="text-xl font-bold text-red-400">{mr.missing_core_skills?.length ?? 0}</p>
                      <p className="text-xs text-gray-400">Missing</p>
                    </div>
                  </div>
                  {mr.experience_level && (
                    <span className="inline-block text-xs font-semibold capitalize bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full">
                      {mr.experience_level} role
                    </span>
                  )}
                </div>
              </div>

              {result.selected_projects.length > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-semibold text-indigo-700 mb-2">
                    ✦ AI selected these projects for this job
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.selected_projects.map((t, i) => (
                      <span key={i} className="text-xs bg-white text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {mr.matched_skills?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                    Matched Skills ({mr.matched_skills.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mr.matched_skills.map((s, i) => <Chip key={i} label={s} variant="matched" />)}
                  </div>
                </div>
              )}

              {mr.missing_core_skills?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-2"></span>
                    Missing Skills ({mr.missing_core_skills.length})
                  </p>
                  <p className="text-xs text-gray-400 mb-2">Click a skill to add it to your resume, then re-analyze.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mr.missing_core_skills.map((s, i) => {
                      const alreadyAdded = skills.includes(s);
                      return alreadyAdded ? (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
                          ✓ {s}
                        </span>
                      ) : (
                        <button
                          key={i}
                          onClick={() => {
                            // Mark as added in the display list only;
                            // actual pipeline injection happens in re-analyze button
                            setSkills((prev) => [...prev, s]);
                          }}
                          className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full hover:bg-red-100 hover:border-red-300 transition-all group/ms"
                        >
                          <span className="text-red-300 group-hover/ms:text-red-500 transition-colors">✗</span>
                          {s}
                          <span className="text-[10px] text-red-300 group-hover/ms:text-red-500 transition-colors ml-0.5">+ add</span>
                        </button>
                      );
                    })}
                  </div>
                  {(() => {
                    const addedMissing = mr.missing_core_skills.filter((s) => skills.includes(s));
                    if (!addedMissing.length) return null;
                    return (
                      <button
                        onClick={() => {
                          // Prepend added skills so they appear within the LLM's first-2000-char window
                          const skillsHeader = `ADDITIONAL SKILLS: ${addedMissing.join(", ")}\n\n`;
                          const updatedText = skillsHeader + resumeText;
                          const updatedUserData = userResumeData ? {
                            ...userResumeData,
                            skills: {
                              ...userResumeData.skills,
                              tools: [
                                ...(userResumeData.skills.tools || []),
                                ...addedMissing.filter((s) => !(userResumeData.skills.tools || []).includes(s)),
                              ],
                            },
                          } : userResumeData;
                          runPipeline({ resumeText: updatedText, userData: updatedUserData });
                        }}
                        disabled={stage === "running"}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition shadow-sm disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                      >
                        {stage === "running" ? (
                          <><Spinner /> Analyzing…</>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Re-analyze with {addedMissing.length} added skill{addedMissing.length > 1 ? "s" : ""}
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              )}

              {mr.industry_analysis && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-semibold text-indigo-700 mb-1">Industry Analysis</p>
                  <p className="text-sm text-indigo-700 leading-relaxed">{mr.industry_analysis}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Edit & Preview tab ────────────────────────────────────────── */}
          {tab === "edit" && tailoredData && result && (
            <ResumeEditor
              initialData={tailoredData}
              initialPdfB64={result.pdf_b64}
              pdfName={pdfName}
              onDownload={(b64) => {
                const safeName = pdfName.trim().replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Tailored_Resume";
                const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                const a = document.createElement("a");
                a.href = url; a.download = `${safeName}.pdf`; a.click();
                URL.revokeObjectURL(url);
              }}
            />
          )}

          {/* ── ATS tab ────────────────────────────────────────────────────── */}
          {tab === "ats" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <ScoreRing score={ar.ats_score} label={ar.grade} />
                <div className="flex-1 w-full space-y-2.5">
                  <p className="text-sm font-semibold text-gray-800 mb-1">ATS Score Breakdown</p>
                  <MiniBar label="Contact Info" value={ar.breakdown.contact_info} max={10} />
                  <MiniBar label="Section Headers" value={ar.breakdown.section_headers} max={15} />
                  <MiniBar label="Keyword Match" value={ar.breakdown.keyword_match} max={40} />
                  <MiniBar label="Formatting" value={ar.breakdown.formatting} max={20} />
                  <MiniBar label="Quantifiable Achievements" value={ar.breakdown.quantifiable_achievements} max={15} />
                  <p className="text-xs text-gray-400 pt-1">Word count: {ar.word_count}</p>
                </div>
              </div>

              {ar.recommendations.length > 0 && (
                <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Recommendations
                  </p>
                  <ul className="space-y-2">
                    {ar.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600">
                        <span className="text-amber-400 flex-shrink-0">→</span>{rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-white border border-gray-100 rounded-xl">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sections Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {ar.sections_found.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-0.5 rounded-full capitalize">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
