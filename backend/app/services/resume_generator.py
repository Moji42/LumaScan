"""
End-to-end tailored resume pipeline:
  1. Load resume_data.json
  2. Ask Groq LLM which projects + skills best match the job description
  3. Reorder / filter content for that specific job
  4. Generate PDF (matching resume.cls style)
  5. Run ATS check
"""

import json
import os
import re

from app.services.gemini import generate_content
from app.services.ats_checker import check_ats
from app.services.resume_pdf import generate_resume_pdf

DATA_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../resume/resume_data.json")
)


def _load_data() -> dict:
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError("resume_data.json not found")
    with open(DATA_FILE) as f:
        return json.load(f)


def _tailor_with_llm(data: dict, job_desc: str) -> dict:
    """Ask the LLM to pick and reorder projects/skills for this job."""
    project_list = "\n".join(
        f"  - {p['title']}: {p.get('keyHighlight', '')}. {'; '.join(p['bullets'][:1])}"
        for p in data["projects"]
    )
    all_skills = (
        data["skills"].get("languages", []) +
        data["skills"].get("frameworks", []) +
        data["skills"].get("tools", [])
    )

    prompt = f"""You are a professional resume writer and ATS optimization expert.

Given this job description:
---
{job_desc[:3000]}
---

Candidate's available projects:
{project_list}

Available skills: {', '.join(all_skills)}

Return ONLY valid JSON (no markdown fences, no explanation):
{{
  "selected_project_titles": ["<title1>", "<title2>", "<title3>"],
  "top_languages": ["<lang1>", "...up to 8"],
  "top_frameworks": ["<fw1>", "...up to 8"],
  "top_tools": ["<tool1>", "...up to 8"]
}}

Rules:
- selected_project_titles must be a subset of provided titles, ordered most-relevant-first, max 4
- top_languages/top_frameworks/top_tools must be subsets of the provided lists, ordered most-relevant-first
"""

    raw = generate_content(prompt)
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        llm = json.loads(raw)
    except json.JSONDecodeError:
        return data  # fallback: keep original order

    import copy
    tailored = copy.deepcopy(data)

    # Reorder projects
    title_map = {p["title"].lower(): p for p in data["projects"]}
    selected = []
    for t in llm.get("selected_project_titles", []):
        match = next(
            (v for k, v in title_map.items()
             if t.lower() in k or k in t.lower()),
            None,
        )
        if match and match not in selected:
            selected.append(match)
    # Append anything not chosen (so JSON stays complete)
    for p in data["projects"]:
        if p not in selected:
            selected.append(p)
    tailored["projects"] = selected

    def _reorder(orig_list: list, llm_list: list) -> list:
        lower_map = {s.lower(): s for s in orig_list}
        seen = set()
        result = []
        for s in llm_list:
            key = s.lower()
            if key in lower_map and key not in seen:
                result.append(lower_map[key])
                seen.add(key)
        for s in orig_list:
            if s.lower() not in seen:
                result.append(s)
        return result

    tailored["skills"]["languages"] = _reorder(
        data["skills"].get("languages", []), llm.get("top_languages", [])
    )
    tailored["skills"]["frameworks"] = _reorder(
        data["skills"].get("frameworks", []), llm.get("top_frameworks", [])
    )
    tailored["skills"]["tools"] = _reorder(
        data["skills"].get("tools", []), llm.get("top_tools", [])
    )

    tailored["_selected_titles"] = [p["title"] for p in selected[:4]]
    return tailored


def _build_plain_text(data: dict) -> str:
    lines = [
        data["personal"]["name"],
        f'{data["personal"]["phone"]} | {data["personal"]["email"]} | {data["personal"]["linkedin"]}',
        "", "EDUCATION",
        *[f'{e["degree"]} | GPA: {e["gpa"]} | {e["graduation"]} | {e["institution"]}' for e in data["education"]],
        "", "TECHNICAL SKILLS",
        f'Languages: {", ".join(data["skills"].get("languages", []))}',
        f'Frameworks: {", ".join(data["skills"].get("frameworks", []))}',
        f'Tools: {", ".join(data["skills"].get("tools", []))}',
        "", "TECHNICAL PROJECTS",
        *[line for p in data["projects"]
          for line in [p["title"], p["duration"], p.get("keyHighlight", "")]
          + [f'- {b}' for b in p["bullets"]]],
        "", "WORK EXPERIENCE",
        *[line for e in data["experience"]
          for line in [f'{e["position"]} | {e["company"]}', e["duration"]]
          + [f'- {b}' for b in e["bullets"]]],
        "", "EXTRACURRICULAR ACTIVITIES",
        *[line for a in data["activities"]
          for line in [a["title"], a["duration"], a.get("keyHighlight", "")]
          + [f'- {b}' for b in a["bullets"]]],
    ]
    return "\n".join(lines)


def run_pipeline(resume_text: str, job_desc: str, industry: str = "",
                  user_data: dict = None) -> dict:
    from app.services.match import compare_resume_and_job

    # 1. Use user-provided data, or fall back to stored resume_data.json
    data = user_data if user_data else _load_data()

    # 2. Match score
    match_result = compare_resume_and_job(resume_text, job_desc, industry or None)

    # 3. Tailor
    tailored = _tailor_with_llm(data, job_desc)

    # 4. Generate PDF (top 4 projects only)
    import copy
    pdf_data = copy.deepcopy(tailored)
    pdf_data["projects"] = tailored["projects"][:4]
    pdf_buf = generate_resume_pdf(pdf_data)

    # 5. ATS check
    plain_text = _build_plain_text(tailored)
    ats_result = check_ats(
        plain_text,
        job_desc,
        match_result.get("matched_skills", []),
        match_result.get("missing_core_skills", []),
        match_result.get("match_score", 0),
    )

    # Clean internal keys before returning to frontend
    export_data = copy.deepcopy(pdf_data)
    export_data.pop("_selected_titles", None)

    return {
        "pdf_bytes": pdf_buf.read(),
        "ats_result": ats_result,
        "match_result": match_result,
        "selected_projects": tailored.get("_selected_titles", []),
        "tailored_data": export_data,
    }
