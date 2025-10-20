from dotenv import load_dotenv # type: ignore
import os
from openai import OpenAI
from pydantic import BaseModel
from fastapi import HTTPException, APIRouter
from database import supabase


load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

class Ingredients(BaseModel):
    recipe: str

def getChatGPTResponse(recipe: str):
    existing_ingredients = (supabase.table("fridge_items")
        .select("title")
        .execute())
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
        return getChatGPTResponse(ingredients.recipe);
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)