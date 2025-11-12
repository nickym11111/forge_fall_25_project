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
from receiptParsing.chatGPTParse import app as receipt_router

load_dotenv()

app = FastAPI()
app.include_router(join_router, prefix="/fridge")
app.include_router(users_router, prefix="/users")
app.include_router(receipt_router, prefix="/receipt")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(shopping_router, prefix="/shopping")
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
    shared_by: Optional[List[dict]] = None

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
        supabase.table("ShoppingList") \
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
def get_fridge_items(current_user=Depends(get_current_user)):
    """Get all items from the current user's fridge."""
    try:
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

        items_response = (
            supabase.table("fridge_items")
            .select("*")
            .eq("fridge_id", fridge_id)
            .execute()
        )

        return {"status": "success", "data": items_response.data}

    except Exception as e:
        print(f"Error getting fridge items: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get fridge items: {e}")


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
        invite_response = (
            supabase.table("fridge_invitations")
            .select("*, fridges(name)")
            .eq("invite_code", redeem_dto.invite_code.upper())
            .eq("invited_email", current_user.email.lower())
            .eq("used", False)
            .execute()
        )

        if not invite_response.data:
            raise HTTPException(status_code=404, detail="Invalid or expired code")

        invitation = invite_response.data[0]

        #Update user profile with fridge_id
        profile_response = (
            supabase.table("users")
            .update({"fridge_id": invitation["fridge_id"]})
            .eq("id", current_user.id)
            .execute()
        )

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
