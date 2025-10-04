# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI
from database import supabase  
from pydantic import BaseModel
from supabase import create_client, Client

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

#TEMPLATE to get started :)
@app.post("/users")
def create_user(name: str, email: str):
    response = supabase.table("users").insert({"name": name, "email": email}).execute()
    return {"data": response.data, "error": response.error}

@app.get("/users")
def get_users():
    response = supabase.table("users").select("*").execute()
    return {"data": response.data, "error": response.error}

class UserCreate(BaseModel):
    email: str
    password: str

@app.post("/sign-up/")
async def create_user(user: UserCreate):
    try:
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        return {"email": user.email, "status": "User created successfully with password: " + user.password}
    except Exception as e:
        return {"error": str(e)}
