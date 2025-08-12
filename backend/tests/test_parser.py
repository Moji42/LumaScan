# backend/tests/test_parser.py
from app.services.parser import parse_pdf_text
import fitz

def test_parse_pdf_text(sample_pdf):
    with open(sample_pdf, 'rb') as f:
        text = parse_pdf_text(f)
        assert "John Doe" in text
        assert "Skills" in text