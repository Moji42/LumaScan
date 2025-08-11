// src/components/ResumeDropzone.tsx
import React, { useState, DragEvent, ChangeEvent } from "react";

export default function ResumeDropzone() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return;
  const file = files[0];
  if (file.type !== "application/pdf") {
    alert("Please upload a PDF file.");
    return;
  }

  const formData = new FormData();
  formData.append("resume", file);  // <---- change here

  setUploading(true);
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

  return (
    <div className="w-full">
      <div
        className={`p-10 border-2 border-dashed rounded-lg transition-colors ${
          dragActive ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
        }`}
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
        <label htmlFor="file-upload" className="cursor-pointer text-gray-600">
          {uploading
            ? "Uploading..."
            : dragActive
            ? "Drop your PDF here"
            : "Drag & drop your resume here, or click to browse"}
        </label>
      </div>

      {resumeText && (
        <div className="mt-6 text-left">
          <h3 className="text-lg font-bold">Extracted Skills:</h3>
          <ul className="list-disc pl-5">
            {skills.map((skill, idx) => (
              <li key={idx}>{skill}</li>
            ))}
          </ul>

          <h3 className="mt-4 text-lg font-bold">Resume Text:</h3>
          <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded">
            {resumeText}
          </pre>
        </div>
      )}
    </div>
  );
}
