# backend/run.py
from flask import Flask
from flask_cors import CORS
from app.routes.upload import upload_bp
from app.routes.scan import scan_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(upload_bp)
    app.register_blueprint(scan_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
