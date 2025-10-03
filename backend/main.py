# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()


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
    # Here you would integrate with Supabase Auth to create a user
    return {"email": user.email, "status": "User created successfully with password: " + user.password}