from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import re

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

app = APIRouter()


class ExpiryPredictionRequest(BaseModel):
    item_name: str

class ExpiryPredictionResponse(BaseModel):
    item_name: str
    days: int


@app.post("/predict-expiry", response_model=ExpiryPredictionResponse)
async def predict_expiry(request: ExpiryPredictionRequest):
    """
    Use Chat GPT to predict how many days a food item lasts in the fridge
    """
    try:
        response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": f"How many days does {request.item_name} typically last when stored in a refrigerator? Respond with ONLY a number representing the number of days. No explanation, just the number." },
                ],
            }
        ],
        max_output_tokens=20
    )

            
        # Extract the number from Claude's response
        response_text = response.output[0].content[0].text.strip()
        
        # Try to extract just the number
        numbers = re.findall(r'\d+', response_text)
        if numbers:
            days = int(numbers[0])
        else:
            # Default fallback
            days = 7
        
        # Sanity check - keep it reasonable (1-365 days)
        if days < 1:
            days = 1
        elif days > 365:
            days = 365
            
        return ExpiryPredictionResponse(
            days=days,
            item_name=request.item_name
        )
        
    except Exception as e:
        print(f"Error predicting expiry: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to predict expiry date: {str(e)}"
        )