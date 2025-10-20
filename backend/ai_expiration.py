from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
import os
import re

app = APIRouter()
load_dotenv()


class ExpiryPredictionRequest(BaseModel):
    item_name: str

class ExpiryPredictionResponse(BaseModel):
    days: int
    item_name: str

@app.post("/predict-expiry", response_model=ExpiryPredictionResponse)
async def predict_expiry(request: ExpiryPredictionRequest):
    """
    Use Claude AI to predict how many days a food item lasts in the fridge
    """
    try:
        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": f"How many days does {request.item_name} typically last when stored in a refrigerator? Respond with ONLY a number representing the number of days. No explanation, just the number."
            }]
        )
        
        # Extract the number from Claude's response
        response_text = message.content[0].text.strip()
        
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