from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from database import supabase
from fastapi import FastAPI, HTTPException, Depends, Header
from service import get_current_user, generate_invite_code

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
                "added_by": recipe.added_by,
                "fridge_id" : user.fridge_id
            })
            .execute()
        )
        print("Recipe added:", response)
        return {"data": response.data, "status": "Recipe added successfully"}
    
    except Exception as e:
        print("Error adding recipe:", e)
        return {"error": str(e)}

app = APIRouter()

class Recipe(BaseModel):
    name: str
    added_by: Optional[str] = None

class User(BaseModel):
    id: str
    fridge_id: str

@app.post("/add-favorite-recipe/")
def add_item(recipe: Recipe, user: User):
    try:
        response = (
            supabase.table("favorite_recipes")
            .insert({
                "recipe_name": recipe.name,
                "added_by": recipe.added_by,
                "fridge_id" : user.fridge_id
            })
            .execute()
        )
        print("Recipe added:", response)
        return {"data": response.data, "status": "Recipe added successfully"}
    
    except Exception as e:
        print("Error adding recipe:", e)
        return {"error": str(e)}

@app.get("/get-favorite-recipes/")
def get_items(current_user = Depends(get_current_user)):
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            return {
                "status": "success",
                "message": "User has no fridge assigned",
                "data": []
            }
            
        items_response = supabase.table("favorite_recipes").select(
            "*, added_by_user:users!favorite_recipes_added_by_fkey(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).execute()
        
        transformed_items = []
        for item in items_response.data:
            added_by_data = item.get("added_by_user")
            
            added_by = {
                "id": added_by_data.get("id"),
                "email": added_by_data.get("email"),
                "first_name": added_by_data.get("first_name"),
                "last_name": added_by_data.get("last_name"),
            } if added_by_data else None
            
            transformed_items.append({
                "id": item["id"],
                "recipe_name": item["recipe_name"],
                "added_by": added_by,
            })
        
        return {
            "status": "success",
            "data": transformed_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting recipe items: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get recipe items: {str(e)}")

@app.delete("/delete-recipe/")
def delete_item(recipe_name: str):
    response = (
        supabase.table("favorite_recipes")
        .delete()
        .eq("recipe_name", recipe_name)
        .execute()
    )
    return {"data": response.data}