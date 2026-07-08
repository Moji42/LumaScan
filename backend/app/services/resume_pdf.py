"""
Generates a PDF resume using ReportLab, faithfully matching the
resume.cls / resume.tex layout (Vignesh Iyer ASU Sparky Sundevil template).

Layout reference:
  - 8pt Helvetica (sans-serif), 0.5 in margins
  - Name: HUGE UPPERCASE BOLD centered, full-width hrule below
  - Contact: phone  bullet  email  bullet  linkedin  (centered)
  - Section titles: UPPERCASE BOLD + thin hrule
  - Education: degree (bold) | "Graduating <date>"
                university   | GPA
                college
                Relevant coursework: ...
  - Skills:   **Category:** skills
  - Projects: **Title**  |  duration
              keyHighlight
              bullet list
  - Experience: **Company, Location: Position**  |  duration
                bullet list
"""

import json
import os
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
)
from reportlab.lib.colors import black, HexColor

DATA_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../resume/resume_data.json")
)

GRAY  = HexColor("#555555")
LGRAY = HexColor("#aaaaaa")

# ── Safe text: strip/replace all non-Latin-1 to avoid font glyph gaps ────────
def _safe(text: str) -> str:
    """Replace problem chars so Helvetica renders them correctly."""
    replacements = {
        "–": "-",   # en dash
        "—": "-",   # em dash
        "‘": "'",   # left single quote
        "’": "'",   # right single quote
        "“": '"',   # left double quote
        "”": '"',   # right double quote
        "•": "*",   # bullet
        " ": " ",   # non-breaking space
        "--": " - ",     # LaTeX double-dash
        "\\$": "$",
        "\\#": "#",
        "\\%": "%",
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Final safety: drop anything above Latin-1
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _bold_safe(text: str) -> str:
    """Like _safe but wraps in <b>…</b> (for Paragraph XML)."""
    return f"<b>{_safe(text)}</b>"


# ── Styles ────────────────────────────────────────────────────────────────────
def _styles():
    base = dict(fontName="Helvetica", fontSize=8, leading=10.5, textColor=black)

    name_s = ParagraphStyle("Name",
        fontName="Helvetica-Bold", fontSize=18, leading=22,
        textColor=black, alignment=TA_CENTER, spaceAfter=1,
        letterSpacing=1.5,
    )
    contact_s = ParagraphStyle("Contact",
        **{**base, "alignment": TA_CENTER, "spaceAfter": 3},
    )
    section_s = ParagraphStyle("Section",
        fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        textColor=black, spaceBefore=6, spaceAfter=1, letterSpacing=0.6,
    )
    entry_title_s = ParagraphStyle("EntryTitle",
        **{**base, "fontName": "Helvetica-Bold", "fontSize": 8.5, "leading": 11,
           "spaceBefore": 4, "spaceAfter": 0},
    )
    sub_s = ParagraphStyle("Sub",
        **{**base, "textColor": GRAY, "spaceAfter": 1},
    )
    body_s = ParagraphStyle("Body",
        **{**base, "spaceAfter": 1},
    )
    bullet_s = ParagraphStyle("Bullet",
        **{**base, "leftIndent": 10, "spaceAfter": 1},
    )
    return name_s, contact_s, section_s, entry_title_s, sub_s, body_s, bullet_s


def _hrule(thick=0.5, before=1, after=3):
    return HRFlowable(width="100%", thickness=thick, color=black,
                      spaceBefore=before, spaceAfter=after)


def _section_title(text, s):
    return Paragraph(_safe(text).upper(), s)


def _two_col(left_html: str, right_text: str, style) -> Paragraph:
    """Bold left, right-aligned date — simulated with wide spacer trick."""
    right = _safe(right_text)
    return Paragraph(
        f'{left_html}<font color="#888888">&nbsp;&nbsp;&nbsp;{right}</font>',
        style,
    )


def generate_resume_pdf(data: dict, summary: str = "") -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=0.5 * inch, rightMargin=0.5 * inch,
        topMargin=0.4 * inch, bottomMargin=0.4 * inch,
    )

    s_name, s_contact, s_section, s_etitle, s_sub, s_body, s_bullet = _styles()
    story = []
    p = data["personal"]

    # ── NAME ──────────────────────────────────────────────────────────────────
    story.append(Paragraph(_safe(p["name"]).upper(), s_name))
    story.append(_hrule(thick=0.8, before=1, after=2))

    # ── CONTACT ───────────────────────────────────────────────────────────────
    bullet = "  •  "
    contact = _safe(p["phone"]) + bullet + _safe(p["email"]) + bullet + _safe(p["linkedin"])
    story.append(Paragraph(contact, s_contact))

    # ── EDUCATION ─────────────────────────────────────────────────────────────
    story.append(_section_title("Education", s_section))
    story.append(_hrule())
    for e in data["education"]:
        story.append(_two_col(
            f"<b>{_safe(e['degree'])}</b>",
            f"Graduating {e['graduation']}",
            s_etitle,
        ))
        story.append(_two_col(
            _safe(e["institution"]),
            e["gpa"] + " GPA",
            s_body,
        ))
        story.append(Paragraph(_safe(e.get("college", "")), s_sub))
        story.append(Paragraph(
            f"<b>Relevant coursework:</b> {_safe(e['coursework'])}", s_body
        ))

    # ── TECHNICAL SKILLS ──────────────────────────────────────────────────────
    story.append(_section_title("Technical Skills", s_section))
    story.append(_hrule())

    skill_rows = [
        ("Programming Languages", ", ".join(data["skills"].get("languages", []))),
        ("Frameworks & Libraries", ", ".join(data["skills"].get("frameworks", []))),
        ("Tools & Technologies",   ", ".join(data["skills"].get("tools", []))),
        ("Databases",              ", ".join(data["skills"].get("databases", []))),
    ]
    for cat, vals in skill_rows:
        if vals:
            story.append(Paragraph(f"<b>{_safe(cat)}:</b> {_safe(vals)}", s_body))

    # ── TECHNICAL PROJECTS ────────────────────────────────────────────────────
    story.append(_section_title("Technical Projects", s_section))
    story.append(_hrule())

    for proj in data["projects"]:
        story.append(_two_col(
            f"<b>{_safe(proj['title'])}</b>",
            proj["duration"],
            s_etitle,
        ))
        story.append(Paragraph(_safe(proj.get("keyHighlight", "")), s_sub))
        for b in proj["bullets"]:
            story.append(Paragraph(f"- {_safe(b)}", s_bullet))

    # ── WORK EXPERIENCE ───────────────────────────────────────────────────────
    story.append(_section_title("Work Experience", s_section))
    story.append(_hrule())

    for exp in data["experience"]:
        left = f"<b>{_safe(exp['company'])}, {_safe(exp['location'])}: {_safe(exp['position'])}</b>"
        story.append(_two_col(left, exp["duration"], s_etitle))
        for b in exp["bullets"]:
            story.append(Paragraph(f"- {_safe(b)}", s_bullet))

    # ── EXTRACURRICULAR ACTIVITIES ────────────────────────────────────────────
    story.append(_section_title("Extracurricular Activities", s_section))
    story.append(_hrule())

    for act in data["activities"]:
        story.append(_two_col(
            f"<b>{_safe(act['title'])}</b>",
            act["duration"],
            s_etitle,
        ))
        if act.get("keyHighlight"):
            story.append(Paragraph(_safe(act["keyHighlight"]), s_sub))
        for b in act["bullets"]:
            story.append(Paragraph(f"- {_safe(b)}", s_bullet))

    doc.build(story)
    buf.seek(0)
    return buf


def build_pdf_from_file() -> BytesIO:
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"resume_data.json not found at {DATA_FILE}")
    with open(DATA_FILE) as f:
        data = json.load(f)
    return generate_resume_pdf(data)
