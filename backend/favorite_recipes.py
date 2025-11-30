from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from database import supabase

app = APIRouter()

#Data Model
class Recipe(BaseModel):
    name: str
    added_by: Optional[str] = None  

class User(BaseModel):
    id: str
    fridge_id: str

#Create New fav recipe
@app.post("/add-favorite-recipe/")
def add_item(recipe: Recipe, user: User):
    try:
        response = (
            supabase.table("favorite_recipes")
            .insert({
                "recipe_name": recipe.name,
                "added by": recipe.added_by,
                "fridge_id" : user.fridge_id
            })
            .execute()
        )
        print("Recipe added:", response)
        return {"data": response.data, "status": "Recipe added successfully"}
    
    except Exception as e:
        print("Error adding recipe:", e)
        return {"error": str(e)}

#Get All Current fav recipes
@app.get("/get-favorite-recipes/")
def get_items():
    response = supabase.table("favorite_recipes").select("*").execute()
    print("Retrieved recipes:", response.data)
    return {"data": response.data}

#Delete Item
@app.delete("/delete-recipe/{recipe_id}")
def delete_item(recipe_id: str):
    response = (
        supabase.table("favorite_recipe")
        .delete()
        .eq("id", recipe_id)
        .execute()
    )
    return {"data": response.data}
