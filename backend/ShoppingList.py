from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from database import supabase

app = APIRouter()

#Data Model
class ShoppingItem(BaseModel):
    name: str
    price: Optional[float] = 0.0
    requested_by: str
    bought_by: Optional[str] = None
    checked: Optional[bool] = False
    need_by: Optional[str] = None    

class User(BaseModel):
    id: str
    fridge_id: str #should this be an array?

#Create New Item
@app.post("/items/")
def add_item(item: ShoppingItem, user: User):
    try:
        response = (
            supabase.table("ShoppingList")
            .insert({
                "name": item.name,
                "price": item.price,
                "requested_by": item.requested_by,
                "bought_by": item.bought_by,
                "checked": item.checked,
                "need_by": item.need_by,
                "shared_with": item.shared_with,
                "fridge_id" : user.fridge_id
            })
            .execute()
        )
        print("Item added:", response)
        return {"data": response.data, "status": "Item added successfully"}
    
    except Exception as e:
        print("Error adding item:", e)
        return {"error": str(e)}

#Get All Current Items
@app.get("/items/")
def get_items():
    response = supabase.table("ShoppingList").select("*").execute()
    print("Retrieved items:", response.data)
    return {"data": response.data}

#Update Existing Item
@app.put("/items/{item_id}")
def update_item(item_id: str, item: ShoppingItem):
    response = (
        supabase.table("ShoppingList")
        .update({
            "name": item.name,
            "price": item.price,
            "requested_by": item.requested_by,
            "bought_by": item.bought_by,
            "checked": item.checked,
            "need_by": item.need_by,
        })
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data}

#Delete Item
@app.delete("/items/{item_id}")
def delete_item(item_id: str):
    response = (
        supabase.table("ShoppingList")
        .delete()
        .eq("id", item_id)
        .execute()
    )
    return {"data": response.data}
