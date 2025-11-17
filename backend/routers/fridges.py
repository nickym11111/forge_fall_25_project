from fastapi import APIRouter, Depends, HTTPException
from service import get_current_user
from database import supabase
from pydantic import BaseModel

app = APIRouter()


class FridgeCreate(BaseModel):
    name: str

# Create a new fridge
@app.post("/")
def create_fridge(fridge: FridgeCreate, current_user=Depends(get_current_user)):
    """Create a new fridge and assign it to the current user."""
    try:
        response = (
            supabase.table("fridges")
            .insert({
                "name": fridge.name,
                "created_by": current_user.id,
                "created_at": "now()",
            })
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create fridge")

        fridge_id = response.data[0].get("id")

        # Update user's fridge_id
        supabase.table("users").update({"fridge_id": fridge_id}).eq("id", current_user.id).execute()

        return {
            "status": "success",
            "message": "Fridge created successfully",
            "fridge_id": fridge_id,
            "data": response.data,
        }

    except Exception as e:
        print(f"Error creating fridge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Get all fridges
@app.get("/")
def get_fridges():
    """Return all fridges in the database."""
    try:
        response = supabase.table("fridges").select("*").execute()
        return {
            "status": "success",
            "data": response.data,
            "count": len(response.data) if response.data else 0,
        }
    except Exception as e:
        print(f"Error fetching fridges: {e}")
        raise HTTPException(status_code=500, detail=str(e))
