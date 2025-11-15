from typing import List, Optional, Any
from datetime import datetime, date
from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from database import supabase
from service import get_current_user, generate_invite_code
from Join import app as join_router
from ai_expiration import app as ai_expiration_router
from Users import app as users_router
from ShoppingList import app as shopping_router
from CostSplitting import app as cost_splitting_router
from typing import List, Optional, Any
from receiptParsing.chatGPTParse import app as receipt_router

load_dotenv()

app = FastAPI()
app.include_router(join_router, prefix="/fridge")
app.include_router(users_router, prefix="/users")
app.include_router(receipt_router, prefix="/receipt")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(shopping_router, prefix="/shopping")
app.include_router(users_router)
#app.include_router(ai_expiration, tags=["ai"])

# Allow CORS origin policy to allow requests from local origins.
origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

#Data Models
class FridgeInviteDTO(BaseModel):
    fridge_id: str
    emails: List[str]
    invited_by: Optional[str] = None
    invite_code: Optional[str] = None

class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str

class FridgeItemCreate(BaseModel):
    title: str
    quantity: Optional[int] = 1
    expiry_date: str
    shared_by: Optional[List[str]] = None
    price: Optional[float] = 0.0

class UserLogin(BaseModel):
    email: str
    password: str

class FridgeCreate(BaseModel):
    name: str

# Root Endpoint
@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

#Fridge Item Endpoints
@app.post("/fridge_items/")
async def create_fridge_item(
    item: FridgeItemCreate,
    current_user=Depends(get_current_user)
):
    """Add an item to the user's fridge and remove it from their shopping list."""
    try:
        #Calculate days until expiration
        expiry = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
        days_till_expiration = (expiry - date.today()).days

        #Get the user's fridge_id
        user_response = (
            supabase.table("users")
            .select("fridge_id")
            .eq("id", current_user.id)
            .execute()
        )
        if not user_response.data:
            raise HTTPException(status_code=401, detail="User not found")

        fridge_id = user_response.data[0].get("fridge_id")
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")

        #Add item to fridge
        response = (
            supabase.table("fridge_items")
            .insert({
                "name": item.title,
                "quantity": item.quantity,
                "days_till_expiration": days_till_expiration,
                "fridge_id": fridge_id,
                "added_by": current_user.id,
                "shared_by": getattr(item, "shared_by", None),
            })
            .execute()
        )

        #Remove matching item from shopping list
        supabase.table("shopping_list") \
            .delete() \
            .eq("name", item.title.lower()) \
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

@app.get("/fridge_items/")
def get_fridge_items(current_user = Depends(get_current_user)):
    #Get items from the current user's fridge with user details

