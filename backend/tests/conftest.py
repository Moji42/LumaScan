# backend/tests/conftest.py
import pytest
from backend.app import create_app
import os
import tempfile

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def sample_pdf():
    # Create a simple PDF for testing
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "John Doe\nSkills: Python, Flask, Machine Learning")
    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    doc.save(temp_pdf.name)
    doc.close()
    yield temp_pdf.name
    os.unlink(temp_pdf.name)