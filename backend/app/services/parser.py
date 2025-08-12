# backend/app/services/parser.py
import fitz

def parse_pdf_text(file):
    doc = fitz.open(stream=file.read(),filetype="pdf")
    text = ""
    for page in doc:
        text+= page.get_text()
    return text.strip()

