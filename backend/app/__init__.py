# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

def create_app():
    load_dotenv()  # Load from .env
    app = Flask(__name__)
    CORS(app)

    # Register blueprints here later
    @app.route("/health")
    def health_check():
        return {"status": "Backend is running 🎉"}

    return app
