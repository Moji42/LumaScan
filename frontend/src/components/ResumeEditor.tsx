import { useState, useEffect, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Types (mirror resume_data.json) ─────────────────────────────────────────
export interface ResumeEditorData {
  personal: { name: string; phone: string; email: string; linkedin: string };
  education: Array<{
    degree: string; institution: string; college: string;
    graduation: string; gpa: string; coursework: string;
  }>;
  skills: { languages: string[]; frameworks: string[]; tools: string[]; databases: string[] };
  projects: Array<{ title: string; duration: string; keyHighlight: string; bullets: string[] }>;
  experience: Array<{ company: string; location: string; position: string; duration: string; bullets: string[] }>;
  activities: Array<{ title: string; duration: string; keyHighlight: string; bullets: string[] }>;
}

interface Props {
  initialData: ResumeEditorData;
  initialPdfB64: string;
  pdfName: string;
  onDownload: (b64: string) => void;
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, rows = 1, mono = false,
}: {
  label?: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean;
}) {
  const cls = `w-full bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400
    focus:outline-none text-sm text-gray-800 placeholder-gray-300 transition-colors py-0.5
    ${mono ? "font-mono text-xs" : ""}`;
  return (
    <div className="group">
      {label && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>}
      {rows > 1 ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-none leading-relaxed`}
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

function BulletList({
  bullets, onChange,
}: {
  bullets: string[]; onChange: (bullets: string[]) => void;
}) {
  const update = (i: number, v: string) => {
    const next = [...bullets];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  const add = () => onChange([...bullets, ""]);

  return (
    <div className="space-y-1">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-1 group/bullet">
          <span className="text-gray-300 mt-1.5 text-xs flex-shrink-0">–</span>
          <input
            type="text"
            value={b}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none text-xs text-gray-700 py-0.5 transition-colors"
          />
          <button
            onClick={() => remove(i)}
            className="opacity-0 group-hover/bullet:opacity-100 text-gray-300 hover:text-red-400 transition text-xs px-1"
          >✕</button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-xs text-indigo-400 hover:text-indigo-600 transition mt-0.5 flex items-center gap-1"
      >
        <span className="text-base leading-none">+</span> Add bullet
      </button>
    </div>
  );
}

function SkillList({
  skills, onChange,
}: {
  skills: string[]; onChange: (s: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const remove = (i: number) => onChange(skills.filter((_, idx) => idx !== i));
  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !skills.includes(trimmed)) onChange([...skills, trimmed]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {skills.map((s, i) => (
        <span key={i}
          className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full group/chip">
          {s}
          <button onClick={() => remove(i)}
            className="opacity-0 group-hover/chip:opacity-100 text-indigo-300 hover:text-red-400 transition leading-none">✕</button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder="+ add skill"
        className="text-xs bg-transparent outline-none text-gray-500 placeholder-gray-300 w-20"
      />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResumeEditor({ initialData, initialPdfB64, pdfName, onDownload }: Props) {
  const [data, setData] = useState<ResumeEditorData>(JSON.parse(JSON.stringify(initialData)));
  const [pdfB64, setPdfB64] = useState(initialPdfB64);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If no initial PDF was provided, render one immediately on mount
  useEffect(() => {
    if (!initialPdfB64) {
      renderPdf(data);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build blob URL whenever pdfB64 changes (skip empty string)
  useEffect(() => {
    if (!pdfB64) return;
    const bytes = Uint8Array.from(atob(pdfB64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfB64]);

  // Auto-render with debounce on every edit
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderPdf(data), 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [data, dirty]);

  const renderPdf = async (d: ResumeEditorData) => {
    setRendering(true);
    setRenderError(null);
    try {
      const res = await fetch("`${API}/api/resume/render`", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: d }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Render failed");
      const json = await res.json();
      setPdfB64(json.pdf_b64);
    } catch (e: any) {
      setRenderError(e.message);
    } finally {
      setRendering(false);
    }
  };

  // Helpers to update nested state
  const setPersonal = (key: keyof ResumeEditorData["personal"], val: string) => {
    setData((d) => ({ ...d, personal: { ...d.personal, [key]: val } }));
    setDirty(true);
  };
  const setEdu = (i: number, key: string, val: string) => {
    setData((d) => {
      const edu = [...d.education];
      edu[i] = { ...edu[i], [key]: val };
      return { ...d, education: edu };
    });
    setDirty(true);
  };
  const setSkills = (cat: keyof ResumeEditorData["skills"], val: string[]) => {
    setData((d) => ({ ...d, skills: { ...d.skills, [cat]: val } }));
    setDirty(true);
  };
  const setProject = (i: number, key: string, val: string | string[]) => {
    setData((d) => {
      const projs = [...d.projects];
      projs[i] = { ...projs[i], [key]: val };
      return { ...d, projects: projs };
    });
    setDirty(true);
  };
  const removeProject = (i: number) => {
    setData((d) => ({ ...d, projects: d.projects.filter((_, idx) => idx !== i) }));
    setDirty(true);
  };
  const setExp = (i: number, key: string, val: string | string[]) => {
    setData((d) => {
      const exps = [...d.experience];
      exps[i] = { ...exps[i], [key]: val };
      return { ...d, experience: exps };
    });
    setDirty(true);
  };
  const setActivity = (i: number, key: string, val: string | string[]) => {
    setData((d) => {
      const acts = [...d.activities];
      acts[i] = { ...acts[i], [key]: val };
      return { ...d, activities: acts };
    });
    setDirty(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">

      {/* ── LEFT: Editor ──────────────────────────────────────────────────── */}
      <div className="card p-5 overflow-y-auto max-h-[78vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Edit Resume</h3>
          <p className="text-xs text-gray-400">Changes preview automatically</p>
        </div>

        {/* Personal */}
        <SectionHeader>Contact</SectionHeader>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Field label="Full Name" value={data.personal.name} onChange={(v) => setPersonal("name", v)} />
          <Field label="Phone" value={data.personal.phone} onChange={(v) => setPersonal("phone", v)} />
          <Field label="Email" value={data.personal.email} onChange={(v) => setPersonal("email", v)} />
          <Field label="LinkedIn" value={data.personal.linkedin} onChange={(v) => setPersonal("linkedin", v)} />
        </div>


        {/* Education */}
        <SectionHeader>Education</SectionHeader>
        {data.education.map((e, i) => (
          <div key={i} className="space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label="Degree" value={e.degree} onChange={(v) => setEdu(i, "degree", v)} />
              <Field label="Graduation" value={e.graduation} onChange={(v) => setEdu(i, "graduation", v)} />
              <Field label="Institution" value={e.institution} onChange={(v) => setEdu(i, "institution", v)} />
              <Field label="GPA" value={e.gpa} onChange={(v) => setEdu(i, "gpa", v)} />
              <Field label="College/School" value={e.college || ""} onChange={(v) => setEdu(i, "college", v)} />
            </div>
            <Field label="Coursework" value={Array.isArray(e.coursework) ? (e.coursework as string[]).join(", ") : String(e.coursework ?? "")} onChange={(v) => setEdu(i, "coursework", v)} rows={2} />
          </div>
        ))}

        {/* Skills */}
        <SectionHeader>Skills</SectionHeader>
        <div className="space-y-3">
          {(["languages", "frameworks", "tools", "databases"] as const).map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 capitalize">{cat}</p>
              <SkillList skills={data.skills[cat] || []} onChange={(v) => setSkills(cat, v)} />
            </div>
          ))}
        </div>

        {/* Projects */}
        <SectionHeader>Technical Projects</SectionHeader>
        <div className="space-y-5">
          {data.projects.map((p, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 group/proj">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
                  <Field label="Title" value={p.title} onChange={(v) => setProject(i, "title", v)} />
                  <Field label="Duration" value={p.duration} onChange={(v) => setProject(i, "duration", v)} />
                  <div className="col-span-2">
                    <Field label="Key Highlight" value={p.keyHighlight} onChange={(v) => setProject(i, "keyHighlight", v)} />
                  </div>
                </div>
                <button onClick={() => removeProject(i)}
                  className="opacity-0 group-hover/proj:opacity-100 text-xs text-gray-300 hover:text-red-400 transition mt-4 flex-shrink-0">
                  Remove
                </button>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Bullets</p>
                <BulletList bullets={p.bullets} onChange={(v) => setProject(i, "bullets", v)} />
              </div>
            </div>
          ))}
        </div>

        {/* Work Experience */}
        <SectionHeader>Work Experience</SectionHeader>
        <div className="space-y-5">
          {data.experience.map((e, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Field label="Company" value={e.company} onChange={(v) => setExp(i, "company", v)} />
                <Field label="Location" value={e.location} onChange={(v) => setExp(i, "location", v)} />
                <Field label="Position" value={e.position} onChange={(v) => setExp(i, "position", v)} />
                <Field label="Duration" value={e.duration} onChange={(v) => setExp(i, "duration", v)} />
              </div>
              <BulletList bullets={e.bullets} onChange={(v) => setExp(i, "bullets", v)} />
            </div>
          ))}
        </div>

        {/* Activities */}
        <SectionHeader>Extracurricular Activities</SectionHeader>
        <div className="space-y-5">
          {data.activities.map((a, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Field label="Title" value={a.title} onChange={(v) => setActivity(i, "title", v)} />
                <Field label="Duration" value={a.duration} onChange={(v) => setActivity(i, "duration", v)} />
                <div className="col-span-2">
                  <Field label="Key Highlight" value={a.keyHighlight || ""} onChange={(v) => setActivity(i, "keyHighlight", v)} />
                </div>
              </div>
              <BulletList bullets={a.bullets} onChange={(v) => setActivity(i, "bullets", v)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: PDF Preview ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="card flex-1 overflow-hidden flex flex-col" style={{ minHeight: "60vh" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">PDF Preview</span>
            <div className="flex items-center gap-2">
              {rendering && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-500">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating…
                </span>
              )}
              {renderError && (
                <span className="text-xs text-red-500">Render error</span>
              )}
              {!rendering && !renderError && dirty && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Up to date
                </span>
              )}
            </div>
          </div>

          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              className="flex-1 w-full"
              style={{ minHeight: "55vh", border: "none" }}
              title="Resume Preview"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Loading preview…
            </div>
          )}
        </div>

        <button
          onClick={() => onDownload(pdfB64)}
          disabled={rendering}
          className="inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-5 py-3 rounded-xl disabled:opacity-50 transition hover:opacity-90 shadow-sm"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download This Version
        </button>
      </div>
    </div>
  );
}
