from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import supabase
from service import get_current_user
from dotenv import load_dotenv
import os, json
from openai import OpenAI

load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class ReceiptItem(BaseModel):
    title: str
    quantity: Optional[int] = 1
    expiry_date: Optional[str] = None
    price: Optional[float] = 0.0

class ReceiptParseRequest(BaseModel):
    base64Image: str
    fridge_id: str
    added_by: str

class ReceiptParseResponse(BaseModel):
    items: List[ReceiptItem]


#Call ChatGPT to parse receipt image
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

    return response

# Parse receipt
@app.post("/parse-receipt", response_model=ReceiptParseResponse)
def parse_receipt(request: ReceiptParseRequest, current_user=Depends(get_current_user)):
    try:
        json_output = getChatGPTResponse(request.base64Image)
        items_data = json.loads(json_output)

        parsed_items = []
        for item in items_data:
            name = list(item.keys())[0]
            info = item[name]

            # Insert item into fridge
            supabase.table("fridge_items").insert({
                "name": name,
                "quantity": info.get("quantity", 1),
                "price": info.get("price", 0.0),
                "added_by": request.added_by,
                "fridge_id": request.fridge_id,
            }).execute()

            # Remove item from shopping list
            supabase.table("shopping_list").delete() \
                .eq("name", name.lower()) \
                .eq("fridge_id", request.fridge_id) \
                .execute()

            parsed_items.append(ReceiptItem(
                title=name,
                quantity=info.get("quantity", 1),
                price=info.get("price", 0.0)
            ))

        return {"status": "Items added to fridge and removed from shopping list", "items": items_data}
    
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
