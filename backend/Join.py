from fastapi import APIRouter, Depends, HTTPException
from database import supabase  
from pydantic import BaseModel
from service import get_current_user


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

"""
@app.post("/leave-fridge")
def leave_fridge(request: LeaveRequest):
    fridge_id = request.fridgeId
    user_id = request.userId

    try:
        #response = supabase.table("users").select("id, fridge_id").eq("id", user_id).execute()
        # ✅ CHANGE LINE 49-52: Delete from fridge_memberships
        response = supabase.table("fridge_memberships").delete().eq(
            "user_id", user_id
        ).eq("fridge_id", fridge_id).execute()
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
"""

@app.post("/leave-fridge")
def leave_fridge(request: LeaveRequest, current_user = Depends(get_current_user)):
    fridge_id = request.fridgeId
    user_id = request.userId
    
    # ✅ ADD: Security check
    if user_id != current_user.get("id"):
        raise HTTPException(status_code=403, detail="You can only leave your own fridges")

    try:
        # ✅ Delete from fridge_memberships
        delete_response = supabase.table("fridge_memberships").delete().eq(
            "user_id", user_id
        ).eq("fridge_id", fridge_id).execute()
        
        if not delete_response.data:
            return {"status": "error", "message": "You are not a member of this fridge"}
        
        # ✅ CHANGED: Check and clear active_fridge_id if needed
        user_response = supabase.table("users").select("active_fridge_id").eq("id", user_id).execute()
        
        if user_response.data and user_response.data[0].get("active_fridge_id") == fridge_id:
            # Get remaining fridges
            remaining = supabase.table("fridge_memberships").select("fridge_id").eq("user_id", user_id).execute()
            
            if remaining.data and len(remaining.data) > 0:
                # Set to first remaining fridge
                new_active = remaining.data[0]["fridge_id"]
                supabase.table("users").update({"active_fridge_id": new_active}).eq("id", user_id).execute()
            else:
                # No fridges left, set to null
                supabase.table("users").update({"active_fridge_id": None}).eq("id", user_id).execute()
        
        return {"status": "success", "message": "Successfully left fridge"}
        
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}
