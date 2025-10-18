from fastapi import APIRouter, HTTPException, Depends
from database import supabase  
from pydantic import BaseModel
from typing import List, Optional
from service import get_current_user, generate_invite_code
import ast

app = APIRouter()
#TEMPLATE to get started :)

@app.get("/")
def get_users():
    response = supabase.table("users").select("*").execute()
    return {"data": response.data, "error": response.error}

class UserCreate(BaseModel):
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dietaryRestrictions: Optional[List[str]] = None
    
    
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
        return {"email": user.email, 
                "firstName": user.firstName,
                "lastName": user.lastName,
                "dietaryRestrictions": user.dietaryRestrictions,
                "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/userInfo")
async def get_current_user_info(current_user = Depends(get_current_user)):
    #Get current user's info including fridge data
    try:
        # Get user data
        user_response = supabase.table("users").select("id, first_name, last_name, email, fridge_id").eq("id", current_user.id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_response.data[0]
        
        # If user has a fridge, get fridge details
        if user_data.get("fridge_id"):
            fridge_response = supabase.table("fridges").select("*").eq("id", user_data["fridge_id"]).execute()
            
            # Get fridge data for the user
            if fridge_response.data and len(fridge_response.data) > 0:
                user_data["fridge"] = fridge_response.data[0]
                fridge_emails = fridge_response.data[0].get("emails", [])

                # Get user fridge mate info
                if isinstance(fridge_emails, str):
                    try:
                        fridge_emails = ast.literal_eval(fridge_emails)
                    except:
                        fridge_emails = []
                fridgeMates = []
                if fridge_emails and len(fridge_emails) > 0:
                    fridgeMates_response = supabase.table("users").select("id, email, first_name, last_name").in_("email", fridge_emails).execute()

                    if fridgeMates_response.data:
                        fridgeMates = fridgeMates_response.data
                user_data["fridgeMates"] = fridgeMates
            else:
                user_data["fridge"] = None
                user_data["fridgeMates"] = []
        else:
            user_data["fridge"] = None
            user_data[fridgeMates] = []
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

