import os
import openai
import json
from fastapi import APIRouter, HTTPException
from database import supabase 
from dotenv import load_dotenv

#Load environment variables and configure OpenAI client
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

router = APIRouter()

@router.get("/generate-recipes/{fridge_id}") #fridge-id place holder
def generate_recipes2(fridge_id: str):
    #Get all items from the specified fridge from the Supabase database
    response = supabase.table("fridge_items").select("title").eq("fridge_id", fridge_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="No items found in this fridge.")

    #Formats the ingredients into a simple list
    ingredients = [item['title'] for item in response.data]
    ingredient_list_str = ", ".join(ingredients)

    #Construct a clear and specific prompt for OpenAI
    prompt = f"""
    Given the following ingredients: {ingredient_list_str}.
    
    Please generate 3 creative recipes. For each recipe, provide a name, a short description, and a list of the ingredients used from the list.
    
    Return the response as a valid JSON array where each object has the keys "recipe_name", "description", and "ingredients_used".
    """

    try:
        #Call the OpenAI API
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful recipe assistant that only responds with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7 #Add some creativity
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