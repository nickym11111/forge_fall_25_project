from dotenv import load_dotenv
from google.cloud import vision
from google.oauth2 import service_account
import io
import os
from openai import OpenAI
import json

load_dotenv()

googleVision_credentials = service_account.Credentials.from_service_account_file(os.getenv("GOOGLE_VISION_KEY"))
googleVision_client = vision.ImageAnnotatorClient(credentials=googleVision_credentials)

#openai.api_key = os.getenv("OPENAI_KEY")

openai_client = OpenAI(api_key=os.getenv("OPENAI_KEY"))

def test_google_vision(image_path):
    print("Using credentials from:", os.getenv("GOOGLE_VISION_KEY"))

    # Load image
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    response = googleVision_client.text_detection(image=image)

    if response.error.message:
        print("Vision API error:", response.error.message)
        return

    texts = response.text_annotations
    if not texts:
        print("⚠️ No text found in image.")
        return

    # Print the extracted text
    print("Successfully connected to Google Vision API!")
    print("Detected text:\n")
    print(texts[0].description)


def extract_text(image_path):
    with io.open(image_path, "rb") as image_content:
        content = image_content.read()
    image = vision.Image(content = content)
    visionResponse = googleVision_client.text_detection(image=image)

    if visionResponse.error.message:
        raise Exception("Error Reading Receipt: " + visionResponse.error.message)
    
    text = visionResponse.text_annotations
    if text:
        return text[0].description
    else:
        return ""


def format_text(cleaned_text: str):
    lines = [line.strip() for line in cleaned_text.split("\n") if line.strip()]
    return {"receipt_lines": lines}

def parse_receipt(formatted_text: str):
    openai_prompt = f"""
    You are a helpful assistant.
    Extract purchased items from these receipt lines.
    For each item, detect:
    - name (string)
    - quantity (number)
    - unit (string, e.g., 'lb', 'oz', 'gallon', 'count', etc.)
    - price (number)

    Also include the total if present.
    Ignore subtotals, taxes, item codes, barcodes, promotions, and store information.
    Handle tricky formats like '2x Yogurt 6oz 3.99' or 'Bananas 2.5 lb 1.47'.

    Return valid JSON like this:
    {{
    "items": [
    {{"name": "milk", "quantity": 1, "unit": "gallon", "price": 4.99}},
    {{"name": "eggs", "quantity": 12, "unit": "count", "price": 3.49}}
    ],
    "total": 9.95
    }}

    Receipt data:
    {json.dumps(formatted_text, indent=2)}
    """
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": openai_prompt}],
        response_format={"type": "json_object"}
    )

    reciept_text = response.choices[0].message.content
    try:
        return json.loads(reciept_text)
    except json.JSONDecodeError:
        return {"raw_output": reciept_text}




# Example usage — replace with your test image path
if __name__ == "__main__":
    #test_google_vision("/Users/varun/Desktop/Screenshot 2025-09-15 at 1.34.09 AM.png")
    text = extract_text("/Users/varun/Downloads/wholeFoodsReceipt.jpg")
    formattedText = format_text(text)
    response = parse_receipt(formattedText)
    print(response)