"""
api_server.py
Flask API to expose AADHYA prediction pipeline
"""
from flask import Flask, jsonify, request
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.prediction_pipeline import run_pipeline

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "AADHYA Hospital AI"})

@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    Reads context_snapshot.json and returns advisory
    """
    try:
        advisory = run_pipeline()
        return jsonify(advisory)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/advisory', methods=['GET'])
def get_advisory():
    """
    Get the latest advisory (cached from last run)
    """
    try:
        import json
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        advisory_path = os.path.join(BASE_DIR, 'output', 'advisory.json')
        
        with open(advisory_path, 'r') as f:
            advisory = json.load(f)
        
        return jsonify(advisory)
    except Exception as e:
        return jsonify({"error": "No advisory available. Run /predict first."}), 404

if __name__ == '__main__':
    print("🚀 Starting AADHYA API Server...")
    print("📍 Endpoints:")
    print("  - GET  /health   - Health check")
    print("  - POST /predict  - Run prediction pipeline")
    print("  - GET  /advisory - Get latest advisory")
    app.run(host='0.0.0.0', port=5000, debug=True)
