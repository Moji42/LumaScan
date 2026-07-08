"""
Routes for resume builder:
  GET  /api/resume/data          — return stored resume_data.json
  POST /api/resume/ats-check     — ATS analysis only
  GET  /api/resume/download      — generate generic PDF from resume_data.json
  POST /api/resume/generate      — full pipeline: match + tailor + PDF + ATS
"""

import os
import json
import base64
from flask import Blueprint, jsonify, send_file, request

from app.services.ats_checker import check_ats
from app.services.resume_pdf import build_pdf_from_file
from app.services.resume_generator import run_pipeline

resume_bp = Blueprint("resume", __name__)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../resume"))
DATA_FILE = os.path.join(ROOT, "resume_data.json")


@resume_bp.route("/api/resume/data", methods=["GET"])
def get_resume_data():
    if not os.path.exists(DATA_FILE):
        return jsonify({"error": "resume_data.json not found"}), 404
    with open(DATA_FILE) as f:
        data = json.load(f)
    return jsonify(data)


@resume_bp.route("/api/resume/data", methods=["PUT"])
def save_resume_data():
    """Persist edited master resume data back to resume_data.json."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resume_bp.route("/api/resume/ats-check", methods=["POST"])
def ats_check():
    body = request.get_json(silent=True) or {}
    resume_text = body.get("resume_text", "")
    job_desc = body.get("job_desc", "")
    match_score = float(body.get("match_score", 0))
    matched_skills = body.get("matched_skills", [])
    missing_skills = body.get("missing_skills", [])

    if not resume_text or not job_desc:
        return jsonify({"error": "resume_text and job_desc are required"}), 400

    result = check_ats(resume_text, job_desc, matched_skills, missing_skills, match_score)
    return jsonify(result)


@resume_bp.route("/api/resume/download", methods=["GET"])
def download_resume():
    """Generic PDF — not tailored to any job."""
    try:
        buf = build_pdf_from_file()
        return send_file(buf, mimetype="application/pdf", as_attachment=True,
                         download_name="Yusuf_Mohamed_Resume.pdf")
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500


@resume_bp.route("/api/resume/generate", methods=["POST"])
def generate_tailored():
    """
    Full pipeline:
      1. Run match analysis between uploaded resume_text and job_desc
      2. LLM picks + reorders most relevant projects/skills
      3. Generates tailored PDF
      4. Runs ATS check
    Returns JSON with pdf_b64, match_result, ats_result, selected_projects, summary.
    """
    body = request.get_json(silent=True) or {}
    resume_text = body.get("resume_text", "")
    job_desc = body.get("job_desc", "")
    industry = body.get("industry", "")
    user_data = body.get("user_data", None)  # structured resume data from frontend

    if not resume_text:
        return jsonify({"error": "resume_text is required"}), 400
    if not job_desc:
        return jsonify({"error": "job_desc is required"}), 400

    try:
        result = run_pipeline(resume_text, job_desc, industry, user_data=user_data)
        pdf_b64 = base64.b64encode(result["pdf_bytes"]).decode("utf-8")

        return jsonify({
            "pdf_b64": pdf_b64,
            "match_result": result["match_result"],
            "ats_result": result["ats_result"],
            "selected_projects": result["selected_projects"],
            "tailored_data": result["tailored_data"],
        })
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Pipeline failed: {str(e)}"}), 500


@resume_bp.route("/api/resume/render", methods=["POST"])
def render_custom():
    """
    Re-render a PDF from arbitrary resume data (used by the editor).
    Body: { data: <resume data object>, summary: <string> }
    Returns: { pdf_b64: <base64 string> }
    """
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not data:
        return jsonify({"error": "data is required"}), 400

    try:
        from app.services.resume_pdf import generate_resume_pdf
        buf = generate_resume_pdf(data)
        pdf_b64 = base64.b64encode(buf.read()).decode("utf-8")
        return jsonify({"pdf_b64": pdf_b64})
    except Exception as e:
        return jsonify({"error": f"Render failed: {str(e)}"}), 500
