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
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": "parse this receipt for text and give me back a list of maps of the items. Give me the item name as the key and its value is a map with the 2 keys being 'quantity' and 'price'. Return as JSON. Do not include any extra text (including backticks `), only give me the json starting with the [" },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    },
                ],
            }
        ],
    )

    print("raw response", response.output[0].content[0].text)
    return response.output[0].content[0].text

def clean_item_names(item_names: str):
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": "Take this object and clean up the key names, to the item that it seems to represent. For example, `PAC BROTH CHCKN` should be `Chicken Broth`. Do this in title case. Return as JSON. Do not include any extra text (including backticks `), only give me the json starting with the [" },
                    { "type": "input_text", "text": item_names },
                ],
            }
        ],
    )

    print("cleaned response", response.output[0].content[0].text)
    return response.output[0].content[0].text

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
