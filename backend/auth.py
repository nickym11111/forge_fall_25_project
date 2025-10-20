from supabase import create_client, Client
from fastapi import Header, HTTPException, Depends
from functools import lru_cache
import os

@lru_cache()
def get_supabase_client():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service key for backend
    )

async def get_current_user_id(
    authorization: str = Header(None),
    supabase: Client = Depends(get_supabase_client)
) -> str:

    #Use this in any route that needs user authentication.

    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        # Remove 'Bearer ' prefix
        token = authorization.replace("Bearer ", "")
        
        # Verify token and get user
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return user_response.user.id
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")