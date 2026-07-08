/**
 * Shown after upload when we detect it's a new user's resume.
 * Lets them review/correct the LLM-parsed structured data before generating.
 */
import { useState } from "react";
import { ResumeEditorData } from "./ResumeEditor";

interface Props {
  data: ResumeEditorData;
  onChange: (d: ResumeEditorData) => void;
}

function Row({ label, value, onChange, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition"
      />
    </div>
  );
}

function ChipEditor({ label, values, onChange }: {
  label: string; values: string[]; onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setDraft("");
  };
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5 items-center p-2 border border-gray-200 rounded-lg min-h-[36px]">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
            {v}
            <button onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-indigo-300 hover:text-red-400 leading-none transition">✕</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder={values.length === 0 ? `Add ${label.toLowerCase()}…` : "+"}
          className="text-xs outline-none bg-transparent text-gray-500 placeholder-gray-300 min-w-[60px] flex-1"
        />
      </div>
    </div>
  );
}

export default function ResumeProfileForm({ data, onChange }: Props) {
  const [open, setOpen] = useState(true);

  const setPersonal = (k: keyof ResumeEditorData["personal"], v: string) =>
    onChange({ ...data, personal: { ...data.personal, [k]: v } });

  const setSkills = (cat: keyof ResumeEditorData["skills"], vals: string[]) =>
    onChange({ ...data, skills: { ...data.skills, [cat]: vals } });

  const setEduField = (i: number, k: string, v: string) => {
    const edu = [...data.education];
    edu[i] = { ...edu[i], [k]: v };
    onChange({ ...data, education: edu });
  };

  return (
    <div className="card border border-indigo-100 bg-indigo-50/20 overflow-hidden animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">
              {data.personal.name ? `Resume parsed for ${data.personal.name}` : "Review your parsed resume info"}
            </p>
            <p className="text-xs text-indigo-500">Review and correct before generating — click to {open ? "collapse" : "expand"}</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-indigo-100">
          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-4 mb-3">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Row label="Full Name" value={data.personal.name} onChange={(v) => setPersonal("name", v)} placeholder="Jane Smith" />
              <Row label="Phone" value={data.personal.phone} onChange={(v) => setPersonal("phone", v)} placeholder="555-123-4567" />
              <Row label="Email" value={data.personal.email} onChange={(v) => setPersonal("email", v)} placeholder="jane@email.com" />
              <Row label="LinkedIn" value={data.personal.linkedin} onChange={(v) => setPersonal("linkedin", v)} placeholder="linkedin.com/in/..." />
            </div>
          </div>

          {/* Education */}
          {data.education.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Education</p>
              {data.education.map((e, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Row label="Degree" value={e.degree} onChange={(v) => setEduField(i, "degree", v)} />
                  <Row label="Institution" value={e.institution} onChange={(v) => setEduField(i, "institution", v)} />
                  <Row label="GPA" value={e.gpa} onChange={(v) => setEduField(i, "gpa", v)} placeholder="3.8" />
                  <Row label="Graduation" value={e.graduation} onChange={(v) => setEduField(i, "graduation", v)} placeholder="May 2025" />
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Skills</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChipEditor label="Languages" values={data.skills.languages || []} onChange={(v) => setSkills("languages", v)} />
              <ChipEditor label="Frameworks" values={data.skills.frameworks || []} onChange={(v) => setSkills("frameworks", v)} />
              <ChipEditor label="Tools" values={data.skills.tools || []} onChange={(v) => setSkills("tools", v)} />
              <ChipEditor label="Databases" values={data.skills.databases || []} onChange={(v) => setSkills("databases", v)} />
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            Projects, experience, and activities are pulled from your resume automatically.
            Open <span className="font-medium text-indigo-500">Resume Builder</span> to edit them in full.
          </p>
        </div>
      )}
    </div>
  );
}
