from typing import List
from fastapi import FastAPI
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow requests from your frontend dev server
origins = [
    "http://localhost:8081",  # React Native / Expo dev server
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- TEST ROOT ---
@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

# --- USER ENDPOINTS (example) ---
@app.post("/users")
def create_user(name: str, email: str):
    response = supabase.table("users").insert({"name": name, "email": email}).execute()
    return {"data": response.data, "error": response.error}

@app.get("/users")
def get_users():
    response = supabase.table("users").select("*").execute()
    return {"data": response.data, "error": response.error}

# --- FRIDGE ENDPOINTS ---
class FridgeCreate(BaseModel):
    name: str
    emails: List[str]

@app.post("/fridges")
def create_fridge(fridge: FridgeCreate):
    response = supabase.table("fridges").insert({
        "name": fridge.name,
        "emails": fridge.emails
    }).execute()
    
    if response.error:
        return {"error": response.error}
    
    return {"data": response.data, "status": "Fridge created successfully"}

@app.get("/fridges")
def get_fridges():
    response = supabase.table("fridges").select("*").execute()
    return {"data": response.data, "error": response.error}
