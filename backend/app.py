from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import requests

# Get the directory where this file is located
current_dir = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from backend folder
env_path = os.path.join(current_dir, '.env')
load_dotenv(dotenv_path=env_path)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Configure OpenRouter API
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'openai/gpt-4o-mini')

if not OPENROUTER_API_KEY:
    print(f"❌ OPENROUTER_API_KEY not found in environment variables.")
    print(f"📝 Looking for .env file at: {env_path}")
    raise ValueError("OPENROUTER_API_KEY not found. Please create a .env file in the backend folder with your OpenRouter API key.")

print(f"✅ Successfully loaded OPENROUTER_API_KEY")
print(f"🎯 Using model: {OPENROUTER_MODEL}")

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

def create_script_prompt(topic, platform, tone, length):
    """
    Create a prompt for the AI to generate a script based on the provided parameters.
    """
    prompt = f"""
    Create a professional video script for the topic: "{topic}"
    
    Requirements:
    - Platform: {platform}
    - Tone: {tone}
    - Length: {length}
    
    Please generate a complete script with the following structure:
    
    1. INTRODUCTION (Hook the audience)
    2. MAIN CONTENT (Deliver key points in a point wise and well structured manner)
    3. CONCLUSION (Call to action)
    
    Format the response as JSON with the following structure:
    {{
        "title": "Script title here",
        "introduction": {{
            "script": "Introduction content here"
        }},
        "mainContent": {{
            "script": "Main content here"
        }},
        "conclusion": {{
            "script": "Conclusion content here"
        }}
    }}
    
    Make sure the script is:
    - Optimized for {platform} platform
    - In a {tone} tone
    - Approximately {length} duration
    - Engaging and professional
    - Includes platform-specific elements (e.g., for YouTube: call to subscribe, for TikTok: engaging hooks)
    
    Return ONLY valid JSON without any markdown formatting or code blocks.
    """
    
    return prompt

@app.route('/api/generate-script', methods=['POST'])
def generate_script():
    try:
        # Get parameters from the request
        data = request.get_json()
        
        topic = data.get('topic', '')
        platform = data.get('platform', 'YouTube')
        tone = data.get('tone', 'Casual')
        length = data.get('length', 'Short (2-3 min)')
        
        # Validate required fields
        if not topic:
            return jsonify({
                'success': False,
                'error': 'Topic is required'
            }), 400
        
        # Create the prompt
        prompt = create_script_prompt(topic, platform, tone, length)
        
        # Generate script using OpenRouter
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://script-ai.app",
            "X-Title": "Script-AI"
        }
        
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        api_response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        api_response.raise_for_status()
        
        # Parse the response
        response_data = api_response.json()
        response_text = response_data['choices'][0]['message']['content'].strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        # Parse JSON response
        script_data = json.loads(response_text)
        
        return jsonify({
            'success': True,
            'data': script_data
        })
        
    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to OpenRouter API: {str(e)}'
        }), 500
        
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Response text: {response_text if 'response_text' in locals() else 'No response text'}")
        
        # Fallback response
        return jsonify({
            'success': True,
            'data': {
                'title': f"{topic} - Script for {platform}",
                'introduction': {
                    'script': f'[{tone.upper()}] Hook your audience with a strong intro\n\nHello everyone! Today we\'re diving deep into {topic}. This is something I\'m really passionate about, and I can\'t wait to share my insights with you.'
                },
                'mainContent': {
                    'script': f'[MAIN CONTENT - {tone.upper()} TONE]\n\nLet\'s talk about the three most important aspects of {topic}:\n\n1. The fundamentals that everyone should know\n2. Common misconceptions that might be holding you back\n3. Advanced strategies that can take your understanding to the next level'
                },
                'conclusion': {
                    'script': f'[CONCLUSION - {tone.upper()}]\n\nThanks for staying with me through this exploration of {topic}. If you found this valuable, make sure to like and subscribe for more content like this!'
                }
            }
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'ScriptAI API is running'
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(debug=True, port=port, host='0.0.0.0')

