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
        model="gpt-4.1-mini",
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
        return getChatGPTResponse(ingredients.recipe)
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    
@app.post("/add_to_grocery_list")
async def add_to_grocery_list(grocery_item: GroceryItem):
    """
    Add an ingredient to the user's grocery list
    """
    try:
        print(f"Adding '{grocery_item.ingredient}' to grocery list for user {grocery_item.userId}")
        
        # Insert into grocery_list table
        result = supabase.table("shopping_list").insert({
            "name": grocery_item.ingredient,
            "requested_by": grocery_item.userId,
            "fridge_id": grocery_item.fridgeId,
            "created_at": datetime.now().isoformat(),
            "checked": False
        }).execute()
        
        print(f"Successfully added: {result.data}")
        
        return {
            "status": "success", 
            "message": f"{grocery_item.ingredient} added to grocery list"
        }
        
    except Exception as e:
        error_msg = f"Error adding to grocery list: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)