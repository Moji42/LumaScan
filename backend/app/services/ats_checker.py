"""
ATS (Applicant Tracking System) compatibility checker.
Scores a resume against a job description and checks for ATS parse-ability.
"""

import re
from typing import Optional


# Standard ATS-recognized section headers
STANDARD_HEADERS = {
    "education", "experience", "work experience", "skills", "technical skills",
    "projects", "certifications", "summary", "objective", "achievements",
    "awards", "activities", "extracurricular", "publications", "volunteer",
    "languages", "interests",
}

# ATS-unfriendly patterns
BAD_PATTERNS = [
    (r'\btable\b', "Contains tables — ATS may misparse columns"),
    (r'[^\x00-\x7F]', "Non-ASCII characters detected — may not parse correctly"),
    (r'\|\s*\|', "Pipe-delimited formatting detected — use plain text"),
]

# Contact info patterns
CONTACT_PATTERNS = {
    "email": r'[\w.+-]+@[\w-]+\.[a-z]{2,}',
    "phone": r'(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})',
    "linkedin": r'linkedin\.com/in/',
}


def check_ats(resume_text: str, job_desc: str, matched_skills: list, missing_skills: list, match_score: float) -> dict:
    text_lower = resume_text.lower()

    # ── 1. Contact info (10 pts) ──────────────────────────────────────────────
    contact_score = 0
    contact_details = {}
    for key, pattern in CONTACT_PATTERNS.items():
        found = bool(re.search(pattern, resume_text, re.IGNORECASE))
        contact_details[key] = found
        if found:
            contact_score += 10 / len(CONTACT_PATTERNS)

    # ── 2. Standard section headers (15 pts) ─────────────────────────────────
    found_headers = []
    for header in STANDARD_HEADERS:
        if re.search(rf'\b{re.escape(header)}\b', text_lower):
            found_headers.append(header)
    header_score = min(15, len(found_headers) * 3)

    # ── 3. Keyword / skill match density (40 pts) ─────────────────────────────
    # Already computed by match service — use match_score as proxy
    keyword_score = match_score * 0.40

    # ── 4. Formatting cleanliness (20 pts) ────────────────────────────────────
    format_issues = []
    format_score = 20
    for pattern, msg in BAD_PATTERNS:
        if re.search(pattern, resume_text):
            format_issues.append(msg)
            format_score -= 5

    # Penalize very short resumes
    word_count = len(resume_text.split())
    if word_count < 200:
        format_issues.append(f"Resume is very short ({word_count} words) — ATS may rank it lower")
        format_score -= 5
    format_score = max(0, format_score)

    # ── 5. Quantifiable achievements (15 pts) ────────────────────────────────
    quantity_patterns = [
        r'\d+\s*%', r'\$\s*\d+', r'\d+\+?\s*(team|engineer|user|student|customer)',
        r'(led|managed|built|reduced|increased|improved|delivered|launched)',
    ]
    quant_hits = sum(1 for p in quantity_patterns if re.search(p, text_lower))
    quant_score = min(15, quant_hits * 3)

    # ── Total ─────────────────────────────────────────────────────────────────
    total = round(contact_score + header_score + keyword_score + format_score + quant_score)
    total = min(100, total)

    # ── Recommendations ───────────────────────────────────────────────────────
    recommendations = []

    if not contact_details.get("email"):
        recommendations.append("Add your email address — ATS requires it for contact parsing.")
    if not contact_details.get("phone"):
        recommendations.append("Add a phone number in a standard format (e.g. 602-460-8373).")
    if not contact_details.get("linkedin"):
        recommendations.append("Include your LinkedIn URL to improve professional visibility.")

    if len(found_headers) < 4:
        recommendations.append("Use standard section headers (Experience, Education, Skills, Projects) so ATS can categorize content.")

    if missing_skills:
        top_missing = missing_skills[:5]
        recommendations.append(f"Add these missing keywords from the job description: {', '.join(top_missing)}.")

    if format_issues:
        for issue in format_issues:
            recommendations.append(issue)

    if quant_hits < 2:
        recommendations.append("Add quantifiable achievements (e.g. 'Led a team of 6', 'Improved performance by 30%') to stand out.")

    if word_count < 300:
        recommendations.append("Expand your resume — 400–700 words is optimal for ATS and recruiters.")

    grade = (
        "Excellent" if total >= 85
        else "Good" if total >= 70
        else "Fair" if total >= 55
        else "Needs Work"
    )

    return {
        "ats_score": total,
        "grade": grade,
        "breakdown": {
            "contact_info": round(contact_score),
            "section_headers": round(header_score),
            "keyword_match": round(keyword_score),
            "formatting": round(format_score),
            "quantifiable_achievements": round(quant_score),
        },
        "contact_detected": contact_details,
        "sections_found": found_headers,
        "format_issues": format_issues,
        "recommendations": recommendations,
        "word_count": word_count,
    }
