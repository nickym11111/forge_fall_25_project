from fastapi import APIRouter, HTTPException, Depends
from database import supabase  
from pydantic import BaseModel
from typing import List, Optional
from service import get_current_user, generate_invite_code, get_current_user_with_fridgeMates
import ast
import base64
import uuid

app = APIRouter()
#TEMPLATE to get started :)

@app.get("/")
def get_users():
    
    try:
        response = response = supabase.table("users").select("*").execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}


class UserCreate(BaseModel):
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dietaryRestrictions: Union[List[str], None] = None
    
    
def findAccount(email: str):
    response = supabase.auth.get_user(email)
    return response

@app.post("/sign-up")
async def create_user(user: UserCreate):
    try:
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "first_name": user.firstName,
                    "last_name": user.lastName,
                    "dietary_restrictions": user.dietaryRestrictions
                },
                "email_redirect_to": "http://localhost:8081/" # Redirect to this URL after email confirmation
            }
        })  
        #supabase.table("users").insert({"first_name": user.firstName, "last_name": user.lastName, "email": user.email}).execute()
        return {"email": user.email, 
                "firstName": user.firstName,
                "lastName": user.lastName,
                "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/userInfo")
async def get_current_user_info(current_user = Depends(get_current_user_with_fridgeMates)):
    try:
        user_data = current_user if isinstance(current_user, dict) else {
            "id": current_user.id,
            "email": current_user.email,
            "fridge_id": None,
            "first_name": None,
            "last_name": None,
            "fridgeMates": [],
            "profile_photo": None
        }
        
        if user_data.get("fridge_id"):
            fridge_response = supabase.table("fridges").select("*").eq("id", user_data["fridge_id"]).execute()
            
            if fridge_response.data and len(fridge_response.data) > 0:
                user_data["fridge"] = fridge_response.data[0]
            else:
                user_data["fridge"] = None
        else:
            user_data["fridge"] = None
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
