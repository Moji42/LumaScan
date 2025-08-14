from flask import Flask, jsonify
from flask_cors import CORS
from app.routes.upload import upload_bp
from app.routes.scan import scan_bp
from app.routes.generate import generate_bp

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes

    @app.route('/')
    def home():
        return jsonify({"status": "running", "message": "LumaScan API is working"})

    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(generate_bp, url_prefix='/api')

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)  # Allow external connections