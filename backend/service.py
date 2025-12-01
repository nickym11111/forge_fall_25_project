
import random
from fastapi import Header
from database import supabase
from fastapi import HTTPException, Header, Depends
from fastapi import HTTPException, Header, Depends
import string
from functools import lru_cache
import os
from supabase import create_client
from functools import lru_cache
import os

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


@lru_cache()
def get_supabase_client():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

async def get_current_user(
    authorization: str = Header(None),
    supabase = Depends(get_supabase_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        token = authorization.replace("Bearer ", "")
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_response = supabase.table("users").select(
            "id, email, active_fridge_id, first_name, last_name"
        ).eq("id", response.user.id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            return response.user
        
        user_data = user_response.data[0]
        
        user_data["fridge_id"] = user_data.get("active_fridge_id")
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user_with_fridgeMates(
    current_user = Depends(get_current_user)
):
    """Get user with their fridgeMates from their active/current fridge"""
    try:
        fridge_id = current_user.get("fridge_id")
        
        if not fridge_id:
            current_user["fridgeMates"] = []
            return current_user
        
        memberships_response = supabase.table("fridge_memberships").select(
            "users(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).neq("user_id", current_user["id"]).execute()
        
        fridgeMates = []
        if memberships_response.data:
            for membership in memberships_response.data:
                if membership.get("users"):
                    fridgeMates.append(membership["users"])
        
        current_user["fridgeMates"] = fridgeMates
        
        return current_user
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        current_user["fridgeMates"] = []
        return current_user