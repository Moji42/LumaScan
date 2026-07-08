import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import ResumeDropzone from "../components/ResumeDropzone";
import Auth from "../components/Auth";
import ProfileDashboard, { LoadableResume } from "../components/ProfileDashboard";

export default function Home() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [selectedResume, setSelectedResume] = useState<LoadableResume | null>(null);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSelectedResume(null);
    localStorage.removeItem("lumascan_user_profile");
    localStorage.removeItem("lumascan_resumes");
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#f8f7ff 0%,#eef2ff 50%,#f0fdf4 100%)" }}>
      <Head>
        <title>LumaScan — Resume Match Analyzer</title>
        <meta name="description" content="Upload your resume, paste a job description, and get an AI-powered match score with a tailored resume PDF." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ── Auth modal ──────────────────────────────────────────────────────── */}
      {showAuth && !session && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm animate-fade-in">
            <Auth onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="glass border-b border-white/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg gradient-text">LumaScan</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/resume-builder"
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors hidden sm:block">
              Resume Builder
            </Link>

            {session ? (
              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[140px]">{session.user.email}</span>
                <button onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <button onClick={() => openAuth("signin")}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  Sign in
                </button>
                <button onClick={() => openAuth("signup")}
                  className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition-all hover:opacity-90 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  Sign up
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            {session ? (
              <>Your AI resume toolkit</>
            ) : (
              <>Match your resume.<br className="sm:hidden" /> <span className="gradient-text">Land the job.</span></>
            )}
          </h1>
          <p className="text-base text-gray-500 max-w-xl mx-auto">
            {session
              ? "Upload a resume and paste a job description — the AI will score your match, select the best projects, and generate a tailored PDF in seconds."
              : "Upload your resume, paste any job description, get an instant match score, and download a tailored PDF — all in one click."}
          </p>
          {!session && (
            <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
              <button onClick={() => openAuth("signup")}
                className="inline-flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-sm hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                Get started free
              </button>
              <button onClick={() => { document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" }); }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors">
                Try without signing in
              </button>
            </div>
          )}
        </div>

        {/* ── How it works strip (guests only) ──────────────────────────── */}
        {!session && (
          <div className="grid grid-cols-3 gap-3 mb-8 text-center">
            {[
              { n: "1", label: "Upload resume", desc: "Drop your PDF" },
              { n: "2", label: "Paste job description", desc: "Any posting works" },
              { n: "3", label: "Get results instantly", desc: "Score + tailored PDF" },
            ].map((s) => (
              <div key={s.n} className="card py-4 px-3">
                <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-indigo-600 bg-indigo-50">{s.n}</div>
                <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        <div id="analyzer" className="grid gap-6 grid-cols-1 lg:grid-cols-3">

          {/* Analyzer */}
          <div className="lg:col-span-2">
            <ResumeDropzone key={session?.user?.id ?? "guest"} initialResume={selectedResume} />
          </div>

          {/* Saved resumes sidebar — always visible */}
          <div className="lg:col-span-1">
            <ProfileDashboard
              onResumeSelect={(resume) => {
                setSelectedResume(resume);
                document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold gradient-text">LumaScan</span>
            <span className="text-gray-300">·</span>
            <Link href="/resume-builder" className="text-gray-400 hover:text-indigo-600 transition-colors">Resume Builder</Link>
          </div>
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} LumaScan</p>
        </div>
      </footer>
    </div>
  );
}
