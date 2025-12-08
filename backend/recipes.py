from dotenv import load_dotenv # type: ignore
import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import HTTPException, APIRouter
from database import supabase
from datetime import datetime 

for key in list(os.environ.keys()):
    if 'proxy' in key.lower():
        del os.environ[key]

load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class Ingredients(BaseModel):
    recipe: str

class GroceryItem(BaseModel):
    ingredient: str
    userId: str
    fridgeId: str

def getChatGPTResponse(recipe: str):
    existing_ingredients = (supabase.table("fridge_items").select("name").execute())
    response = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": f'''
                        What ingredients do I need to make {recipe}? Return this as a JSON object with no
                        word response or ```. ONLY include items that aren't in {existing_ingredients}.
                        The names won't be exact so use your judgement to determine matching items.''' 
                    },
                ],
            }
        ],
    )

    return response


@app.post("/find_ingredients")
def find_ingredients(ingredients: Ingredients):
    try:
        return getChatGPTResponse(ingredients.recipe);
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    
@app.post("/add_to_grocery_list")
async def add_to_grocery_list(grocery_item: GroceryItem):
    """
    Add an ingredient to the shopping list
    """
    try:
        # Fetch user details to get name
        user_response = supabase.table("users").select("first_name, last_name").eq("id", grocery_item.userId).execute()
        
        user_name = "Unknown"
        if user_response.data and len(user_response.data) > 0:
            user = user_response.data[0]
            first = user.get("first_name", "") or ""
            last = user.get("last_name", "") or ""
            user_name = f"{first} {last}".strip()
            
        if not user_name:
            user_name = grocery_item.userId # Fallback to ID if no name found, though unlikely for valid user
            
        print(f"Adding '{grocery_item.ingredient}' to shopping list for user {user_name} ({grocery_item.userId})")
        
        # Insert into shopping_list table
        result = supabase.table("shopping_list").insert({
            "name": grocery_item.ingredient,
            "requested_by": user_name,
            "fridge_id": grocery_item.fridgeId,
            "checked": False,
            "quantity": 1,
            # Don't include created_at - it auto-generates
        }).execute()
        
        print(f"Successfully added: {result.data}")
        
        return {
            "status": "success", 
            "message": f"{grocery_item.ingredient} added to shopping list"
        }
        
    except Exception as e:
        error_msg = f"Error adding to shopping list: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)