# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI
from database import supabase  
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()


origins = [
    "http://localhost:8081", # React/Next dev server
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

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
    
    
def findAccount(email: str):
    response = supabase.auth.get_user(email)
    return response

@app.post("/sign-up/")
async def create_user(user: UserCreate):
    try:
        existing_user = findAccount(user.email)
        if existing_user.user is not None:
            return {"error": "User already exists"}
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        return {"email": user.email, "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}
