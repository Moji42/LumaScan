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
        className={`border-4 border-dashed rounded-xl p-10 text-center transition-colors duration-300 ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
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

          {/* Main Match Score */}
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h4 className="text-lg font-semibold text-indigo-800 mb-2">Overall Match Score</h4>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
                <div
                  className="bg-indigo-600 h-4 rounded-full"
                  style={{ width: `${matchResult.match_score}%` }}
                ></div>
              </div>
              <span className="text-xl font-bold text-indigo-700">
                {matchResult.match_score}%
              </span>
            </div>
          </div>

          {/* Experience Level */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2">Experience Level</h4>
            <div className={`px-4 py-2 rounded-lg inline-block ${matchResult.experience_level === 'senior'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
              }`}>
              {matchResult.experience_level}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Cosine Similarity Scores</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Overall Text Similarity: </span>
                  <span className="font-medium">
                    {(matchResult.score_breakdown.cosine_similarity.overall * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Skills Similarity: </span>
                  <span className="font-medium">
                    {(matchResult.score_breakdown.cosine_similarity.skills * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Contribution to Score: </span>
                  <span className="font-medium">
                    {matchResult.score_breakdown.cosine_similarity.contribution}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Exact Matches</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Exact Skill Matches: </span>
                  <span className="font-medium">
                    {matchResult.score_breakdown.exact_matches}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Contribution to Score: </span>
                  <span className="font-medium">
                    {100 - matchResult.score_breakdown.cosine_similarity.contribution}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Skills */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2">Matched Skills</h4>
            {matchResult.matched_skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {matchResult.matched_skills.map((s: string, i: number) => (
                  <div key={i} className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm">
                    {s}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No matched skills found.</p>
            )}
          </div>

          {/* Missing Core Skills */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2">Missing Core Skills</h4>
            {matchResult.missing_core_skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {matchResult.missing_core_skills.map((s: string, i: number) => (
                  <div key={i} className="bg-red-50 text-red-800 px-3 py-1 rounded-full text-sm">
                    {s}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No missing skills detected.</p>
            )}
          </div>

          {/* Industry Analysis */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Industry Analysis</h4>
            <p className="text-gray-700">{matchResult.industry_analysis}</p>
          </div>

          {/* Technical Details */}
          <details className="mt-4 text-sm text-gray-500">
            <summary className="cursor-pointer">Technical Details</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
              {JSON.stringify(matchResult, null, 2)}
            </pre>
          </details>
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