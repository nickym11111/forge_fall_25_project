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
            # Handle potential list wrapping for users
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
                
            transformed_data.append({
                "id": request["id"],
                "fridge_id": request["fridge_id"],
                "requested_by": request["requested_by"],
                "acceptance_status": request["acceptance_status"],
                "created_at": request["created_at"],
                "user": user_data,
                "fridge": fridge_data,
                "fridges": fridge_data  # For backward compatibility
            })

        # Fallback: If users are missing, fetch them manually
        missing_user_ids = set()
        for item in transformed_data:
            if not item.get("user") and item.get("requested_by"):
                missing_user_ids.add(item["requested_by"])
        
        if missing_user_ids:
            print(f"Fetching {len(missing_user_ids)} missing users for pending requests: {missing_user_ids}")
            users_response = supabase.table("users").select(
                "id, email, first_name, last_name"
            ).in_("id", list(missing_user_ids)).execute()
            
            if users_response.data:
                users_map = {u["id"]: u for u in users_response.data}
                
                # Fill in missing user data
                for item in transformed_data:
                    if not item.get("user") and item.get("requested_by") in users_map:
                        user_data = users_map[item["requested_by"]]
                        item["user"] = user_data
                        item["users"] = user_data  # For backward compatibility
        
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

        # Fallback: If users are missing, fetch them manually
        # This handles cases where the join might fail or return null due to RLS or other issues
        missing_user_ids = set()
        for item in transformed_data:
            if not item.get("users") and item.get("requested_by"):
                missing_user_ids.add(item["requested_by"])
        
        if missing_user_ids:
            print(f"Fetching {len(missing_user_ids)} missing users: {missing_user_ids}")
            users_response = supabase.table("users").select(
                "id, email, first_name, last_name"
            ).in_("id", list(missing_user_ids)).execute()
            
            if users_response.data:
                users_map = {u["id"]: u for u in users_response.data}
                
                # Fill in missing user data
                for item in transformed_data:
                    if not item.get("users") and item.get("requested_by") in users_map:
                        item["users"] = users_map[item["requested_by"]]
                        print(f"filled user for request {item['id']}")

        return {
            "status": "success",
            "data": transformed_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching requests for fridge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")
