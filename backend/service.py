import random
from fastapi import Header
from database import supabase
from fastapi import HTTPException
import string

def generate_invite_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def get_current_user(authorization: str = Header(None)):
    """Extract and validate user from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    try:
        token = authorization.replace("Bearer ", "")
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")