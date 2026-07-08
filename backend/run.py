import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.routes.upload import upload_bp
from app.routes.scan import scan_bp
from app.routes.resume import resume_bp

def create_app():
    app = Flask(__name__)

    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    CORS(app, origins=allowed_origins)

    @app.route('/')
    def home():
        return jsonify({"status": "running", "message": "LumaScan API is working"})

    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(resume_bp)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)