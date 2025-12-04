
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
        # print(f"DEBUG: Processing token: {token[:10]}...")
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
            print("DEBUG: No user found in Supabase Auth")
            raise HTTPException(status_code=401, detail="Invalid token")
            
        print(f"DEBUG: Auth user found: {response.user.id}")
        
        user_response = supabase.table("users").select(
            "id, email, active_fridge_id, first_name, last_name, profile_photo"
        ).eq("id", response.user.id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            print(f"DEBUG: User {response.user.id} not found in public.users table")
            return response.user
        
        user_data = user_response.data[0]
        print(f"DEBUG: User data retrieved: {user_data.get('email')}, Active Fridge: {user_data.get('active_fridge_id')}")
        
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
        print(f"DEBUG: Getting fridgeMates for fridge {fridge_id}")
        
        if not fridge_id:
            print("DEBUG: No fridge_id for user, returning empty fridgeMates")
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
        
        print(f"DEBUG: Found {len(fridgeMates)} fridgeMates")
        current_user["fridgeMates"] = fridgeMates
        
        return current_user
        
    except Exception as e:
        print(f"DEBUG: Error in get_current_user_with_fridgeMates: {e}")
        import traceback
        traceback.print_exc()
        current_user["fridgeMates"] = []
        return current_user