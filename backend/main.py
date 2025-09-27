# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine

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
