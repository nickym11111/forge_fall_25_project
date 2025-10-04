# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)



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


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

class UserCreate(BaseModel):
    email: str
    password: str

@app.post("/sign-up/")
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    
    return {"email": user.email, "status": "User created successfully with password: " + user.password}