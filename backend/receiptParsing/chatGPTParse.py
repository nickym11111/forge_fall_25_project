from dotenv import load_dotenv # type: ignore
<<<<<<< HEAD
import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import HTTPException, APIRouter, FastAPI


load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class Receipt(BaseModel):
    base64Image: str

=======
import base64
import os
from openai import OpenAI
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

>>>>>>> 0000e52 (backend changes)

def getChatGPTResponse(base64_image: str):
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
<<<<<<< HEAD
                    { "type": "input_text", "text": "parse this receipt for text and give me back a list of maps of the items. Give me the item name as the key and its value is a map with the 2 keys being 'quantity' and 'price'. Return as JSON. Do not include any extra text (including backticks `), only give me the json starting with the [" },
=======
                    { "type": "input_text", "text": "parse this receipt for text and give me back a list of the items. Only give me the items and give it to me as a JSON list. Do not include any extra text (including backticks `), only give me the json starting with the bracket" },
>>>>>>> 0000e52 (backend changes)
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    },
                ],
            }
        ],
    )

    return response
<<<<<<< HEAD

@app.post("/parse-receipt")
def parse_receipt(receipt: Receipt):
    try:
        return getChatGPTResponse(receipt.base64Image);
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
=======
>>>>>>> 0000e52 (backend changes)
