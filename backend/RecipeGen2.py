from dotenv import load_dotenv
import os
import json
from fastapi import APIRouter, HTTPException
from database import supabase 
from openai import OpenAI

#Load environment variables and configure OpenAI client
load_dotenv()
app = APIRouter()
api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=api_key)


def getChatGPTResponse():
    print("=== Starting getChatGPTResponse ===")

    try:
        existing_ingredients = (supabase.table("fridge_items").select("name").execute())
        print(f"=== Got ingredients from DB: {existing_ingredients.data} ===")
    except Exception as e:
        print(f"=== Database error: {e} ===")
        raise
    
    ingredients_list = [item['name'] for item in existing_ingredients.data] if existing_ingredients.data else []
    print(f"=== Ingredients list: {ingredients_list} ===")

    if not ingredients_list:
        print("=== No ingredients found ===")
        return {
            "status": "info",
            "message": "No items found in this fridge. Add some ingredients to get started!"
        }

    prompt = f"""
Given the following ingredients: {ingredients_list}.
Please generate 3 creative recipes. For each recipe, provide a name, a short description, and a list of the ingredients used from the list.
Return the response as a valid JSON array where each object has the keys "recipe_name", "description", and "ingredients_used".
If you cannot make at least one enjoyable meal with these ingredients, return a JSON object with a single key "message" that 
contains the string "Need more ingredients for sufficient meals.".
"""

    try:
        print("=== Creating OpenAI client ===")
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        print("=== Calling OpenAI API ===")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful recipe assistant that only responds with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            timeout=30  # Add 30 second timeout
        )
        print("=== OpenAI API call successful ===")
        
        content = response.choices[0].message.content
        print(f"=== OpenAI response: {content[:200]}... ===")
        
        recipe_json = json.loads(content) 
        
        return {
            "status": "success",
            "recipes": recipe_json
        }
    except Exception as e:
        print(f"=== OpenAI Error: {type(e).__name__}: {e} ===")
        import traceback
        traceback.print_exc()
        raise

@app.get("/generate-recipes/")
def generate_recipes2():
    print("=== generate_recipes2 endpoint called ===")
    try:
        result = getChatGPTResponse()
        print(f"=== Returning result: {result} ===")
        return result
    
    except json.JSONDecodeError as e:
        print(f"=== JSON decode error: {e} ===")
        raise HTTPException(status_code=500, detail=f"Error parsing recipes from OpenAI: {str(e)}")
    except Exception as e:
        error_msg = f"An error occurred: {str(e)}"
        print(f"=== Exception: {error_msg} ===")
        raise HTTPException(status_code=500, detail=error_msg)