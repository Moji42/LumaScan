from flask import Blueprint, request, send_file, jsonify
from io import BytesIO
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
import fitz  # PyMuPDF

from app.services.gemini import rewrite_resume_gemini

generate_bp = Blueprint('generate', __name__)

# Extract text from PDF using PyMuPDF
def extract_text_from_pdf(pdf_file):
    doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# Generate styled PDF
def create_resume_pdf(text):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=LETTER,
                            rightMargin=40, leftMargin=40,
                            topMargin=60, bottomMargin=40)

    styles = getSampleStyleSheet()
    custom_styles = {
        'heading': ParagraphStyle(
            'Heading',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#333333"),
            spaceAfter=20
        ),
        'body': ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            spaceAfter=10
        ),
        'bold': ParagraphStyle(
            'Bold',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
    }

    content = []
    lines = text.strip().split("\n")
    for line in lines:
        if line.strip() == "":
            continue
        elif line.strip().isupper():
            content.append(Paragraph(f"<b>{line.strip()}</b>", custom_styles['heading']))
        elif ":" in line:
            label, value = line.split(":", 1)
            content.append(Paragraph(f"<b>{label.strip()}:</b> {value.strip()}", custom_styles['body']))
        else:
            content.append(Paragraph(line.strip(), custom_styles['body']))

        content.append(Spacer(1, 8))

    doc.build(content)
    buffer.seek(0)
    return buffer

# Rewrite Resume Route
@generate_bp.route('/rewrite_resume', methods=['POST'])
def rewrite_resume():
    try:
        if 'resume' not in request.files or 'job_description' not in request.form:
            return jsonify({"error": "PDF resume file and job description are required."}), 400

        pdf_file = request.files['resume']
        job_description = request.form['job_description']

        # Step 1: Extract text
        resume_text = extract_text_from_pdf(pdf_file)
        print("📄 Extracted resume text:")
        print(resume_text[:500])  # Print first 500 chars

        if not resume_text.strip():
            return jsonify({"error": "Resume text extraction failed. PDF may be empty or not selectable."}), 400

        # Step 2: Rewrite resume using Gemini
        rewritten_text = rewrite_resume_gemini(resume_text, job_description)
        print("✍️ Rewritten resume from Gemini:")
        print(rewritten_text[:500])  # Print first 500 chars

        if not rewritten_text.strip():
            return jsonify({"error": "Gemini did not return a rewritten resume."}), 500

        # Step 3: Generate PDF
        pdf_buffer = create_resume_pdf(rewritten_text)

        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name="Rewritten_Resume.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print("❌ Exception occurred in /rewrite_resume:", str(e))
        return jsonify({"error": str(e)}), 500
