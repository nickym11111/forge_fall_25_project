"""
API endpoints for shopping list management
Extracted from frontend queries in shop.tsx
"""
from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from service import get_current_user
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

app = APIRouter()


class ShoppingItemCreate(BaseModel):
    name: str
    quantity: Optional[int] = 1
    need_by: Optional[str] = None
    fridge_id: str
    requested_by: str
    bought_by: Optional[str] = None
    checked: Optional[bool] = False


class ShoppingItemUpdate(BaseModel):
    quantity: Optional[int] = None
    checked: Optional[bool] = None
    bought_by: Optional[str] = None


@app.get("/")
async def get_shopping_list(
    current_user=Depends(get_current_user)
):
    """
    Get all shopping list items for the current user's fridge
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            return {
                "status": "success",
                "message": "User has no fridge assigned",
                "data": []
            }
        
        response = supabase.table("shopping_list").select("*").eq(
            "fridge_id", fridge_id
        ).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "data": response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching shopping list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch shopping list: {str(e)}")


@app.post("/")
async def add_shopping_item(
    item: ShoppingItemCreate,
    current_user=Depends(get_current_user)
):
    """
    Add a new item to the shopping list
    
    Original query from shop.tsx:
    supabase
        .from("shopping_list")
        .insert([newItem])
        .select()
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # Override fridge_id to ensure it matches user's fridge
        item_data = item.dict()
        item_data["fridge_id"] = fridge_id
        first = current_user.get("first_name", "") or ""
        last = current_user.get("last_name", "") or ""
        user_name = f"{first} {last}".strip()
        if not user_name:
             user_name = "Unknown"
             
        item_data["requested_by"] = user_name
        
        response = supabase.table("shopping_list").insert(item_data).select().execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "message": "Item added to shopping list",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding shopping item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add item: {str(e)}")


@app.delete("/{item_id}")
async def delete_shopping_item(
    item_id: int,
    current_user=Depends(get_current_user)
):
    """
    Delete an item from the shopping list
    
    Original query from shop.tsx:
    supabase
        .from("shopping_list")
        .delete()
        .eq("id", item.id)
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # Ensure user can only delete items from their fridge
        response = supabase.table("shopping_list").delete().eq(
            "id", item_id
        ).eq("fridge_id", fridge_id).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "message": "Item deleted from shopping list"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting shopping item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")


@app.patch("/{item_id}/quantity")
async def update_item_quantity(
    item_id: int,
    quantity: int,
    current_user=Depends(get_current_user)
):
    """
    Update the quantity of a shopping list item
    
    Original query from shop.tsx:
    supabase
        .from("shopping_list")
        .update({ quantity: newQty })
        .eq("id", item.id)
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        response = supabase.table("shopping_list").update({
            "quantity": max(1, quantity)
        }).eq("id", item_id).eq("fridge_id", fridge_id).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "message": "Item quantity updated",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating item quantity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update quantity: {str(e)}")


@app.patch("/{item_id}/toggle-checked")
async def toggle_item_checked(
    item_id: int,
    current_user=Depends(get_current_user)
):
    """
    Toggle the checked status of a shopping list item
    
    Original query from shop.tsx:
    supabase
        .from("shopping_list")
        .update(updated)
        .eq("id", item.id)
    """
    try:
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # First get the current item
        item_response = supabase.table("shopping_list").select("*").eq(
            "id", item_id
        ).eq("fridge_id", fridge_id).execute()
        
        if not item_response.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        current_item = item_response.data[0]
        new_checked = not current_item.get("checked", False)
        
        # Update the item
        response = supabase.table("shopping_list").update({
            "checked": new_checked,
            "bought_by": user_id if new_checked else None
        }).eq("id", item_id).eq("fridge_id", fridge_id).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "message": "Item status toggled",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling item checked: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle checked: {str(e)}")
