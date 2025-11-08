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
    

class LeaveRequest(BaseModel):
    fridgeId: str
    userId: str

@app.post("/leave-fridge")
def leave_fridge(request: LeaveRequest):
    fridge_id = request.fridgeId
    user_id = request.userId

    try:
        response = supabase.table("users").select("id, fridge_id").eq("id", user_id).execute()
        if response.data:
            user = response.data[0]
            if user["fridge_id"] == fridge_id:
                supabase.table("users").update({"fridge_id": None}).eq("id", user_id).execute()
            
            # if isinstance(created_by, str):
            #     # remove user_id from the created by string
            #     created_by_list = created_by.split(",") if created_by else []
            #     if user_id in created_by_list:
            #         created_by_list.remove(user_id)
            #     created_by = ",".join(created_by_list)
            # else:
            #     created_by = ""
            # supabase.table("fridges").update({"created_by": created_by}).eq("id", fridge_id).execute()
            return {"status": "success", "message": f"Successfully left fridge: {fridge}"}
        else:
            return {"status": "error", "message": "Invalid fridge code. Please try again."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
