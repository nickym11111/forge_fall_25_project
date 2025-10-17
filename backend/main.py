from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Depends, Header
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
=======
from Join import app as join_router
from Users import app as users_router
from typing import List, List, Optional, Any
from ai_expiration import router as ai_router 
>>>>>>> 46849d4 (added list import)
from datetime import datetime
from service import get_current_user, generate_invite_code
<<<<<<< HEAD
from Join import app as join_router
from Users import app as users_router
from typing import Optional, Any, List
from receiptParsing.chatGPTParse import app as receipt_router
from ai_expiration import router as ai_router 

=======
from receiptParsing.chatGPTParse import getChatGPTResponse
<<<<<<< HEAD
>>>>>>> 0000e52 (backend changes)
=======
from receiptParsing.chatGPTParse import app as receipt_router
>>>>>>> c236aae (Add receipt parsing endpoint and update API routes)

# Initialize routers
app = FastAPI()
app.include_router(users_router)

# Allow CORS origin policy to allow requests from local origins.
origins = [
<<<<<<< HEAD
    "http://localhost:8081",  # React/Next dev server
    "http://localhost:8081",
=======
    "http://localhost:8081", 
>>>>>>> ed04c8d (Fixed frontend/backend connection, updated UI to match other pages, added a remove emails button, etc)
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

class FridgeItem(BaseModel):
    title: str
    added_by: Optional[Any] = None  # store JSON (user info)
    shared_by: Optional[Any] = None  # store JSON (list or user info)
    quantity: Optional[int] = None
    days_till_expiration: Optional[int] = None

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

# Fridge items endpoints
@join_router.post("/items/")
def create_fridge_item(item: FridgeItem):
    try:
        response = supabase.table("fridge_items").insert({
            "title": item.title,
            "added_by": item.added_by,
            "shared_by": item.shared_by,
            "quantity": item.quantity,
            "days_till_expiration": item.days_till_expiration
        }).execute()
        return {"data": response.data, "status": "Fridge item added successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/fridge_items/")
<<<<<<< HEAD
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

=======
def get_fridge_items():
    response = supabase.table("fridge_items").select("*").execute()
    return {"data": response.data}

>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
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

<<<<<<< HEAD
@join_router.post("/send-invite/")
=======
# Getting the shared users
@app.get("/")
def get_users():
    try:
        response = supabase.table("users").select("*").execute()
        return {"data": response.data}
    except Exception as e:
        return {"data": [], "error": str(e)}

@app.post("/send-invite/")
>>>>>>> 5ca5d15 (Refactor image picking logic and remove redundant comments in ParseReceiptScreen)
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
app.include_router(receipt_router, prefix="/receipt")
       

# Login Page
class UserLogin(BaseModel):
    email: str
    password: str

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
"""
>>>>>>> 4086f2f (Added global auth logic, allowed for fridgeID tracking)
@app.post("/log-in/")
async def login_user(user: UserLogin):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        # The response contains user + session data if valid
        return {
            "user": res.user,
            "session": res.session,  # includes access_token, refresh_token, etc.
            "status": "Login successful"
        }
    except Exception as e:
        return {"error": str(e)}
"""

>>>>>>> ed04c8d (Fixed frontend/backend connection, updated UI to match other pages, added a remove emails button, etc)
#Create a Fridge
class FridgeCreate(BaseModel):
    name: str

@app.post("/fridges")
<<<<<<< HEAD
<<<<<<< HEAD
def create_fridge(fridge: FridgeCreate, current_user = Depends(get_current_user)):
    try:
        # Insert the fridge and get the response
        createFridge_response = supabase.table("fridges").insert({
            "name": fridge.name,
            "created_by": current_user.id,
=======
def create_fridge(fridge: FridgeCreate):
=======
def create_fridge(fridge: FridgeCreate, current_user = Depends(get_current_user)):
>>>>>>> 4086f2f (Added global auth logic, allowed for fridgeID tracking)
    try:
        # Insert the fridge and get the response
        response = supabase.table("fridges").insert({
            "name": fridge.name,
<<<<<<< HEAD
>>>>>>> cebe5c0 (fixes to create fridge flow)
=======
            "created_by": current_user.id,
>>>>>>> 4086f2f (Added global auth logic, allowed for fridgeID tracking)
            "created_at": "now()"
        }).execute()

        # Check if the response contains data
<<<<<<< HEAD
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
=======
        if not response.data or len(response.data) == 0:
            print(f"No data returned from database: {response}")
            raise HTTPException(status_code=500, detail="Failed to create fridge: No data returned")
        
        # Extract the ID from the response
        fridge_id = response.data[0].get("id")

        updateFridgeID_response = supabase.table("users").update({
            "fridge_id": fridge_id
        }).eq("id", current_user.id).execute()

        if not updateFridgeID_response.data or len(updateFridgeID_response.data) == 0:
            print(f"Error updating user fridge ID: {updateFridgeID_response}")
            raise HTTPException(status_code=500, detail = "Error updating user fridge ID")

        if not fridge_id:
            print(f"No ID in response data: {response.data}")
>>>>>>> cebe5c0 (fixes to create fridge flow)
            raise HTTPException(status_code=500, detail="Failed to get fridge ID from response")
            
        return {
            "status": "success",
            "message": "Fridge created successfully",
            "fridge_id": fridge_id,
<<<<<<< HEAD
            "data": createFridge_response.data
=======
            "data": response.data
>>>>>>> cebe5c0 (fixes to create fridge flow)
        }
    except Exception as e:
        error_msg = f"Error creating fridge: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
<<<<<<< HEAD

=======
>>>>>>> cebe5c0 (fixes to create fridge flow)


@app.get("/fridges")
def get_fridges():
<<<<<<< HEAD
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
=======
    response = supabase.table("fridges").select("*").execute()
    return {"data": response.data, "error": response.error}    
class Receipt(BaseModel):
    base64Image: str

@app.post("/parse-receipt")
def parse_receipt(receipt: Receipt):
    try:
        return getChatGPTResponse(receipt.base64Image);
    except Exception as e:
        error_msg = f"Error parsing receipt: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
>>>>>>> 0000e52 (backend changes)
