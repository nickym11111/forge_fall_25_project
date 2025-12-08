from dotenv import load_dotenv # type: ignore
import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import HTTPException, APIRouter
import json 


load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class Receipt(BaseModel):
    base64Image: str


def getChatGPTResponse(base64_image: str):
    # Detect image format from base64 string prefix if present, otherwise default to jpeg
    image_format = "jpeg"
    if base64_image.startswith("iVBORw0KGgo"):
        image_format = "png"
    elif base64_image.startswith("R0lGOD"):
        image_format = "gif"
    elif base64_image.startswith("UklGR"):
        image_format = "webp"
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": "parse this receipt for text and give me back a list of maps of the items. Give me the item name as the key and its value is a map with the 2 keys being 'quantity' and 'price'. Return as JSON. Do not include any extra text (including backticks `), only give me the json starting with the [" },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/{image_format};base64,{base64_image}"
                        },
                    },
                ],
            }
        ],
    )

    print("raw response", response.choices[0].message.content)
    return sanitize_json_response(response.choices[0].message.content)

def clean_item_names(item_names: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": "Take this object and clean up the key names, to the item that it seems to represent. For example, `PAC BROTH CHCKN` should be `Chicken Broth`. Do this in title case. Return as JSON. Do not include any extra text (including backticks `), only give me the json starting with the [" },
                    { "type": "text", "text": item_names },
                ],
            }
        ],
    )

    print("cleaned response", response.choices[0].message.content)
    return sanitize_json_response(response.choices[0].message.content)

def sanitize_json_response(response_text: str) -> str:
    if not response_text:
        return "[]"
    # Remove markdown code blocks if present
    cleaned = response_text.replace("```json", "").replace("```", "").strip()
    return cleaned

@app.post("/parse-receipt")
def parse_receipt(receipt: Receipt):
    try:
        raw_response = getChatGPTResponse(receipt.base64Image)
        cleaned_response = clean_item_names(raw_response)
        return cleaned_response
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)