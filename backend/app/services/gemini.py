# backend/app/services/gemini.py
from groq import Groq
import os
from dotenv import load_dotenv

# Load .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv(dotenv_path=env_path)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

def generate_content(prompt: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

def extract_skills(text, prompt_prefix="Extract all relevant technical and soft skills"):
    prompt = f"""{prompt_prefix} from the following resume text.
    Include programming languages, frameworks, tools, methodologies, and soft skills.
    Return as a comma-separated list only, no explanation.

    Text:
    {text}"""

    result = generate_content(prompt)
    skills = result.strip().replace("\n", "").split(",")
    return [s.strip().lower() for s in skills if s.strip()]
