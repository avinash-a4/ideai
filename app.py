import os
import json
import re
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is missing. Ensure it is set in the .env file.")
else:
    print("SUCCESS: GEMINI_API_KEY loaded successfully.")
    genai.configure(api_key=GEMINI_API_KEY)

    SELECTED_MODEL = "gemini-pro"
    try:
        models = genai.list_models()
        print("Available models:")
        for m in models:
            print(m.name)
            if 'generateContent' in m.supported_generation_methods:
                SELECTED_MODEL = m.name
                break
        print(f"Selected Model: {SELECTED_MODEL}")
    except Exception as e:
        print(f"Could not dynamically load models: {e}")


@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data or not data.get("idea"):
        return jsonify({"error": "Empty input. Please provide a startup idea."}), 400

    idea = data.get("idea")

    if not GEMINI_API_KEY:
        return jsonify({"error": "API key not configured. Please set GEMINI_API_KEY in the backend .env file."}), 500

    model = genai.GenerativeModel(SELECTED_MODEL)
    print("Using model:", model)

    # Step 1: Intent Classification
    intent_prompt = f"""
Determine if the following input is a startup/business idea.

Input: "{idea}"

Respond ONLY with:
YES or NO
"""
    try:
        intent_response = model.generate_content(intent_prompt)
        intent = intent_response.text.strip().upper()
        intent = re.sub(r'[^A-Z]', '', intent)
        print("Intent detected:", intent)
    except Exception as e:
        return jsonify({"error": f"Intent verification failed: {str(e)}"}), 500

    # Step 2: Validation Logic
    if intent != "YES":
        return jsonify({"error": "Please enter your startup idea. This chatbot only evaluates business ideas."}), 400

    system_prompt = """You are a startup idea evaluation system.

STRICT RULES:
* Only analyze startup ideas.
* If input is not a startup idea, respond with: 'Please enter your startup idea.'
* Only respond in strictly valid JSON format.
* No extra explanation, markdown wrapping, or paragraphs.
* Be concise and analytical.
* Output must be easy to read.

Output format MUST match this exact schema:
{
  "market_demand": "(Low/Medium/High + 1 line reason)",
  "competition": "(Low/Medium/High)",
  "monetization": "(How it earns money)",
  "scalability": "(Low/Medium/High)",
  "score": "(A number out of 10, e.g. 8)",
  "suggestion": "(One powerful improvement)"
}"""

    prompt_text = f"{system_prompt}\n\nAnalyze this startup idea:\n{idea}"

    try:
        response = model.generate_content(prompt_text)
        content = response.text.strip()
        
        # Clean up potential markdown formatting from LLM response
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        content = content.strip()
        ai_json = json.loads(content)
        
        # Post-processing: Add tag based on score
        score_val = ai_json.get("score", "0")
        try:
            # Extract number if it contains text like "8/10"
            match = re.search(r'\d+(\.\d+)?', str(score_val))
            if match:
                score_num = float(match.group(0))
                # Ensure it's correctly mapped if the LLM hallucinated out of 100
                if score_num > 10:
                    score_num = score_num / 10
                    
                if score_num >= 8:
                    ai_json["score_tag"] = "High Potential"
                    ai_json["confidence"] = f"{random.randint(85, 95)}%"
                elif score_num >= 5:
                    ai_json["score_tag"] = "Moderate"
                    ai_json["confidence"] = f"{random.randint(70, 84)}%"
                else:
                    ai_json["score_tag"] = "Risky"
                    ai_json["confidence"] = f"{random.randint(50, 69)}%"
            else:
                ai_json["score_tag"] = "Unknown"
                ai_json["confidence"] = "N/A"
        except Exception:
            ai_json["score_tag"] = "Unknown"
            ai_json["confidence"] = "N/A"

        return jsonify(ai_json)
    except Exception as e:
        error_msg = f"API Request failed: {str(e)}"
        return jsonify({"error": error_msg}), 500
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {str(e)}")
        print(f"Raw AI response: {content}")
        return jsonify({"error": "AI response formatting failed. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
