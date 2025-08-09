# backend/tests/test_upload.py
import pytest
from unittest.mock import patch, MagicMock

def test_upload_resume_success(client, sample_pdf):
    with open(sample_pdf, 'rb') as f:
        # Mock the Gemini response
        mock_response = MagicMock()
        mock_response.text = 'python, flask, machine learning'
        
        with patch('google.generativeai.GenerativeModel.generate_content', return_value=mock_response):
            response = client.post('/upload', data={
                'resume': (f, 'test.pdf')
            }, content_type='multipart/form-data')
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'resume_text' in data
            assert 'skills' in data
            assert isinstance(data['skills'], list)
            assert 'python' in data['skills']

def test_upload_no_file(client):
    response = client.post('/upload')
    assert response.status_code == 400
    assert 'error' in response.get_json()