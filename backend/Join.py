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
class JoinRequest(BaseModel):
    fridgeCode: str

@app.post("/join-fridge")
def join_fridge(request: JoinRequest):
    code_to_check = request.fridgeCode

    try:
        response = supabase.table("fridges").select("id, name").eq("invite_code", code_to_check).execute()
        
        if response.data:
            found_fridge = response.data[0]
            return {"status": "success", "message": f"Successfully joined fridge: {found_fridge['name']}"}
        else:
            return {"status": "error", "message": "Invalid fridge code. Please try again."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
    

