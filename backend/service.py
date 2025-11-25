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
        
        user_response = supabase.table("users").select("id, email, fridge_id, first_name, last_name, profile_photo").eq("id", response.user.id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            # If user not in database, return just the auth user
            return response.user
        
        # Return the database user data (includes fridge_id)
        return user_response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_current_user_with_fridgeMates(
    current_user = Depends(get_current_user)
):
    #Get user with their fridgeMates
    try:
        fridge_id = current_user.get("fridge_id")
        
        if not fridge_id:
            current_user["fridgeMates"] = []
            return current_user
        
        # Get all users with the same fridge_id, not including the current user
        fridgeMates_response = supabase.table("users").select(
            "id, email, first_name, last_name"
        ).eq("fridge_id", fridge_id).neq("id", current_user["id"]).execute()
        
        current_user["fridgeMates"] = fridgeMates_response.data if fridgeMates_response.data else []
        
        return current_user
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        current_user["fridgeMates"] = []
        return current_user