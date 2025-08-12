// src/lib/api.ts
import { AnalysisResult, UploadResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const uploadResume = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload resume');
  }

  return response.json();
};

export const analyzeMatch = async (
  resumeText: string,
  jobDesc: string,
  industry: string
): Promise<AnalysisResult> => {
  const response = await fetch(`${API_BASE_URL}/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resume_text: resumeText,
      job_desc: jobDesc,
      industry: industry,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze resume');
  }

  return response.json();
};