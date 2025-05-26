import os
import openai
import pdfplumber
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'pdf'}
OPENAI_API_KEY = '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'  # Replace with your OpenAI API key

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Set file upload size limit (e.g., 16MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Initialize OpenAI client
client = openai.OpenAI(api_key=OPENAI_API_KEY)  # Updated for openai>=1.0.0

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Extract text from uploaded PDF
def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

# Truncate text to a maximum number of tokens (1 token ≈ 4 characters)
def truncate_text(text, max_tokens=5000):
    max_length = max_tokens * 4
    return text[:max_length]

# Analyze text using OpenAI GPT
def analyze_text_with_prompt(text, prompt):
    if not text:
        return "No text extracted from the uploaded PDF. Please check the file format."

    try:
        # Combine the extracted text with the user's prompt
        full_prompt = f"""
        You are a financial assistant analyzing transaction histories.
        Given this transaction data, categorize expenses, identify spending trends,
        and provide insights for better financial management.

        Transactions: {text}

        User's Prompt: {prompt}
        """

        # Send the prompt to OpenAI using the new API syntax
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial analyst."},
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=600,  # Limit the response to 600 tokens
            temperature=0.7,
        )

        # Get the AI's response
        analysis = response.choices[0].message.content
        return analysis
    except Exception as e:
        print(f"Error during AI analysis: {e}")
        return "Failed to analyze transactions. Please try again."

# Flask route to handle file upload and prompt
@app.route('/analyze', methods=['POST'])
def analyze():
    # Check if a file is uploaded
    if 'file' not in request.files:
        print("❌ No file uploaded")  # Debugging
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        print("❌ No selected file")  # Debugging
        return jsonify({"error": "No selected file"}), 400

    # Check if the file is allowed
    if not allowed_file(file.filename):
        print(f"❌ Invalid file type: {file.filename}")  # Debugging
        return jsonify({"error": "Invalid file type. Only PDFs are allowed."}), 400

    # Get the user's prompt from the form data
    prompt = request.form.get('prompt')
    if not prompt:
        print("❌ No prompt provided")  # Debugging
        return jsonify({"error": "No prompt provided"}), 400

    # Save the file
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    try:
        file.save(file_path)
        print(f"✅ File saved to: {file_path}")  # Debugging
    except Exception as e:
        print(f"❌ Error saving file: {e}")  # Debugging
        return jsonify({"error": "Failed to save the uploaded file."}), 500

    # Extract text from the PDF
    extracted_text = extract_text_from_pdf(file_path)
    if not extracted_text:
        print("❌ No text extracted from PDF")  # Debugging
        return jsonify({"error": "No text could be extracted from the PDF. Please ensure the PDF contains text."}), 400

    # Truncate the extracted text to ensure the combined tokens (text + prompt) are less than 5000
    truncated_text = truncate_text(extracted_text, max_tokens=4000)  # Reserve 1000 tokens for the prompt

    # Analyze the truncated text with the user's prompt
    analysis = analyze_text_with_prompt(truncated_text, prompt)

    # Log the AI response for debugging
    print("\n--- AI Response ---\n", analysis)

    # Return results
    response_data = {
        "success": True,
        "analysis": analysis
    }
    print("\n--- Response Data Sent to Frontend ---\n", response_data)  # Debugging
    return jsonify(response_data)
# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True, port=5000)
