from fastapi import APIRouter, HTTPException, Depends
from database import supabase  
from pydantic import BaseModel
from typing import List, Optional, Union
from service import get_current_user, generate_invite_code, get_current_user_with_fridgeMates
import ast
import base64
import uuid

app = APIRouter()
#TEMPLATE to get started :)

@app.get("/")
def get_users():
    
    try:
        response = response = supabase.table("users").select("*").execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}


class UserCreate(BaseModel):
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dietaryRestrictions: Union[List[str], None] = None
    
    
def findAccount(email: str):
    response = supabase.auth.get_user(email)
    return response

@app.post("/sign-up")
async def create_user(user: UserCreate):
    try:
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "first_name": user.firstName,
                    "last_name": user.lastName,
                    "dietary_restrictions": user.dietaryRestrictions
                },
                "email_redirect_to": "http://localhost:8081/" # Redirect to this URL after email confirmation
            }
        })  
        #supabase.table("users").insert({"first_name": user.firstName, "last_name": user.lastName, "email": user.email}).execute()
        return {"email": user.email, 
                "firstName": user.firstName,
                "lastName": user.lastName,
                "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/userInfo/")
async def get_current_user_info(current_user = Depends(get_current_user)):
    try:
        user_data = current_user if isinstance(current_user, dict) else {
            "id": current_user.id,
            "email": current_user.email,
            "fridge_id": None,
            "first_name": None,
            "last_name": None,
            "profile_photo": None,
            "fridgeMates": []
        }
        
        print(f"DEBUG: /userInfo/ endpoint called for user {user_data.get('id')}")
        
        fridge_count_response = supabase.table("fridge_memberships").select(
            "fridge_id", count="exact"
        ).eq("user_id", user_data["id"]).execute()
        
        fridge_count = fridge_count_response.count if fridge_count_response.count else 0
        user_data["fridge_count"] = fridge_count
        
        # Include active_fridge_id explicitly for frontend routing logic
        user_data["active_fridge_id"] = user_data.get("fridge_id")
        
        if user_data.get("fridge_id"):
            print(f"DEBUG: Fetching details for fridge {user_data.get('fridge_id')}")
            fridge_response = supabase.table("fridges").select("*").eq("id", user_data["fridge_id"]).execute()
            
            if fridge_response.data and len(fridge_response.data) > 0:
                user_data["fridge"] = fridge_response.data[0]
            else:
                print(f"DEBUG: Fridge {user_data.get('fridge_id')} not found")
                user_data["fridge"] = None
        else:
            print("DEBUG: User has no active fridge_id")
            user_data["fridge"] = None
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Get all fridges user is a member of
@app.get("/allFridges")
async def get_user_fridges(current_user = Depends(get_current_user)):
    """Get all fridges the user is a member of with their fridgemates"""
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        memberships_response = supabase.table("fridge_memberships").select(
            "fridge_id"
        ).eq("user_id", user_id).execute()
        
        if not memberships_response.data:
            return {
                "status": "success",
                "fridges": []
            }
        
        fridge_ids = [m["fridge_id"] for m in memberships_response.data]
        
        fridges_response = supabase.table("fridges").select(
            "id, name, created_at, created_by"
        ).in_("id", fridge_ids).execute()
        
        if not fridges_response.data:
            return {
                "status": "success",
                "fridges": []
            }
        
        fridges_with_mates = []
        for fridge in fridges_response.data:
            fridge_members_response = supabase.table("fridge_memberships").select(
                "users(id, email, first_name, last_name)"
            ).eq("fridge_id", fridge["id"]).neq("user_id", user_id).execute()
            
            fridgeMates = []
            if fridge_members_response.data:
                for membership in fridge_members_response.data:
                    if membership.get("users"):
                        fridgeMates.append(membership["users"])
            
            fridges_with_mates.append({
                "id": fridge["id"],
                "name": fridge["name"],
                "created_at": fridge["created_at"],
                "created_by": fridge["created_by"],
                "fridgeMates": fridgeMates
            })
        
        return {
            "status": "success",
            "fridges": fridges_with_mates
        }
        
    except Exception as e:
        print(f"Error getting user fridges: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get fridges: {str(e)}")


# Update user's active fridge
class SetActiveFridgeDTO(BaseModel):
    fridge_id: str

@app.put("/active-fridge")
async def set_active_fridge(
    dto: SetActiveFridgeDTO,
    current_user = Depends(get_current_user)
):
    """Set the user's active fridge"""
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        fridge_id = dto.fridge_id
        
        # Verify user is actually a member of this fridge
        membership = supabase.table("fridge_memberships").select("*").eq(
            "user_id", user_id
        ).eq("fridge_id", fridge_id).execute()
        
        if not membership.data:
            raise HTTPException(status_code=403, detail="You are not a member of this fridge")
        
        # Update active_fridge_id
        update_response = supabase.table("users").update({
            "active_fridge_id": fridge_id
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to update active fridge")
        
        return {
            "status": "success",
            "message": "Active fridge updated successfully",
            "active_fridge_id": fridge_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting active fridge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set active fridge: {str(e)}")