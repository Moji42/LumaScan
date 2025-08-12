# backend/tests/test_gemini.py
from app.services.gemini import extract_skills
from unittest.mock import patch

def test_extract_skills():
    test_text = "Experienced in Python, Flask, and Machine Learning. Strong teamwork skills."
    
    # Mock the Gemini response
    mock_response = type('obj', (object,), {
        'text': 'python, flask, machine learning, teamwork'
    })
    
    with patch('google.generativeai.GenerativeModel.generate_content', return_value=mock_response):
        skills = extract_skills(test_text)
        assert isinstance(skills, list)
        assert len(skills) == 4
        assert 'python' in skills
        assert 'teamwork' in skills