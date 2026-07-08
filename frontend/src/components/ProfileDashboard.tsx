import { useState, useEffect, useMemo } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ResumeEditorData {
  personal: { name: string; phone: string; email: string; linkedin: string };
  education: Array<{ degree: string; institution: string; college: string; graduation: string; gpa: string; coursework: string }>;
  skills: { languages: string[]; frameworks: string[]; tools: string[]; databases: string[] };
  projects: Array<{ title: string; duration: string; keyHighlight: string; bullets: string[] }>;
  experience: Array<{ company: string; location: string; position: string; duration: string; bullets: string[] }>;
  activities: Array<{ title: string; duration: string; keyHighlight: string; bullets: string[] }>;
}

export interface LoadableResume {
  resume_text: string;
  skills: string[];
  job_title?: string;
  structured_data?: ResumeEditorData;
}

type Source = "builder" | "tailored" | "uploaded";

interface ListEntry {
  key: string;
  label: string;
  date: string;          // ISO
  skills: string[];
  source: Source;
  resume_text: string;
  structured_data?: ResumeEditorData;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function buildResumeText(d: ResumeEditorData): string {
  return [
    d.personal.name,
    [d.personal.phone, d.personal.email, d.personal.linkedin].filter(Boolean).join(" | "),
    "", "EDUCATION",
    ...d.education.map((e) => `${e.degree} | GPA: ${e.gpa} | ${e.graduation} | ${e.institution}`),
    "", "TECHNICAL SKILLS",
    `Languages: ${(d.skills.languages || []).join(", ")}`,
    `Frameworks: ${(d.skills.frameworks || []).join(", ")}`,
    `Tools: ${(d.skills.tools || []).join(", ")}`,
    "", "TECHNICAL PROJECTS",
    ...d.projects.flatMap((p) => [p.title, p.duration, p.keyHighlight || "", ...p.bullets.map((b) => `- ${b}`)]),
    "", "WORK EXPERIENCE",
    ...d.experience.flatMap((e) => [`${e.position} | ${e.company}`, e.duration, ...e.bullets.map((b) => `- ${b}`)]),
  ].join("\n");
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

const SOURCE_LABELS: Record<Source, { label: string; emoji: string; color: string }> = {
  builder:  { label: "Builder",  emoji: "📄", color: "bg-violet-50 text-violet-700 border-violet-100" },
  tailored: { label: "Tailored", emoji: "✨", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  uploaded: { label: "Uploaded", emoji: "📁", color: "bg-sky-50 text-sky-700 border-sky-100" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProfileDashboard({ onResumeSelect }: { onResumeSelect: (r: LoadableResume) => void }) {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Source>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (typeof window === "undefined") return;
    setLoading(true);
    const result: ListEntry[] = [];

    // ── localStorage resumes ───────────────────────────────────────────────
    try {
      const raw = localStorage.getItem("lumascan_resumes");
      const local: any[] = raw ? JSON.parse(raw) : [];
      for (const r of local) {
        const td: ResumeEditorData = r.tailored_data;
        const skills = [
          ...(td?.skills?.languages || []),
          ...(td?.skills?.frameworks || []),
          ...(td?.skills?.tools || []),
        ];
        result.push({
          key: `local-${r.id}`,
          label: r.source === "builder"
            ? (td?.personal?.name ? `${td.personal.name}'s Resume` : "My Resume")
            : (r.jobSnippet || "Tailored Resume"),
          date: r.savedAt,
          skills,
          source: r.source === "builder" ? "builder" : "tailored",
          resume_text: buildResumeText(td),
          structured_data: td,
        });
      }
    } catch {}

    // ── Supabase resumes (logged-in only) ──────────────────────────────────
    if (user) {
      try {
        const { data } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        for (const r of data || []) {
          // Don't duplicate if it was also saved to localStorage
          result.push({
            key: `sb-${r.id}`,
            label: r.job_title || "Uploaded Resume",
            date: r.created_at,
            skills: r.skills || [],
            source: "uploaded",
            resume_text: r.resume_text,
          });
        }
      } catch {}
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const deleteEntry = async (key: string) => {
    setDeletingKey(key);
    if (key.startsWith("local-")) {
      const id = parseInt(key.replace("local-", ""), 10);
      try {
        const raw = localStorage.getItem("lumascan_resumes");
        const local: any[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem("lumascan_resumes", JSON.stringify(local.filter((r) => r.id !== id)));
      } catch {}
      setEntries((prev) => prev.filter((e) => e.key !== key));
    } else {
      const id = key.replace("sb-", "");
      await supabase.from("resumes").delete().eq("id", id);
      setEntries((prev) => prev.filter((e) => e.key !== key));
    }
    setDeletingKey(null);
  };

  // ── Filtering + search ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = entries;
    if (filter !== "all") list = list.filter((e) => e.source === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [entries, filter, search]);

  const counts = useMemo(() => ({
    all: entries.length,
    builder: entries.filter((e) => e.source === "builder").length,
    tailored: entries.filter((e) => e.source === "tailored").length,
    uploaded: entries.filter((e) => e.source === "uploaded").length,
  }), [entries]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="card p-5 flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-base">Saved Resumes</h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-40 flex items-center gap-1 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or skill…"
          className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-300 transition"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition text-sm leading-none">✕</button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {(["all", "builder", "tailored", "uploaded"] as const).map((f) => {
          const count = counts[f];
          if (f !== "all" && count === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                filter === f
                  ? "text-white border-transparent shadow-sm"
                  : "text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600 bg-white"
              }`}
              style={filter === f ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}
            >
              {f === "all" ? "All" : SOURCE_LABELS[f].emoji + " " + SOURCE_LABELS[f].label}
              <span className={`ml-1 ${filter === f ? "opacity-70" : "text-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
              <div className="flex gap-1.5 pt-1">
                <div className="skeleton h-5 w-16" />
                <div className="skeleton h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          {entries.length === 0 ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No saved resumes yet</p>
              <p className="text-xs text-gray-400 mt-1">Analyze a job or save your resume in the builder</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-400">No results for "{search}"</p>
              <button onClick={() => { setSearch(""); setFilter("all"); }} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">Clear filters</button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-380px)] pr-0.5">
          {filtered.map((entry) => {
            const src = SOURCE_LABELS[entry.source];
            return (
              <div
                key={entry.key}
                className="rounded-xl border border-gray-100 p-3.5 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{entry.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(entry.date)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${src.color}`}>
                    {src.emoji} {src.label}
                  </span>
                </div>

                {/* Skills */}
                {entry.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {entry.skills.slice(0, 6).map((s, i) => (
                      <span key={i} className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-1.5 py-0.5 rounded-full">{s}</span>
                    ))}
                    {entry.skills.length > 6 && (
                      <span className="text-[10px] text-gray-400">+{entry.skills.length - 6}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onResumeSelect({
                      resume_text: entry.resume_text,
                      skills: entry.skills,
                      job_title: entry.label,
                      structured_data: entry.structured_data,
                    })}
                    className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg transition hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    Load for analysis
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.key)}
                    disabled={deletingKey === entry.key}
                    className="text-xs font-medium text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 border border-gray-100 transition-colors disabled:opacity-40"
                  >
                    {deletingKey === entry.key ? "…" : "✕"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
