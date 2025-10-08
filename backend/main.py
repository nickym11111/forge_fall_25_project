# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI
from database import supabase  
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Join import app as join_router
from Users import app as users_router

app = FastAPI()

# Allow CORS origin policy to allow requests from local origins.
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

app.include_router(join_router, prefix="/fridge")  # ← now /fridge/join works
app.include_router(users_router, prefix="/users")  # ← now /user/ endpoints work

@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

