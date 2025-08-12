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

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 text-gray-900">
      {/* File Upload */}
      <div
        className={`border-4 border-dashed rounded-xl p-10 text-center transition-colors duration-300 ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        } cursor-pointer shadow-sm`}
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
        <label htmlFor="file-upload" className="block text-lg font-medium">
          {uploading
            ? "Uploading..."
            : dragActive
            ? "Drop your resume PDF here"
            : "Drag & drop your resume PDF here, or click to upload"}
        </label>
      </div>

      {/* Resume Content */}
      {resumeText && (
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-semibold mb-3">Extracted Skills</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          <h3 className="text-xl font-semibold mb-3">Resume Text</h3>
          <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border">
            {resumeText}
          </div>
        </div>
      )}

      {/* Job Description */}
      <div className="mt-8 bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Job Matching</h3>

        <label htmlFor="job-desc" className="block font-medium mb-1">
          Job Description
        </label>
        <textarea
          id="job-desc"
          rows={5}
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          className="w-full border border-gray-300 rounded p-3 mb-4 text-sm"
          placeholder="Paste the job description here..."
        />

        <label htmlFor="industry" className="block font-medium mb-1">
          Industry (optional)
        </label>
        <input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full border border-gray-300 rounded p-3 mb-4 text-sm"
          placeholder="e.g. Tech, Finance, Healthcare"
        />

        <button
          onClick={analyzeMatch}
          disabled={matching}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded transition disabled:opacity-50"
        >
          {matching ? "Analyzing..." : "Analyze Match"}
        </button>
      </div>

      {/* Results */}
      {matchResult && (
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Match Results</h3>

          <p className="mb-2">
            <strong>Match Score:</strong> {matchResult.match_score}%
          </p>
          <p className="mb-2">
            <strong>Experience Level:</strong> {matchResult.experience_level}
          </p>

          <div className="mt-4">
            <h4 className="font-semibold">Matched Skills:</h4>
            <ul className="list-disc list-inside mb-2">
              {matchResult.matched_skills.length > 0 ? (
                matchResult.matched_skills.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))
              ) : (
                <li>No matched skills found.</li>
              )}
            </ul>

            <h4 className="font-semibold">Missing Core Skills:</h4>
            <ul className="list-disc list-inside mb-2">
              {matchResult.missing_core_skills.length > 0 ? (
                matchResult.missing_core_skills.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))
              ) : (
                <li>No missing skills detected.</li>
              )}
            </ul>

            <p className="mt-2">
              <strong>Industry Analysis:</strong> {matchResult.industry_analysis}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {matchError && (
        <div className="mt-6 bg-red-100 border border-red-300 text-red-800 p-4 rounded">
          <strong>Error:</strong> {matchError}
        </div>
      )}
    </div>
  );
}
