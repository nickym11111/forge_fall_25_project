from dotenv import load_dotenv 
import os
import json
from openai import OpenAI
from pydantic import BaseModel
from fastapi import HTTPException, APIRouter
from database import supabase 
from supabase import Client

load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class Receipt(BaseModel):
    base64Image: str
    fridge_id: str  # ✅ add fridge_id to know where to store
    added_by: str   # ✅ add user_id

def getChatGPTResponse(base64_image: str):
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "parse this receipt for text and give me back "
                            "a list of maps of the items. Give me the item name as the key "
                            "and its value is a map with the 2 keys being 'quantity' and 'price'. "
                            "Return as JSON. Do not include any extra text, only the JSON array."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    },
                ],
            }
        ],
    )

    return response.output[0].content[0].text  # ✅ return raw JSON string

@app.post("/parse-receipt")
def parse_receipt(receipt: Receipt):
    try:
        #Get structured data from ChatGPT
        json_output = getChatGPTResponse(receipt.base64Image)
        items = json.loads(json_output)

        #Insert each item into the Fridge
        for item in items:
            name = list(item.keys())[0]
            info = item[name]

            supabase.table("Fridge").insert({
                "name": name,
                "quantity": info.get("quantity", 1),
                "price": info.get("price", 0.0),
                "added_by": receipt.added_by,
                "fridge_id": receipt.fridge_id,
            }).execute()

            #Automatically remove from ShoppingList
            supabase.table("shopping_list").delete() \
                .eq("name", name) \
                .eq("fridge_id", receipt.fridge_id) \
                .execute()

        return {"status": "Items added to fridge and removed from shopping list", "items": items}

    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
