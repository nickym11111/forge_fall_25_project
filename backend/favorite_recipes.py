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

#Get All Current fav recipes
@app.get("/get-favorite-recipes/")
def get_items():
    try:
        # First, try to get recipes with joined user data
        # Try different possible foreign key names and handle missing profile_photo_url column
        try:
            response = supabase.table("favorite_recipes").select(
                "*, added_by_user:users!favorite_recipes_added_by_fkey(id, email, first_name, last_name, profile_photo)"
            ).execute()
        except Exception as e:
            # If profile_photo_url doesn't exist or foreign key name is different, try without it
            try:
                response = supabase.table("favorite_recipes").select(
                    "*, added_by_user:users!favorite_recipes_added_by_fkey(id, email, first_name, last_name)"
                ).execute()
            except:
                # Last resort: try without specifying the foreign key
                response = supabase.table("favorite_recipes").select(
                    "*, added_by_user:users(id, email, first_name, last_name)"
                ).execute()
        
        # Transform the data to include user details
        transformed_recipes = []
        for recipe in response.data:
            added_by_data = recipe.get("added_by_user")
            added_by_id = recipe.get("added_by")
            
            # If we got user data from the join
            if added_by_data:
                added_by = {
                    "id": added_by_data.get("id"),
                    "email": added_by_data.get("email"),
                    "first_name": added_by_data.get("first_name"),
                    "last_name": added_by_data.get("last_name"),
                    "profile_photo_url": added_by_data.get("profile_photo"),
                }
            # If we have an added_by ID but no joined data, fetch it separately
            elif added_by_id:
                try:
                    user_response = supabase.table("users").select("id, email, first_name, last_name, profile_photo").eq("id", added_by_id).execute()
                except:
                    # If profile_photo doesn't exist, fetch without it
                    user_response = supabase.table("users").select("id, email, first_name, last_name").eq("id", added_by_id).execute()
                
                if user_response.data and len(user_response.data) > 0:
                    user_data = user_response.data[0]
                    added_by = {
                        "id": user_data.get("id"),
                        "email": user_data.get("email"),
                        "first_name": user_data.get("first_name"),
                        "last_name": user_data.get("last_name"),
                        "profile_photo_url": user_data.get("profile_photo"),
                    }
                else:
                    added_by = None
            else:
                added_by = None
            
            transformed_recipes.append({
                "id": recipe["id"],
                "recipe_name": recipe["recipe_name"],
                "created_at": recipe.get("created_at"),
                "fridge_id": recipe.get("fridge_id"),
                "added_by": added_by
            })
        
        print("Retrieved recipes:", transformed_recipes)
        return {"data": transformed_recipes}
    except Exception as e:
        print(f"Error getting recipes: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback to returning raw data
        response = supabase.table("favorite_recipes").select("*").execute()
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
