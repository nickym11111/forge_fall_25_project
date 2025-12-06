"""
API endpoints for fridge requests management
Extracted from frontend queries in requests.tsx and ViewRequestsModal.tsx
"""
from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from service import get_current_user
from typing import List, Optional
from pydantic import BaseModel

app = APIRouter()


class FridgeRequestResponse(BaseModel):
    id: str
    fridge_id: str
    requested_by: str
    acceptance_status: str
    created_at: str
    user_email: Optional[str] = None
    user_first_name: Optional[str] = None
    user_last_name: Optional[str] = None
    fridge_name: Optional[str] = None


@app.get("/pending")
async def get_pending_requests(
    current_user=Depends(get_current_user)
):
    """
    Get all pending fridge join requests for the current user's fridge
    
    Original query from requests.tsx and ViewRequestsModal.tsx:
    supabase
        .from("fridge_requests")
        .select(`
          *,
          users:users!fridge_requests_requested_by_fkey(id, email, first_name, last_name),
          fridges:fridge_id!inner(id, name)
        `)
        .eq("fridge_id", fridge_id)
        .eq("acceptance_status", "PENDING")
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            return {
                "status": "success",
                "message": "User has no fridge assigned",
                "data": []
            }
        
        response = supabase.table("fridge_requests").select(
            """
            *,
            users:users!fridge_requests_requested_by_fkey(id, email, first_name, last_name),
            fridges:fridge_id!inner(id, name)
            """
        ).eq("fridge_id", fridge_id).eq("acceptance_status", "PENDING").execute()
        
        # Transform the data to match frontend expectations
        transformed_data = []
        for request in response.data:
            transformed_data.append({
                "id": request["id"],
                "fridge_id": request["fridge_id"],
                "requested_by": request["requested_by"],
                "acceptance_status": request["acceptance_status"],
                "created_at": request["created_at"],
                "user": request.get("users"),
                "fridge": request.get("fridges"),
                "users": request.get("users"),  # For backward compatibility
                "fridges": request.get("fridges")  # For backward compatibility
            })
        
        return {
            "status": "success",
            "data": transformed_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching pending requests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")


@app.get("/by-fridge/{fridge_id}")
async def get_requests_by_fridge(
    fridge_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get all pending requests for a specific fridge
    Used in ViewRequestsModal.tsx
    """
    try:
        response = supabase.table("fridge_requests").select(
            """
            *,
            users:users!fridge_requests_requested_by_fkey(id, email, first_name, last_name),
            fridges:fridge_id!inner(id, name)
            """
        ).eq("fridge_id", fridge_id).eq("acceptance_status", "PENDING").execute()
        
        
        # Transform the data to ensure nested objects are correctly formatted
        transformed_data = []
        for request in response.data:
            # Handle potential list wrapping for users (Supabase 1:N vs N:1 behavior)
            user_data = request.get("users")
            if isinstance(user_data, list) and len(user_data) > 0:
                user_data = user_data[0]
            elif isinstance(user_data, list):
                user_data = None
                
            # Handle potential list wrapping for fridges
            fridge_data = request.get("fridges")
            if isinstance(fridge_data, list) and len(fridge_data) > 0:
                fridge_data = fridge_data[0]
            elif isinstance(fridge_data, list):
                fridge_data = None

            # Create new dict with fixed data
            transformed_item = request.copy()
            transformed_item["users"] = user_data
            transformed_item["fridges"] = fridge_data
            transformed_data.append(transformed_item)

        return {
            "status": "success",
            "data": transformed_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching requests for fridge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")
