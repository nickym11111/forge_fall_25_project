from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import supabase

app = APIRouter()

# Data Model
class ShoppingItem(BaseModel):
    name: str
    price: Optional[float] = 0.0
    requested_by: str             
    bought_by: Optional[str] = None  
    checked: Optional[bool] = False  
    need_by: Optional[str] = None   
    fridge_id: str   

# Create a new shopping item
@app.post("/items/")
def add_item(item: ShoppingItem):

    if not item.fridge_id:
        raise HTTPException(status_code=400, detail="fridge_id is required")


    response = (
        supabase.table("ShoppingList")
        .insert({
            "name": item.name,
            "price": item.price,
            "requested_by": item.requested_by,
            "bought_by": item.bought_by,
            "checked": item.checked,
            "need_by": item.need_by,
            "fridge_id": item.fridge_id,
        })
        .execute()
    )
    return {"data": response.data, "status": "Item added successfully"}

# Get all shopping items
@app.get("/items/")
def get_items(fridge_id: str = Query(...)):
    response = (
        supabase.table("ShoppingList")
        .select("*")
        .eq("fridge_id", fridge_id)
        .execute()
    )
    return {"data": response.data}

# Update an existing item
@app.put("/items/{item_id}")
def update_item(item_id: str, item: ShoppingItem):
    if not item.fridge_id:
        raise HTTPException(status_code=400, detail="fridge_id is required")

    response = (
        supabase.table("ShoppingList")
        .update({
            "name": item.name,
            "price": item.price,
            "requested_by": item.requested_by,
            "bought_by": item.bought_by,
            "checked": item.checked,
            "need_by": item.need_by,
            "fridge_id": item.fridge_id,
        })
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data, "status": "Item updated successfully"}

# Delete an item by ID
@app.delete("/items/{item_id}")
def delete_item(item_id: str):
    response = supabase.table("ShoppingList").delete().eq("id", item_id).execute()
    return {"data": response.data, "status": "Item deleted successfully"}

# Delete an item by name
@app.delete("/items/remove_by_name")
def remove_item_by_name(name: str, fridge_id: str):
    response = (
        supabase.table("ShoppingList")
        .delete()
        .ilike("name", name)
        .eq("fridge_id", fridge_id)
        .execute()
    )
    return {
        "status": "success",
        "deleted": len(response.data),
        "data": response.data
    }
