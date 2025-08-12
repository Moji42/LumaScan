# backend/app/routes/scan.py
from flask import Blueprint, request, jsonify
from app.services.match import compare_resume_and_job

scan_bp = Blueprint('scan', __name__)

@scan_bp.route('/match', methods=['POST'])
def match_job():
    data = request.json
    resume = data.get('resume_text')
    job = data.get('job_desc')
    industry = data.get('industry')

    if not resume or not job:
        return jsonify({"error": "Missing fields"}), 400

    try:
        result = compare_resume_and_job(resume, job, industry)
        return jsonify({
            **result,
            "analysis_method": "combined (gemini + cosine similarity)",
            "version": "1.1"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
