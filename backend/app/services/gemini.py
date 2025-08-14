# backend/app/services/gemini.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv(dotenv_path=env_path)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


model = genai.GenerativeModel("models/gemini-2.5-pro")

def extract_skills(text, prompt_prefix="Extract all relevant technical and soft skills"):
    prompt = f"""{prompt_prefix} from the following resume text. 
    Include programming languages, frameworks, tools, methodologies, and soft skills.
    Return as a comma-separated list.
    
    Text:
    {text}"""
    
    response = model.generate_content(prompt)
    skills = response.text.strip().replace("\n", "").split(",")
    # Clean up the skills list
    return [s.strip().lower() for s in skills if s.strip()]

def rewrite_resume_gemini(resume_text, job_description):
    prompt = f"""
    Rewrite the following resume so that it is more tailored to this job description.

    Resume:
    {resume_text}

    Job Description:
    {job_description}

    Return a polished and well-formatted resume in plain text.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_cover_letter_gemini(resume_text, job_description):
    prompt = f"""
    Using the resume and job description below, write a professional cover letter targeted to this role.
    
    Resume:
    {resume_text}

    Job Description:
    {job_description}

    The cover letter should be enthusiastic, tailored, and highlight relevant skills. Use a clear structure with greeting, intro, body, and closing.
    """
    response = model.generate_content(prompt)
    return response.text.strip()
