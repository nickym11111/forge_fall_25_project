# EXAMPLE TEMPLATE SETUP
from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Depends, Header
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from service import get_current_user, generate_invite_code
from Join import app as join_router
from ai_expiration import app as ai_expiration_router
from Users import app as users_router
from ShoppingList import app as shopping_router
from CostSplitting import app as cost_splitting_router
from typing import List, Optional, Any
from receiptParsing.chatGPTParse import app as receipt_router
#from ai_expiration import app as ai_expiration_router
from dotenv import load_dotenv


load_dotenv()

# Initialize routers
app = FastAPI()
app.include_router(users_router)
#app.include_router(ai_expiration, tags=["ai"])

# Allow CORS origin policy to allow requests from local origins.
origins = [
    "http://localhost:8081",  # React/Next dev server
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# Data Transfer Objects
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

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

# Fridge items endpoints, this is not done yet it doesn't have shared by or added by logic yet
@app.post("/fridge_items/")
async def create_fridge_item(
    item: FridgeItemCreate,
    current_user = Depends(get_current_user)
):
    try:
        from datetime import datetime, date
        
        # Calculate days till expiration
        expiry = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
        today = date.today()
        days_till_expiration = (expiry - today).days

        fridge_id = current_user.get("fridge_id") if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        response = supabase.table("fridge_items").insert({
            "name": item.title,
            "quantity": item.quantity,
            "days_till_expiration": days_till_expiration, 
            "fridge_id": fridge_id,
            "added_by": current_user.get("id"),
            "shared_by": item.shared_by,
            "price": item.price
        }).execute()
        
        return {
            "status": "success",
            "message": "Fridge item added successfully",
            "data": response.data
        }
    except Exception as e:
        print(f"Error creating fridge item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add item: {str(e)}")

@app.get("/fridge_items/")
def get_fridge_items(current_user = Depends(get_current_user)):
    #Get items from the current user's fridge with user details

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

# Get items expiring soon
@app.get("/fridge_items/expiring-soon/")
def get_expiring_items():
    response = (supabase.table("fridge_items")
               .select("*")
               .lte("days_till_expiration", 3)
               .execute())
    return {"data": response.data}

@app.delete("/items/{item_id}")
def delete_fridge_item(item_id: int):
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}

@join_router.post("/send-invite/")
async def send_fridge_invite(fridge_invite_dto: FridgeInviteDTO):
    # Check if fridge exists
    fridge_data = supabase.table("fridges").select("*").eq("id", fridge_invite_dto.fridge_id).execute()
    
    if not fridge_data.data:
        raise HTTPException(status_code=404, detail="Fridge not found")
    
    # Get owner name for email (use a default name if not available)
    owner_name = "a friend"
    if fridge_data.data[0].get("created_by"):
        owner_data = supabase.table("users").select("first_name").eq("id", fridge_data.data[0]["created_by"]).execute()
        if owner_data.data and owner_data.data[0].get("first_name"):
            owner_name = owner_data.data[0]["first_name"]
    
    results = []
    
    for email in fridge_invite_dto.emails:
        # Generate unique invite code for each email
        invite_code = generate_invite_code()
        
        invitation_data = {
            "fridge_id": fridge_invite_dto.fridge_id,
            "email_to": email,
            "invite_code": invite_code
        }
        
        # Insert invitation data into table
        response = supabase.table("fridge_invitations").insert(invitation_data).execute()
        
        if not response.data:
            results.append({"email": email, "status": "failed", "error": "Failed to create invitation"})
            continue
        
        try:
            # Send email to each recipient
            email_response = supabase.functions.invoke("send-fridge-invite", { "body": {
                "inviteCode": invite_code,
                "recipientEmail": email,
                "senderName": owner_name
            }})
            
            if not email_response:
                results.append({"email": email, "status": "partial", "message": "Invite created but email may not have been sent"})
            else:
                results.append({"email": email, "status": "success", "invite_code": invite_code})
                
        except Exception as email_error:
            print(f"Email error for {email}: {str(email_error)}")
            results.append({"email": email, "status": "partial", "message": f"Error sending email: {str(email_error)}"})
    
    # Check if all invites failed
    if all(result.get("status") == "failed" for result in results):
        raise HTTPException(status_code=500, detail="Failed to send all invitations")
    
    return {
        "status": "success",
        "message": "Invitation processing completed",
        "results": results
    }

# Accept fridge invite
@join_router.post("/accept-invite/")
async def accept_fridge_invite(
    redeem_dto: RedeemFridgeInviteDTO,
    current_user = Depends(get_current_user),
    authorization: str = Header(None)
):
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
            raise HTTPException(status_code=404, detail="Invalid code, expired, or not sent to your email")

        invitation = invite_response.data[0]

        # Update user profile with fridge_id
        profile_response = supabase.table("users").update({
            "fridge_id": invitation["fridge_id"]
        }).eq("id", user_id).execute()

        if not profile_response.data:
            raise HTTPException(status_code=500, detail="Failed to accept invite to fridge")

        # Mark invitation as used
        supabase.table("fridge_invitations").update({
            "used": True,
            "used_at": datetime.utcnow().isoformat(),
        }).eq("id", invitation["id"]).execute()

        return {
            "status": "success",
            "message": f"Successfully joined {invitation['fridges']['name']}!",
            "data": {
                "fridge_id": invitation["fridge_id"],
                "fridge_name": invitation["fridges"]["name"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Include the routers with their prefixes
app.include_router(join_router, prefix="/fridge")
app.include_router(users_router, prefix="/users")
app.include_router(receipt_router, prefix="/receipt")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(cost_splitting_router, prefix="/cost-splitting")
       

# Login Page
class UserLogin(BaseModel):
    email: str
    password: str

#Create a Fridge
class FridgeCreate(BaseModel):
    name: str

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

        if not fridge_id:
            print(f"No ID in response data: {createFridge_response.data}")
            raise HTTPException(status_code=500, detail="Failed to get fridge ID from response")
            
        return {
            "status": "success",
            "message": "Fridge created successfully",
            "fridge_id": fridge_id,
            "data": createFridge_response.data
        }
    except Exception as e:
        error_msg = f"Error creating fridge: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/fridges")
def get_fridges():
    try:
        response = supabase.table("fridges").select("*").execute()
        
        if response.get("error"):
            raise HTTPException(status_code=500, detail=response.error.message)
            
        return {
            "status": "success",
            "data": response.data,
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        print(f"Error fetching fridges: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
