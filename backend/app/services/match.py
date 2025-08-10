from app.services.gemini import model
from typing import List, Dict
import re
import json
from app.services.similarity import similarity_checker

# Enhanced Skill Normalization
SKILL_SYNONYMS = {
    'aws': 'amazon web services',
    'gcp': 'google cloud platform',
    'js': 'javascript',
    'ts': 'typescript',
    'next.js': 'react',
    'flask': 'python',
    's3': 'aws',
    'lambda': 'serverless',
    'ec2': 'aws',
    'vercel': 'cloud deployment',
    'render': 'cloud deployment',
    'scikit-learn': 'machine learning',
    'tf': 'tensorflow',
    'tfjs': 'tensorflow',
    'tensorflow.js': 'tensorflow',  
    'celery': 'cloud services',     
    'redis': 'cloud services'       
}
# Experience Level Keywords
SENIOR_KEYWORDS = [
    'senior', 'lead', 'principal', 'architect',
    '5+', '5 years', '7+', '10+', 'manager'
]

def normalize_skill(skill: str) -> str:
    """Enhanced normalization with expanded synonyms"""
    skill = skill.lower().strip()
    skill = re.sub(r'\(.*?\)', '', skill)  # Remove proficiency levels
    return SKILL_SYNONYMS.get(skill, skill)

def detect_experience_level(job_desc: str) -> str:
    """Automatically detect junior/senior roles"""
    jd_lower = job_desc.lower()
    return 'senior' if any(kw in jd_lower for kw in SENIOR_KEYWORDS) else 'junior'

def generate_analysis_prompt(resume_text: str, job_desc: str, industry: str = None) -> str:
    """Enhanced prompt with experience level awareness"""
    exp_level = detect_experience_level(job_desc)
    level_context = f"\nRole Level: {exp_level.capitalize()} position"
    
    industry_context = f"\nIndustry: {industry.capitalize()}" if industry else ""
    
    return f"""
    Analyze resume-job match considering:
    1. Required experience level ({exp_level})
    2. Core technical skills
    3. Industry expectations ({industry})
    
    {level_context}
    {industry_context}
    
    Resume Excerpt:
    {resume_text[:2000]}
    
    Job Description:
    {job_desc[:2000]}
    
    Return JSON with:
    - exact_matches: [{{"job_skill": str, "resume_skill": str}}]
    - missing_core: [skills]
    - industry_analysis: str
    """

def compare_resume_and_job(resume_text: str, job_desc: str, industry: str = None) -> Dict:
    """
    Compare a resume against a job description with enhanced matching logic.
    
    Args:
        resume_text: Text content of the resume
        job_desc: Job description text
        industry: Optional industry context
        
    Returns:
        Dictionary containing match results with structure:
        {
            "analysis_method": str,
            "match_score": float,
            "matched_skills": List[str],
            "missing_core_skills": List[str],
            "industry_analysis": str,
            "experience_level": str,
            "score_breakdown": Dict,
            "version": str
        }
    """
    # Initialize default response structure
    default_response = {
        "analysis_method": "combined (gemini + cosine similarity)",
        "match_score": 0.0,
        "matched_skills": [],
        "missing_core_skills": [],
        "industry_analysis": "",
        "experience_level": "junior",
        "score_breakdown": {
            "exact_matches": 0,
            "cosine_similarity": {
                "overall": 0.0,
                "skills": 0.0,
                "contribution": 40
            }
        },
        "version": "1.2"
    }

    try:
        # Step 1: Get structured analysis from Gemini
        prompt = generate_analysis_prompt(resume_text, job_desc, industry)
        response = model.generate_content(prompt)
        
        # Step 2: Parse Gemini response with robust error handling
        try:
            results = json.loads(response.text)
        except json.JSONDecodeError:
            # Fallback parsing if response isn't clean JSON
            try:
                start = max(response.text.find('{'), 0)
                end = max(response.text.rfind('}') + 1, 1)
                results = json.loads(response.text[start:end])
            except:
                results = {
                    "exact_matches": [],
                    "missing_core": [],
                    "industry_analysis": "Analysis unavailable"
                }

        # Step 3: Calculate semantic similarity
        similarity_results = similarity_checker.calculate_similarity(resume_text, job_desc)
        
        # Step 4: Calculate scores with enhanced logic
        total_core_skills = len(results.get("exact_matches", [])) + len(results.get("missing_core", []))
        
        # Base score (60% weight)
        exact_match_score = 0
        if total_core_skills > 0:
            exact_match_score = (len(results.get("exact_matches", [])) / total_core_skills) * 60
        
        # Similarity score (40% weight)
        similarity_score = similarity_results["combined_score"] * 40
        
        # Combined score with junior tech boost
        combined_score = min(100.0, exact_match_score + similarity_score)
        if industry and industry.lower() == "tech" and detect_experience_level(job_desc) == "junior":
            combined_score = min(100.0, combined_score * 1.1)  # 10% boost for junior tech roles

        # Step 5: Prepare matched skills output
        matched_skills = [
            f"{m.get('job_skill', '?')} → {m.get('resume_skill', '?')}"
            for m in results.get("exact_matches", [])
        ]

        # Step 6: Compile final response
        return {
            **default_response,
            "match_score": round(combined_score, 2),
            "matched_skills": matched_skills,
            "missing_core_skills": results.get("missing_core", []),
            "industry_analysis": results.get("industry_analysis", ""),
            "experience_level": detect_experience_level(job_desc),
            "score_breakdown": {
                "exact_matches": len(results.get("exact_matches", [])),
                "cosine_similarity": {
                    "overall": round(similarity_results["overall_score"], 4),
                    "skills": round(similarity_results["skill_similarity"], 4),
                    "contribution": 40
                }
            }
        }

    except Exception as e:
        return {
            **default_response,
            "error": f"Analysis failed: {str(e)}",
            "industry_analysis": "System error during analysis"
        }