# EXAMPLE TEMPLATE SETUP
from dotenv import load_dotenv
load_dotenv()
from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Depends, Header
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from service import get_current_user, generate_invite_code
from Join import app as join_router
from Users import app as users_router
from typing import Optional, Any, List
 # from receiptParsing.chatGPTParse import app as receipt_router
from dotenv import load_dotenv
import ai_expiration

load_dotenv()

# Initialize routers
app = FastAPI()
# app.include_router(users_router)
app.include_router(ai_expiration.router, tags=["ai"])


# Allow CORS origin policy to allow requests from local origins.
origins = [
    "http://localhost:8081",  # React/Next dev server
    "http://localhost:8082",
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
    shared_by: Optional[List[dict]] = None

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

# Fridge items endpoints, this is not done yet it doesn't have shared by or added by logic yet
@app.post("/fridge_items/")
async def create_fridge_item(
    item: FridgeItemCreate,
):
    try:
        from datetime import datetime, date
        
        # Calculate days till expiration
        expiry = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
        today = date.today()
        days_till_expiration = (expiry - today).days
        
        # Hard-code test fridge for now
        fridge_id = "04c3cc6a-a3f3-4abe-a83c-344a75dc8878"  # Replace with real fridge_id later
        
        response = supabase.table("fridge_items").insert({
            "title": item.title,
            "quantity": item.quantity,
            "days_till_expiration": days_till_expiration, 
            "fridge_id": fridge_id,
            "added_by": "TEMP_USER_ID",
            "shared_by": item.shared_by
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
    #Get items from the current user's fridge

    try:
        #Get the user's fridge_id
        user_response = supabase.table("users").select("fridge_id").eq("id", current_user.id).execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=401, detail="User not found")
        
        fridge_id = user_response.data[0].get("fridge_id")
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # Get items only from the user's fridge
        items_response = supabase.table("fridge_items").select("*").eq("fridge_id", fridge_id).execute()
        
        return {
            "status": "success",
            "data": items_response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting fridge items: {str(e)}")
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
        # Check if invite exists and is valid
        invite_response = supabase.table("fridge_invitations").select(
            "*, fridges(name)"
        ).eq(
            "invite_code", redeem_dto.invite_code.upper()
        ).eq(
            "invited_email", current_user.email.lower()
        ).eq(
            "used", False
        ).execute()

        if not invite_response.data:
            raise HTTPException(status_code=404, detail="Invalid code, expired, or not sent to your email")

        invitation = invite_response.data[0]

        # Update user profile with fridge_id
        profile_response = supabase.table("users").update({
            "fridge_id": invitation["fridge_id"]
        }).eq("id", current_user.id).execute()

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
# app.include_router(receipt_router, prefix="/receipt")
       

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
        # Insert the fridge and get the response
        createFridge_response = supabase.table("fridges").insert({
            "name": fridge.name,
            "created_by": current_user.id,
            "created_at": "now()"
        }).execute()

        # Check if the response contains data
        if not createFridge_response.data or len(createFridge_response.data) == 0:
            print(f"No data returned from database: {createFridge_response}")
            raise HTTPException(status_code=500, detail="Failed to create fridge: No data returned")
        
        # Extract the ID from the response
        fridge_id = createFridge_response.data[0].get("id")

        # Gets the response for updating the fridge id for a user
        updateFridgeID_response = supabase.table("users").update({
            "fridge_id": fridge_id
        }).eq("id", current_user.id).execute()

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
        
        if response.error:
            raise HTTPException(status_code=500, detail=response.error.message)
            
        return {
            "status": "success",
            "data": response.data,
            "count": len(response.data) if response.data else 0
        }
    except Exception as e:
        print(f"Error fetching fridges: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
