import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv(dotenv_path=env_path)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


model = genai.GenerativeModel("models/gemini-2.5-pro")

def extract_skills(text, prompt_prefix="Extract relevant technical and soft skills"):
    prompt = f"{prompt_prefix} from the following text:\n\n{text}\n\nReturn as a comma-separated list."
    response = model.generate_content(prompt)
    skills = response.text.strip().replace("\n", "").split(",")
    return [s.strip().lower() for s in skills if s.strip()]
