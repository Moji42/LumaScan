"""
Parses raw resume text into a structured ResumeEditorData-compatible dict
using the Groq LLM. Used when a new user uploads their resume.
"""

import json
import re
from app.services.gemini import generate_content


def parse_resume_to_structure(resume_text: str) -> dict:
    prompt = f"""You are a resume parsing expert. Extract structured data from the resume text below.

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{{
  "personal": {{
    "name": "<full name>",
    "phone": "<phone number or empty string>",
    "email": "<email or empty string>",
    "linkedin": "<linkedin url or empty string>"
  }},
  "education": [
    {{
      "degree": "<degree and major>",
      "institution": "<university name, city, state>",
      "college": "<school/college within university or empty string>",
      "graduation": "<graduation date or expected date>",
      "gpa": "<GPA or empty string>",
      "coursework": "<comma-separated relevant courses or empty string>"
    }}
  ],
  "skills": {{
    "languages": ["<programming language>"],
    "frameworks": ["<framework or library>"],
    "tools": ["<tool, platform, or technology>"],
    "databases": ["<database>"]
  }},
  "projects": [
    {{
      "title": "<project title>",
      "duration": "<date range or semester>",
      "keyHighlight": "<one-line description of what the project does>",
      "bullets": ["<achievement bullet>"]
    }}
  ],
  "experience": [
    {{
      "company": "<company name>",
      "location": "<city, state>",
      "position": "<job title>",
      "duration": "<date range>",
      "bullets": ["<responsibility or achievement>"]
    }}
  ],
  "activities": [
    {{
      "title": "<activity or organization name>",
      "duration": "<date range>",
      "keyHighlight": "<one-line summary>",
      "bullets": ["<achievement>"]
    }}
  ]
}}

Rules:
- Split skills carefully: languages = programming languages only, frameworks = libraries/frameworks,
  tools = platforms/tools/services, databases = databases only
- If a section has no content, use an empty array []
- All string values must be plain text (no LaTeX, no markdown)
- Bullet points should start with a strong action verb
- Keep all original content — do not summarize or drop information

Resume text:
---
{resume_text[:4000]}
---"""

    raw = generate_content(prompt)
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON object from response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
        else:
            raise ValueError("Could not parse LLM response as JSON")

    # Ensure all required keys exist with safe defaults
    data.setdefault("personal", {"name": "", "phone": "", "email": "", "linkedin": ""})
    data.setdefault("education", [])
    data.setdefault("skills", {"languages": [], "frameworks": [], "tools": [], "databases": []})
    data.setdefault("projects", [])
    data.setdefault("experience", [])
    data.setdefault("activities", [])

    return data
