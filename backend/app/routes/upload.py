# backend/app/routes/upload.py
from flask import Blueprint, request, jsonify 
from app.services.parser import parse_pdf_text
from app.services.gemini import extract_skills

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume uploaded"}), 400
    
    file = request.files['resume']
    try:
        text = parse_pdf_text(file)
        skills = extract_skills(text)  # Extract skills from the resume text
        return jsonify({
            "resume_text": text,
            "skills": skills  # Include skills in the response
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 
