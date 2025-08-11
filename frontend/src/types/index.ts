// src/types/index.ts
export interface AnalysisResult {
  analysis_method: string;
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
  version: string;
}