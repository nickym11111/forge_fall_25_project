import os
import json
from fastapi import APIRouter, HTTPException
from database import supabase 
from dotenv import load_dotenv
from openai import OpenAI

#Load environment variables and configure OpenAI client
load_dotenv()
router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@router.get("/generate-recipes/")
def generate_recipes2():
    #Get all items from the specified fridge from the Supabase database
    response = supabase.table("fridge_items").select("title").execute()
    
    if not response.data:
          return {"status": "info", "message": "No items found in this fridge. Add some ingredients to get started!"}
    
    ingredients = [item['title'] for item in response.data]
    ingredient_list_str = ", ".join(ingredients)

    #Construct a clear and specific prompt for OpenAI
    prompt = f"""
    Given the following ingredients: {ingredient_list_str}.
    Please generate 3 creative recipes. For each recipe, provide a name, a short description, and a list of the ingredients used from the list.
    Return the response as a valid JSON array where each object has the keys "recipe_name", "description", and "ingredients_used".
    If you cannot make at least one enjoyable meal with these ingredients, return a JSON object with a single key "message" that 
    contains the string "Need more ingredients for sufficient meals.".
    """

    try:
        #Call the OpenAI API
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful recipe assistant that only responds with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        #Parses the JSON response and send it to the frontend
        recipe_json = json.loads(completion.choices[0].message.content)
        
        return {
            "status": "success",
            "recipes": recipe_json
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing recipes from OpenAI.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")