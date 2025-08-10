import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load .env variables 
load_dotenv()

# Configure Gemini API key
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY is not set in your environment variables")

genai.configure(api_key=api_key)

# Chose a valid model
model_name = "models/gemini-2.5-pro"

model = genai.GenerativeModel(model_name)

def test_generate_content():
    prompt = "Say hello to Moji"
    response = model.generate_content(prompt)
    print("Model response:", response.text)

if __name__ == "__main__":
    test_generate_content()
