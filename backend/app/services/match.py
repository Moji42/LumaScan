from app.services.gemini import extract_skills

def compare_resume_and_job(resume_text, job_desc_text):
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_desc_text)

    matched_skills = list(set(resume_skills) & set(job_skills))
    missing_skills = list(set(job_skills) - set(resume_skills))
    extra_skills = list(set(resume_skills) - set(job_skills))

    match_score = round(len(matched_skills) / len(job_skills) * 100, 2) if job_skills else 0

    return {
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "extra_skills": extra_skills
    }