@app.get("/fridge_items/")
def get_fridge_items(current_user=Depends(get_current_user)):
    """Get all items from the current user's fridge."""
    try:
        #Get the user's fridge_id
        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            return {
                "status": "success",
                "message": "User has no fridge assigned",
                "data": []
            }        
        # Get items with added_by user details
        items_response = supabase.table("fridge_items").select(
            "*, added_by_user:users!fridge_items_added_by_fkey(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).execute()
        
        # Get all users in this fridge for shared_by lookup
        fridge_users_response = supabase.table("users").select(
            "id, email, first_name, last_name"
        ).eq("fridge_id", fridge_id).execute()
        
        # Create a lookup map of user_id -> user data
        users_map = {}
        for user_data in fridge_users_response.data:
            users_map[user_data["id"]] = {
                "id": user_data["id"],
                "email": user_data.get("email"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
            }
        
        # Transform the data to populate shared_by with user details
        transformed_items = []
        for item in items_response.data:
            # Handle added_by user
            added_by_data = item.get("added_by_user")
            if added_by_data:
                added_by = {
                    "id": added_by_data.get("id"),
                    "email": added_by_data.get("email"),
                    "first_name": added_by_data.get("first_name"),
                    "last_name": added_by_data.get("last_name"),
                }
            else:
                added_by = None
            
            # Handle shared_by - it's stored as a JSONB array of user_ids
            shared_by = []
            shared_by_ids = item.get("shared_by")
            
            if shared_by_ids and isinstance(shared_by_ids, list):
                # Map user IDs to full user objects
                for user_id in shared_by_ids:
                    if user_id in users_map:
                        shared_by.append(users_map[user_id])
            elif not shared_by_ids or shared_by_ids == []:
                # If shared_by is null or empty, it's a receipt item - shared by all
                shared_by = list(users_map.values())
            
            transformed_items.append({
                "id": item["id"],
                "title": item["title"],
                "quantity": item.get("quantity"),
                "days_till_expiration": item.get("days_till_expiration"),
                "price": item.get("price", 0.0),
                "fridge_id": item["fridge_id"],
                "added_by": added_by,
                "shared_by": shared_by if shared_by else None,
                "created_at": item.get("created_at")
            })
        
        return {
            "status": "success",
            "data": transformed_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting fridge items: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get fridge items: {str(e)}")

@app.get("/items/added-by/{user_name}")
def get_items_added_by(user_name: str):
    response = (supabase.table("fridge_items")
               .select("*")
               .contains("added_by", {"name": user_name})
               .execute())
    return {"data": response.data}

@app.get("/fridge_items/expiring-soon/")
def get_expiring_items():
    """Return items expiring within 3 days."""
    response = (
        supabase.table("fridge_items")
        .select("*")
        .lte("days_till_expiration", 3)
        .execute()
    )
    return {"data": response.data}


@app.delete("/items/{item_id}")
def delete_fridge_item(item_id: int):
    """Delete a fridge item by its ID."""
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}

#Fridge Invites
@join_router.post("/send-invite/")
async def send_fridge_invite(fridge_invite_dto: FridgeInviteDTO):
    """Send invite emails to users to join a shared fridge."""
    fridge_data = (
        supabase.table("fridges")
        .select("*")
        .eq("id", fridge_invite_dto.fridge_id)
        .execute()
    )

    if not fridge_data.data:
        raise HTTPException(status_code=404, detail="Fridge not found")

    #Get fridge owner's name
    owner_name = "a friend"
    if fridge_data.data[0].get("created_by"):
        owner_data = (
            supabase.table("users")
            .select("first_name")
            .eq("id", fridge_data.data[0]["created_by"])
            .execute()
        )
        if owner_data.data and owner_data.data[0].get("first_name"):
            owner_name = owner_data.data[0]["first_name"]

    results = []

    #Create and send invites for each email
    for email in fridge_invite_dto.emails:
        invite_code = generate_invite_code()
        invitation_data = {
            "fridge_id": fridge_invite_dto.fridge_id,
            "email_to": email,
            "invite_code": invite_code,
        }

        response = supabase.table("fridge_invitations").insert(invitation_data).execute()
        if not response.data:
            results.append({"email": email, "status": "failed"})
            continue

        try:
            #Call edge function to send the invite email
            supabase.functions.invoke("send-fridge-invite", {
                "body": {
                    "inviteCode": invite_code,
                    "recipientEmail": email,
                    "senderName": owner_name,
                }
            })
            results.append({"email": email, "status": "success", "invite_code": invite_code})
        except Exception as e:
            print(f"Email error for {email}: {e}")
            results.append({"email": email, "status": "partial", "error": str(e)})

    return {
        "status": "success",
        "message": "Invitation processing completed",
        "results": results,
    }


@join_router.post("/accept-invite/")
async def accept_fridge_invite(
    redeem_dto: RedeemFridgeInviteDTO,
    current_user=Depends(get_current_user),
    authorization: str = Header(None),
):
    """Accept a fridge invite using a valid invite code."""
    try:
        # Get user data from dict
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        user_email = current_user.get("email") if isinstance(current_user, dict) else current_user.email
        
        # Check if invite exists and is valid
        invite_response = supabase.table("fridge_invitations").select(
            "*, fridges(name)"
        ).eq(
            "invite_code", redeem_dto.invite_code.upper()
        ).eq(
            "invited_email", user_email.lower()
        ).eq(
            "used", False
        ).execute()

        if not invite_response.data:
            raise HTTPException(status_code=404, detail="Invalid or expired code")

        invitation = invite_response.data[0]

        # Update user profile with fridge_id
        profile_response = supabase.table("users").update({
            "fridge_id": invitation["fridge_id"]
        }).eq("id", user_id).execute()

        if not profile_response.data:
            raise HTTPException(status_code=500, detail="Failed to accept invite")

        #Mark invitation as used
        supabase.table("fridge_invitations").update({
            "used": True,
            "used_at": datetime.utcnow().isoformat(),
        }).eq("id", invitation["id"]).execute()

        return {
            "status": "success",
            "message": f"Joined {invitation['fridges']['name']} successfully!",
            "data": {
                "fridge_id": invitation["fridge_id"],
                "fridge_name": invitation["fridges"]["name"],
            },
        }

    except Exception as e:
        print(f"Error accepting invite: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

#Fridge Management
@app.post("/fridges")
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
# Include the routers with their prefixes
app.include_router(join_router, prefix="/fridge")
app.include_router(users_router, prefix="/users")
app.include_router(receipt_router, prefix="/receipt")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(cost_splitting_router, prefix="/cost-splitting")
       

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create fridge")

        fridge_id = response.data[0].get("id")

@app.post("/fridges")
def create_fridge(fridge: FridgeCreate, current_user = Depends(get_current_user)):
    try:
        # Get user ID from dict
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        # Insert the fridge and get the response
        createFridge_response = supabase.table("fridges").insert({
            "name": fridge.name,
            "created_by": user_id,
            "created_at": "now()"
        }).execute()

        # Check if the response contains data
        if not createFridge_response.data or len(createFridge_response.data) == 0:
            print(f"No data returned from database: {createFridge_response}")
            raise HTTPException(status_code=500, detail="Failed to create fridge: No data returned")
        
        fridge_id = createFridge_response.data[0].get("id")


        # Gets the response for updating the fridge id for a user
        updateFridgeID_response = supabase.table("users").update({
            "fridge_id": fridge_id
        }).eq("id", user_id).execute()

        if not updateFridgeID_response.data or len(updateFridgeID_response.data) == 0:
            print(f"Error updating user fridge ID: {updateFridgeID_response}")
            raise HTTPException(status_code=500, detail = "Error updating user fridge ID")

        return {
            "status": "success",
            "message": "Fridge created successfully",
            "fridge_id": fridge_id,
            "data": response.data,
        }

    except Exception as e:
        print(f"Error creating fridge: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/fridges")
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
