from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, date
from typing import List, Optional
from service import get_current_user
from database import supabase
from pydantic import BaseModel

app = APIRouter()

class FridgeItemCreate(BaseModel):
    name: str
    expiry_date: str
    quantity: Optional[int] = 1
    price: Optional[float] = None
    added_by: Optional[str] = None
    shared_by: Optional[List[str]] = None

# Create fridge item
@app.post("/")
async def create_fridge_item(
    item: FridgeItemCreate,
    current_user=Depends(get_current_user)
):
    try:
        expiry = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
        days_till_expiration = (expiry - date.today()).days

        user_response = (
            supabase.table("users")
            .select("fridge_id")
            .eq("id", current_user["id"])
            .execute()
        )

        if not user_response.data:
            raise HTTPException(status_code=401, detail="User not found")

        fridge_id = user_response.data[0].get("fridge_id")
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")

        # Insert item
        response = (
            supabase.table("fridge_items")
            .insert({
                "name": item.name,
                "quantity": item.quantity,
                "days_till_expiration": days_till_expiration,
                "fridge_id": fridge_id,
                "added_by": current_user["id"],
                "shared_by": item.shared_by,
                "price": item.price,
            })
            .execute()
        )

        # Remove from shopping list
        supabase.table("shopping_list") \
            .delete() \
            .eq("name", item.name.lower()) \
            .eq("fridge_id", fridge_id) \
            .execute()

        return {
            "status": "success",
            "message": "Fridge item added and removed from shopping list",
            "data": response.data,
        }

    except Exception as e:
        print(f"Error creating fridge item: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add item: {e}")


# Get fridge items (main)
@app.get("/")
def get_fridge_items(current_user=Depends(get_current_user)):
    try:
        # get fridge_id directly from user
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None

        if not fridge_id:
            return {"status": "success", "message": "User has no fridge", "data": []}

        # Items with added_by user info
        items_response = supabase.table("fridge_items").select(
            "*, added_by_user:users!fridge_items_added_by_fkey(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).execute()

        # All users for shared_by mapping
        fridge_users = supabase.table("users").select(
            "id, email, first_name, last_name"
        ).eq("fridge_id", fridge_id).execute()

        users_map = {u["id"]: u for u in fridge_users.data}

        transformed = []
        for item in items_response.data:
            # Added by user
            added_by = None
            if item.get("added_by_user"):
                a = item["added_by_user"]
                added_by = {
                    "id": a.get("id"),
                    "email": a.get("email"),
                    "first_name": a.get("first_name"),
                    "last_name": a.get("last_name"),
                }

            # Shared by handling
            shared_ids = item.get("shared_by")
            if shared_ids:
                shared_by = [users_map[id] for id in shared_ids if id in users_map]
            else:
                shared_by = list(users_map.values())

            transformed.append({
                "id": item["id"],
                "name": item["name"],
                "quantity": item["quantity"],
                "price": item.get("price", 0),
                "days_till_expiration": item["days_till_expiration"],
                "fridge_id": item["fridge_id"],
                "added_by": added_by,
                "shared_by": shared_by,
                "created_at": item.get("created_at")
            })

        return {"status": "success", "data": transformed}

    except Exception as e:
        print(f"Error getting fridge items: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get fridge items: {e}")


# Expiring soon
@app.get("/expiring-soon/")
def get_expiring_items():
    response = (
        supabase.table("fridge_items")
        .select("*")
        .lte("days_till_expiration", 3)
        .execute()
    )
    return {"data": response.data}

# Delete fridge item
@app.delete("/{item_id}/")
def delete_fridge_item(item_id: int):
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}
