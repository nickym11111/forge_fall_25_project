from fastapi import APIRouter
from database import supabase  
from pydantic import BaseModel

app = APIRouter()

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
    

