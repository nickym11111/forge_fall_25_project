from fastapi import APIRouter, HTTPException
from database import supabase  
from pydantic import BaseModel

app = APIRouter()

class JoinRequest(BaseModel):
    fridgeCode: str

@app.post("/join-fridge")
def join_fridge(request: JoinRequest):
    code_to_check = request.fridgeCode

    response = supabase.table("fridge_invitations").select("*, fridge(name)").eq("invite_code", code_to_check).execute()
        
    if not response.data:
            raise HTTPException(status_code=404, detail="Invalid fridge code. Please try again.")

    found_fridge = response.data[0]
    return {"status": "success", "message": f"Successfully joined fridge: {found_fridge['name']}"}
    

