import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

#print("GOOGLE_API_KEY:", os.getenv("GOOGLE_API_KEY"))

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def list_models():
    try:
        models = genai.list_models()
        if not models:
            print("No models found or empty response.")
        else:
            print("Available models:")
            for model in models:
                # Print just the model name safely
                print(f"- {model.name}")
    except Exception as e:
        print(f"Error listing models: {e}")



if __name__ == "__main__":
    list_models()
