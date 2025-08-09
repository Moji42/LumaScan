# backend/app/services/match.py
from app.services.gemini import model
from typing import List, Dict, Tuple
import re
import json
from collections import defaultdict

# Skill normalization database (could be moved to DB later)
SKILL_SYNONYMS = {
    'aws': 'amazon web services',
    'gcp': 'google cloud platform',
    'js': 'javascript',
    'ts': 'typescript',
    'ai': 'artificial intelligence',
    'ml': 'machine learning',
    'cloud platforms': 'cloud computing',
    'amazon s3': 'aws s3'
}

INDUSTRY_KEYWORDS = {
    'tech': ['programming', 'cloud', 'devops', 'agile', 'sdlc', 'cicd'],
    'finance': ['accounting', 'risk', 'excel', 'quantitative', 'modeling'],
    'healthcare': ['hipaa', 'fda', 'clinical', 'ehr', 'phr']
}

def normalize_skill(skill: str) -> str:
    """Standardize skill names with special handling for cloud/tech skills"""
    skill = skill.lower().strip()
    
    # Handle special cases first
    if 'aws' in skill and 's3' not in skill:
        return 'amazon web services'
    if skill in SKILL_SYNONYMS:
        return SKILL_SYNONYMS[skill]
    
    # Remove proficiency levels (e.g. "Python (advanced)" → "python")
    skill = re.sub(r'\(.*?\)', '', skill)
    
    return skill.strip()

def group_related_skills(skills: List[str]) -> Dict[str, List[str]]:
    """Group similar skills under canonical names"""
    groups = defaultdict(list)
    for skill in skills:
        normalized = normalize_skill(skill)
        groups[normalized].append(skill)
    return dict(groups)

def generate_analysis_prompt(resume_text: str, job_desc: str, industry: str = None) -> str:
    """Generate dynamic prompt with industry context"""
    industry_context = ""
    if industry:
        industry_context = (
            f"\nIndustry Context: The role is in {industry.lower()} industry. "
            f"Consider these key {industry.lower()} skills: {', '.join(INDUSTRY_KEYWORDS.get(industry.lower(), []))}"
        )
    
    return f"""
    Perform advanced resume-to-job matching with these rules:
    1. Strict matching for technical skills (85% similarity threshold)
    2. Conceptual matching for soft skills (e.g. debugging ≈ problem-solving)
    3. Cloud platforms should match specific providers
    4. Consider industry context where provided
    
    {industry_context}
    
    Resume Excerpt:
    {resume_text[:3000]}
    
    Job Description:
    {job_desc[:3000]}
    
    Return JSON with:
    - exact_matches: [{{job_skill, resume_skill, confidence}}]
    - related_matches: [{{job_skill, resume_skill, relation}}]
    - missing_core: [skills]
    - missing_secondary: [skills]
    - industry_analysis: str
    """

def calculate_match_metrics(results: Dict) -> Dict:
    """Calculate scores based on match results"""
    total_core = len(results.get('missing_core', [])) + len(results.get('exact_matches', []))
    exact_match_pct = len(results['exact_matches']) / total_core if total_core else 0
    related_match_pct = len(results['related_matches']) / (total_core + 1e-6)  # Avoid division by zero
    
    # Base score heavily weighted toward exact matches
    base_score = exact_match_pct * 80 + related_match_pct * 20
    
    # Industry adjustment (up to ±10 points)
    industry_keywords = INDUSTRY_KEYWORDS.get(results.get('industry', '').lower(), [])
    industry_boost = min(10, len([k for k in industry_keywords if k in results.get('resume_skills', '')]))
    
    final_score = min(100, base_score + industry_boost)
    
    return {
        'score': final_score,
        'breakdown': {
            'base_score': round(base_score, 1),
            'exact_matches': len(results['exact_matches']),
            'related_matches': len(results['related_matches']),
            'industry_boost': industry_boost
        }
    }

def compare_resume_and_job(resume_text: str, job_desc: str, industry: str = None) -> Dict:
    try:
        # Generate and parse the AI response
        prompt = generate_analysis_prompt(resume_text, job_desc, industry)
        response = model.generate_content(prompt)
        
        # Robust JSON parsing
        try:
            json_str = re.search(r'```json\n(.*?)\n```', response.text, re.DOTALL)
            results = json.loads(json_str.group(1) if json_str else response.text)
        except json.JSONDecodeError:
            start = max(response.text.find('{'), 0)
            end = max(response.text.rfind('}') + 1, 1)
            results = json.loads(response.text[start:end])
        
        # Calculate metrics
        metrics = calculate_match_metrics(results)
        
        # Prepare matched skills output
        matched_skills = [
            f"{m['job_skill']} → {m['resume_skill']}" 
            for m in results.get('exact_matches', [])
        ]
        related_skills = [
            f"{m['job_skill']} (~{m['relation']}) → {m['resume_skill']}" 
            for m in results.get('related_matches', [])
        ]
        
        return {
            "match_score": metrics['score'],
            "matched_skills": matched_skills + related_skills,
            "missing_core_skills": results.get('missing_core', []),
            "missing_secondary_skills": results.get('missing_secondary', []),
            "industry_analysis": results.get('industry_analysis', 
                f"No industry analysis performed for {industry}" if industry 
                else "No industry specified"),
            "score_breakdown": metrics['breakdown'],
            "warnings": results.get('warnings', [])
        }
        
    except Exception as e:
        return {
            "error": f"Analysis failed: {str(e)}",
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "industry_analysis": ""
        }