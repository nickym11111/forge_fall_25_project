from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4
from typing import Optional
from database import supabase
from pydantic import BaseModel

app = APIRouter()

class ShoppingItem(BaseModel):
    name: str
    quantity: Optional[int]
    requested_by: Optional[str]
    bought_by: Optional[str] = None
    checked: Optional[bool] = False
    need_by: Optional[str] = None
    fridge_id: Optional[str] = None   

# Add item to shopping list
@app.post("/items/")
def add_item(item: ShoppingItem):

    if not item.fridge_id:
        item.fridge_id = str(uuid4())

    response = (
    supabase.table("shopping_list")
    .insert({
        "name": item.name,
        "quantity": item.quantity,
        "requested_by": item.requested_by,
        "bought_by": item.bought_by,
        "checked": item.checked,
        "need_by": item.need_by,
        "fridge_id": item.fridge_id,
    })
    .execute()
)
    print("Supabase insert response:", response)
    
    if not response.data:
        raise HTTPException(status_code=400, detail=f"Supabase error: {response.error.message}")

    return {"data": response.data, "status": "Item added successfully"}


# Get shopping list items
@app.get("/items/")
def get_items(fridge_id: str = Query(...)):
    response = (
        supabase.table("shopping_list")
        .select("*")
        .eq("fridge_id", fridge_id)
        .execute()
    )
    return {"data": response.data}


# Update an existing item
@app.put("/items/{item_id}")
def update_item(item_id: str, item: ShoppingItem):
  
    response = (
        supabase.table("shopping_list")
        .update({
            "name": item.name,
            "quantity": item.quantity,
            "requested_by": item.requested_by,
            "bought_by": item.bought_by,
            "checked": item.checked,   # fixed
            "need_by": item.need_by,
            "fridge_id": item.fridge_id,
        })
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data, "status": "Item updated successfully"}


# Delete shopping list item by item_id
@app.delete("/{item_id}")
def delete_item(item_id: str):
    response = supabase.table("shopping_list").delete().eq("id", item_id).execute()
    return {"data": response.data, "status": "Item deleted successfully"}

# Delete shopping list item by name
@app.delete("/remove_by_name")
def remove_item_by_name(name: str, fridge_id: str):
    response = (
        supabase.table("shopping_list")
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
