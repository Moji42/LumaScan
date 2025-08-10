from app.services.gemini import model
from typing import List, Dict
import re
import json
from app.services.similarity import similarity_checker

SKILL_SYNONYMS = {
    'aws': 'amazon web services',
    'gcp': 'google cloud platform',
    'js': 'javascript',
    'ts': 'typescript'
}

INDUSTRY_KEYWORDS = {
    'tech': ['programming', 'cloud', 'devops'],
    'finance': ['accounting', 'risk', 'excel'],
    'healthcare': ['hipaa', 'fda', 'clinical']
}

def normalize_skill(skill: str) -> str:
    skill = skill.lower().strip()
    return SKILL_SYNONYMS.get(skill, skill)

def generate_analysis_prompt(resume_text: str, job_desc: str, industry: str = None) -> str:
    industry_context = f"\nIndustry Context: {industry}" if industry else ""
    return f"""
    Perform resume-job matching analysis:
    1. Identify exact skill matches
    2. Highlight missing core skills
    3. Provide industry-specific analysis
    
    {industry_context}
    
    Resume Excerpt:
    {resume_text[:2000]}
    
    Job Description:
    {job_desc[:2000]}
    
    Return JSON with:
    - exact_matches: [skills]
    - missing_core: [skills]
    - industry_analysis: str
    """

def compare_resume_and_job(resume_text, job_desc, industry=None):
    try:
        # Get Gemini analysis
        prompt = generate_analysis_prompt(resume_text, job_desc, industry)
        response = model.generate_content(prompt)
        
        try:
            results = json.loads(response.text)
        except json.JSONDecodeError:
            start = response.text.find('{')
            end = response.text.rfind('}') + 1
            results = json.loads(response.text[start:end])

        # Calculate similarity
        similarity = similarity_checker.calculate_similarity(resume_text, job_desc)
        
        # Combined scoring (70% exact, 30% semantic)
        total_core = len(results.get('exact_matches', [])) + len(results.get('missing_core', []))
        exact_pct = (len(results.get('exact_matches', [])) / total_core * 70) if total_core else 0
        combined_score = min(100, exact_pct + (similarity['combined_score'] * 30))
        
        return {
            "analysis_method": "combined (gemini + cosine similarity)",
            "match_score": round(combined_score, 2),
            "matched_skills": results.get('exact_matches', []),
            "missing_core_skills": results.get('missing_core', []),
            "industry_analysis": results.get('industry_analysis', ""),
            "score_breakdown": {
                "exact_matches": len(results.get('exact_matches', [])),
                "cosine_similarity": {
                    "overall": round(similarity['overall_score'], 4),
                    "contribution": 30
                }
            },
            "version": "1.2"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "match_score": 0,
            "matched_skills": []
        }