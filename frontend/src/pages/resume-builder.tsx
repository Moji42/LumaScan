import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import ResumeEditor, { ResumeEditorData } from "../components/ResumeEditor";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SavedResume {
  id: number;
  savedAt: string;
  jobSnippet: string;
  tailored_data: ResumeEditorData;
  pdf_b64: string;
}

const PROFILE_KEY = "lumascan_user_profile";
const HISTORY_KEY = "lumascan_resumes";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Blank profile template ────────────────────────────────────────────────────
function blankProfile(): ResumeEditorData {
  return {
    personal: { name: "", phone: "", email: "", linkedin: "" },
    education: [{
      degree: "", institution: "", college: "",
      graduation: "", gpa: "", coursework: "",
    }],
    skills: { languages: [], frameworks: [], tools: [], databases: [] },
    projects: [{
      title: "", duration: "", keyHighlight: "", bullets: [""],
    }],
    experience: [{
      company: "", location: "", position: "", duration: "", bullets: [""],
    }],
    activities: [],
  };
}

// ── Onboarding gate ───────────────────────────────────────────────────────────
function Onboarding({ onProfile }: { onProfile: (d: ResumeEditorData) => void }) {
  const [mode, setMode] = useState<"choose" | "upload" | "manual">("choose");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") { setError("Please upload a PDF file."); return; }
    setParsing(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const data = await res.json();
      if (!data.structured_data) throw new Error("Could not parse resume structure.");
      onProfile(data.structured_data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  if (mode === "manual") {
    return (
      <div className="card p-8 max-w-md mx-auto text-center animate-fade-in">
        <p className="text-sm text-gray-500 mb-4">A blank resume template will open in the editor — fill in your details there.</p>
        <button
          onClick={() => onProfile(blankProfile())}
          className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition hover:opacity-90 shadow-sm"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          Open Blank Template
        </button>
        <button onClick={() => setMode("choose")} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Set up your resume</h2>
        <p className="text-sm text-gray-500 mb-8">
          Upload your existing resume PDF and we'll parse it automatically, or start from a blank template.
        </p>

        {error && (
          <div className="mb-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-left">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Upload option */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all
              ${parsing ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
            onClick={() => !parsing && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner />
                <p className="text-sm text-indigo-600 font-medium">Parsing your resume…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-gray-700">Upload existing resume PDF</p>
                <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Manual option */}
          <button
            onClick={() => onProfile(blankProfile())}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Start from a blank template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ResumeBuilderPage() {
  const [tab, setTab] = useState<"master" | "history">("master");
  const [profile, setProfile] = useState<ResumeEditorData | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [masterPdfB64, setMasterPdfB64] = useState("");
  const [masterPdfLoading, setMasterPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedResume[]>([]);
  const [selected, setSelected] = useState<SavedResume | null>(null);

  // Load profile from localStorage (never from server file)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
    setProfileLoaded(true);
  }, []);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Generate initial PDF preview whenever profile is set / changed
  useEffect(() => {
    if (profile && !masterPdfB64) renderInitialPdf(profile);
  }, [profile]);

  const renderInitialPdf = async (data: ResumeEditorData) => {
    setMasterPdfLoading(true);
    try {
      const res = await fetch(`${API}/api/resume/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        const json = await res.json();
        setMasterPdfB64(json.pdf_b64);
      }
    } catch {}
    finally { setMasterPdfLoading(false); }
  };

  const handleProfileSet = (d: ResumeEditorData) => {
    setProfile(d);
    setMasterPdfB64(""); // cleared → useEffect triggers renderInitialPdf
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(d)); } catch {}
  };

  const saveProfile = async (d: ResumeEditorData) => {
    setSaving(true);
    setSaveError(null);
    try {
      setProfile(d);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(d));

      // Also push to lumascan_resumes so it appears in the AI analyzer's "load" list
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      // Replace any existing builder entry to avoid duplicates
      const filtered = history.filter((r: any) => r.source !== "builder");
      filtered.unshift({
        id: Date.now(),
        savedAt: new Date().toISOString(),
        jobSnippet: d.personal?.name ? `${d.personal.name}'s Resume` : "My Resume",
        tailored_data: d,
        pdf_b64: masterPdfB64 || "",
        source: "builder",
      });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));
      setHistory(filtered.slice(0, 20));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = (b64: string, label = "Resume") => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Resume"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteHistory = (id: number) => {
    const updated = history.filter((r) => r.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#f8f7ff 0%,#eef2ff 50%,#f0fdf4 100%)" }}>
      <Head><title>Resume Builder — LumaScan</title></Head>

      {/* Header */}
      <header className="glass border-b border-white/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg gradient-text">LumaScan</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Analyzer
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Resume Builder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your master resume and revisit previously tailored versions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 shadow-sm p-1 rounded-xl w-fit mb-6">
          {(["master", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
              style={tab === t ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}>
              {t === "master" ? "📄 My Resume"
                : `🕘 Previous Resumes${history.length > 0 ? ` (${history.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* ── MASTER TAB ──────────────────────────────────────────────────────── */}
        {tab === "master" && (
          <>
            {!profileLoaded ? (
              <div className="card p-10 flex items-center justify-center gap-3 text-indigo-500">
                <Spinner /><span className="text-sm">Loading…</span>
              </div>
            ) : !profile ? (
              <Onboarding onProfile={handleProfileSet} />
            ) : (
              <div className="space-y-4">
                {/* Action bar */}
                <div className="card px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">My Master Resume</p>
                    <p className="text-xs text-gray-400">
                      This is what the AI tailors for each job. Edits are saved to your browser.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (confirm("Replace your current resume with a new upload or blank template?")) {
                          localStorage.removeItem(PROFILE_KEY);
                          setProfile(null);
                          setMasterPdfB64("");
                        }
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 border border-gray-200"
                    >
                      Replace resume
                    </button>
                    <button
                      onClick={() => profile && saveProfile(profile)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition hover:opacity-90 shadow-sm"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                    >
                      {saving ? <><Spinner />Saving…</>
                        : saved
                        ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Saved!</>
                        : <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Save
                          </>
                      }
                    </button>
                  </div>
                </div>
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}

                {masterPdfLoading || !masterPdfB64 ? (
                  <div className="card p-10 flex flex-col items-center justify-center gap-3 text-indigo-500 min-h-[40vh]">
                    <Spinner />
                    <span className="text-sm font-medium">Generating PDF preview…</span>
                    <span className="text-xs text-gray-400">This takes a few seconds</span>
                  </div>
                ) : (
                  <ResumeEditor
                    key={masterPdfB64.slice(0, 20)}
                    initialData={profile}
                    initialPdfB64={masterPdfB64}
                    pdfName="My_Resume"
                    onDownload={(b64) => downloadPdf(b64, "My_Resume")}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* List */}
            <div className="lg:col-span-1 space-y-3">
              {history.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No tailored resumes yet</p>
                  <p className="text-xs text-gray-400 mt-1">Run the analyzer on the main page and they'll appear here.</p>
                  <Link href="/" className="mt-4 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Go to Analyzer →
                  </Link>
                </div>
              ) : (
                history.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`card p-4 cursor-pointer transition-all hover:border-indigo-200 group ${
                      selected?.id === r.id ? "border-indigo-400 bg-indigo-50/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{r.jobSnippet || "Tailored Resume"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(r.savedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHistory(r.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-xs px-1 flex-shrink-0"
                      >✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Editor panel */}
            <div className="lg:col-span-2">
              {!selected ? (
                <div className="card p-10 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <svg className="w-8 h-8 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                  <p className="text-sm text-gray-400">Select a resume from the list to edit and preview it.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="card px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">{selected.jobSnippet || "Tailored Resume"}</p>
                      <p className="text-xs text-gray-400">Generated {timeAgo(selected.savedAt)}</p>
                    </div>
                    <button
                      onClick={() => downloadPdf(selected.pdf_b64, selected.jobSnippet || "Resume")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Original
                    </button>
                  </div>
                  <ResumeEditor
                    key={selected.id}
                    initialData={selected.tailored_data}
                    initialPdfB64={selected.pdf_b64}
                    pdfName={selected.jobSnippet || "Resume"}
                    onDownload={(b64) => downloadPdf(b64, selected.jobSnippet || "Resume")}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
