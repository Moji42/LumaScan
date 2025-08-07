from flask import Blueprint, request, jsonify 
from app.services.parser import parse_pdf_text

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No resume uploaded"}), 400
    
    file = request.files['resume']
    try:
        text = parse_pdf_text(file)
        return jsonify({"resume_text": text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500