from fastapi import APIRouter
from database import supabase  
from pydantic import BaseModel
from typing import List, Optional

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

