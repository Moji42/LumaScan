import React, { useState, DragEvent, ChangeEvent } from "react";

export default function ResumeDropzone() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const [jobDesc, setJobDesc] = useState("");
  const [industry, setIndustry] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setUploading(true);
    setMatchResult(null);
    setMatchError(null);

    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setResumeText(data.resume_text || "");
      setSkills(data.skills || []);
    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const analyzeMatch = async () => {
    if (!resumeText) {
      alert("Please upload a resume first.");
      return;
    }
    if (!jobDesc.trim()) {
      alert("Please enter a job description.");
      return;
    }

    setMatching(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const res = await fetch("http://localhost:5000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_desc: jobDesc,
          industry: industry.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Match analysis failed");
      }

      const data = await res.json();
      setMatchResult(data);
    } catch (err: any) {
      setMatchError(err.message || "Unknown error");
    } finally {
      setMatching(false);
    }
  };

  const gradientBackground =
    "bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600";

  return (
    <div className="w-full max-w-3xl mx-auto text-black">
      {/* Drag & Drop Area */}
      <div
        className={`${gradientBackground} p-10 border-2 border-transparent rounded-lg transition-colors cursor-pointer text-black`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept="application/pdf"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          {uploading
            ? "Uploading..."
            : dragActive
            ? "Drop your PDF here"
            : "Drag & drop your resume here, or click to browse"}
        </label>
      </div>

      {/* Extracted Skills & Resume Text (only if uploaded) */}
      {resumeText && (
        <div
          className={`${gradientBackground} mt-6 text-left p-4 rounded-lg text-black`}
          style={{ whiteSpace: "pre-wrap", maxHeight: "16rem", overflowY: "auto" }}
        >
          <h3 className="text-lg font-bold mb-2">Extracted Skills:</h3>
          <ul className="list-disc pl-5 mb-4">
            {skills.map((skill, idx) => (
              <li key={idx}>{skill}</li>
            ))}
          </ul>

          <h3 className="text-lg font-bold mb-2">Resume Text:</h3>
          <pre>{resumeText}</pre>
        </div>
      )}

      {/* Job Description & Industry Input (always visible) */}
      <div className={`${gradientBackground} mt-6 text-left p-4 rounded-lg text-black`}>
        <label htmlFor="job-desc" className="block font-semibold mb-1">
          Job Description (paste text here):
        </label>
        <textarea
          id="job-desc"
          rows={6}
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          className="w-full border rounded p-2 text-black"
          placeholder="Paste the job description to compare your resume against..."
        />
        <label htmlFor="industry" className="block font-semibold mt-4 mb-1">
          Industry (optional):
        </label>
        <input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full border rounded p-2 text-black"
          placeholder="e.g. Tech, Finance, Healthcare"
        />
        <button
          onClick={analyzeMatch}
          disabled={matching}
          className="mt-4 bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {matching ? "Analyzing..." : "Analyze Match"}
        </button>
      </div>

      {/* Match Analysis Results */}
      {matchResult && (
        <div
          className={`${gradientBackground} mt-6 p-4 rounded-lg text-black max-h-96 overflow-y-auto`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          <h3 className="text-xl font-bold mb-2">Match Analysis Results</h3>
          <p>
            <strong>Match Score:</strong> {matchResult.match_score}%
          </p>
          <p>
            <strong>Experience Level:</strong> {matchResult.experience_level}
          </p>
          <p className="mt-2">
            <strong>Matched Skills:</strong>
          </p>
          <ul className="list-disc pl-5">
            {matchResult.matched_skills.length > 0 ? (
              matchResult.matched_skills.map((m: string, idx: number) => (
                <li key={idx}>{m}</li>
              ))
            ) : (
              <li>No matched skills found</li>
            )}
          </ul>

          <p className="mt-2">
            <strong>Missing Core Skills:</strong>
          </p>
          <ul className="list-disc pl-5">
            {matchResult.missing_core_skills.length > 0 ? (
              matchResult.missing_core_skills.map((m: string, idx: number) => (
                <li key={idx}>{m}</li>
              ))
            ) : (
              <li>No missing skills detected</li>
            )}
          </ul>

          <p className="mt-2">
            <strong>Industry Analysis:</strong> {matchResult.industry_analysis}
          </p>
        </div>
      )}

      {/* Match Error */}
      {matchError && (
        <div className="mt-6 text-red-600 font-semibold">Error: {matchError}</div>
      )}
    </div>
  );
}
