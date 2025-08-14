import React, { useState, DragEvent, ChangeEvent, useEffect } from "react";
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

interface MatchResult {
  match_score: number;
  matched_skills: string[];
  missing_core_skills: string[];
  industry_analysis: string;
  experience_level: string;
  score_breakdown: {
    exact_matches: number;
    cosine_similarity: {
      overall: number;
      skills: number;
      contribution: number;
    };
  };
}

interface ResumeData {
  resume_text: string;
  skills: string[];
  job_title?: string;
}

export default function ResumeDropzone({ initialResume }: { initialResume?: ResumeData }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [jobDesc, setJobDesc] = useState("");
  const [industry, setIndustry] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (initialResume) {
      setResumeText(initialResume.resume_text);
      setSkills(initialResume.skills);
    }
  }, [initialResume]);

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
    setSaveSuccess(false);

    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      setResumeText(data.resume_text || "");
      setSkills(data.skills || []);

      if (user) {
        await saveResume(data.resume_text, data.skills);
      }
    } catch (err: any) {
      console.error(err);
      setMatchError(err.message || "Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const saveResume = async (text: string, skills: string[]) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('resumes').upsert({
        user_id: user.id,
        resume_text: text,
        skills: skills,
        job_title: jobDesc 
          ? `Resume for ${jobDesc.substring(0, 30)}${jobDesc.length > 30 ? '...' : ''}`
          : "Untitled Resume"
      });
      
      if (error) throw error;
      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Error saving resume:', err);
      setMatchError(err.message || "Failed to save resume");
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
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const analyzeMatch = async () => {
    if (!resumeText) {
      setMatchError("Please upload a resume first.");
      return;
    }
    if (!jobDesc.trim()) {
      setMatchError("Please enter a job description.");
      return;
    }

    setMatching(true);
    setMatchError(null);
    setMatchResult(null);
    setSaveSuccess(false);

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

      if (user) {
        await saveResume(resumeText, skills);
      }
    } catch (err: any) {
      console.error(err);
      setMatchError(err.message || "Unknown error during analysis");
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

      {saveSuccess && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
          Resume saved to your profile!
        </div>
      )}

      {matchError && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
          {matchError}
        </div>
      )}

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

        <div className="flex justify-between items-center">
          <button
            onClick={analyzeMatch}
            disabled={matching}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded transition disabled:opacity-50"
          >
            {matching ? "Analyzing..." : "Analyze Match"}
          </button>
          {!user && (
            <p className="text-sm text-gray-500">
              Sign in to save your resumes
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {matchResult && (
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4">Match Analysis Results</h3>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-medium">Overall Match Score</h4>
              <span className={`text-2xl font-bold ${
                matchResult.match_score > 75 ? 'text-green-600' : 
                matchResult.match_score > 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {matchResult.match_score}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${
                  matchResult.match_score > 75 ? 'bg-green-500' : 
                  matchResult.match_score > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${matchResult.match_score}%` }}
              ></div>
            </div>
          </div>

          {matchResult.experience_level && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Experience Level</h4>
              <p className="capitalize">{matchResult.experience_level}</p>
            </div>
          )}

          {matchResult.matched_skills?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Matched Skills ({matchResult.matched_skills.length})</h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.matched_skills.map((skill, idx) => (
                  <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {matchResult.missing_core_skills?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Missing Core Skills ({matchResult.missing_core_skills.length})</h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.missing_core_skills.map((skill, idx) => (
                  <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {matchResult.industry_analysis && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Industry Analysis</h4>
              <p className="whitespace-pre-wrap">{matchResult.industry_analysis}</p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium mb-2">Score Breakdown</h4>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Exact Skill Matches:</span>
                <span>{matchResult.score_breakdown?.exact_matches || 0}</span>
              </li>
              <li className="flex justify-between">
                <span>Cosine Similarity:</span>
                <span>{matchResult.score_breakdown?.cosine_similarity?.overall?.toFixed(4) || 0}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}