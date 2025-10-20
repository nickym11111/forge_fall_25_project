from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from database import supabase

#Router
app = APIRouter()

#Data Model
class ShoppingItem(BaseModel):
    """Schema for a shopping list item."""
    name: str
    price: Optional[float] = 0.0
    requested_by: Optional[str] = "Unknown"
    bought_by: Optional[str] = None
    checked: Optional[bool] = False


#Create New Item
@app.post("/items/")
def add_item(item: ShoppingItem):
    """
    Add a new shopping list item to the Supabase table.
    """
    try:
        response = (
            supabase.table("ShoppingList")
            .insert({
                "name": item.name,
                "price": item.price,
                "requested_by": item.requested_by,
                "bought_by": item.bought_by,
                "checked": item.checked,
            })
            .execute()
        )
        print("Item added:", response)
        return {"data": response.data, "status": "Item added successfully"}
    except Exception as e:
        print("Error adding item:", e)
        return {"error": str(e)}


#Retrieve All Current Items ---
@app.get("/items/")
def get_items():
    """
    Fetch all items from the shopping list.
    """
    response = supabase.table("ShoppingList").select("*").execute()
    print("Retrieved items:", response.data)
    return {"data": response.data}


#Update Existing Item
@app.put("/items/{item_id}")
def update_item(item_id: str, item: ShoppingItem):
    """
    Update a specific shopping list item by ID.
    """
    response = (
        supabase.table("ShoppingList")
        .update({
            "name": item.name,
            "price": item.price,
            "requested_by": item.requested_by,
            "bought_by": item.bought_by,
            "checked": item.checked,
        })
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data}

#Delete Item
@app.delete("/items/{item_id}")
def delete_item(item_id: str):
    """
    Delete a specific shopping list item by ID.
    """
    response = (
        supabase.table("ShoppingList")
        .delete()
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data}
