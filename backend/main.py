# EXAMPLE TEMPLATE SETUP
from fastapi import FastAPI, HTTPException, Depends, Header
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from service import get_current_user, generate_invite_code
app = FastAPI()


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
    allow_methods=["*"], # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

app.include_router(join_router, prefix="/fridge")  # ← now /fridge/join works
app.include_router(users_router, prefix="/users")  # ← now /user/ endpoints work
# Data Transfer Object for fridge invite
class FridgeInviteDTO(BaseModel):
    fridge_id: str
    email_to: str
    invited_by: str
    invite_code: str

# Data Transfer Object for redeem fridge invite
class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str

@app.get("/")
def read_root():
    return {"message": "Hello from backend with Supabase!"}

class FridgeItem(BaseModel):
    title: str
    added_by: Optional[Any] = None  # store JSON (user info)
    shared_by: Optional[Any] = None # store JSON (list or user info)
    quantity: Optional[int] = None
    days_till_expiration: Optional[int] = None

@app.post("/fridge_items/")
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
def get_fridge_items():
    response = supabase.table("fridge_items").select("*").execute()
    return {"data": response.data}

# Gets items by user 
@app.get("/fridge_items/added-by/{user_name}")
def get_items_added_by(user_name: str):
    response = supabase.table("fridge_items") \
        .select("*") \
        .contains("added_by", {"name": user_name}) \
        .execute()
    return {"data": response.data}

# Get items expiring soon
@app.get("/fridge_items/expiring-soon/")
def get_expiring_items():
    response = supabase.table("fridge_items") \
        .select("*") \
        .lte("days_till_expiration", 3) \
        .execute()
    return {"data": response.data}

# Delete an item 
@app.delete("/fridge_items/{item_id}")
def delete_fridge_item(item_id: int):
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}

# Login Page
class UserLogin(BaseModel):
    email: str
    password: str

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

#Create a Fridge
class FridgeCreate(BaseModel):
    name: str
    emails: List[str]

@app.post("/fridges")
def create_fridge(fridge: FridgeCreate):
    response = supabase.table("fridges").insert({
        "name": fridge.name,
        "emails": fridge.emails
    }).execute()

    if response.error:
        return {"error": response.error}

    return {"data": response.data, "status": "Fridge created successfully"}

@app.get("/fridges")
def get_fridges():
    response = supabase.table("fridges").select("*").execute()
    return {"data": response.data, "error": response.error}

# Send fridge invite
@app.post("/send-fridge-invite/")
async def send_fridge_invite(fridge_invite_dto: FridgeInviteDTO, current_user = Depends(get_current_user)):
    # Check if Authenticated User is the owner of the fridge
    owner_id = supabase.table("fridges").select("created_by").eq("id", fridge_invite_dto.fridge_id).execute()

    if not owner_id.data:
        raise HTTPException(status_code=404, detail="Fridge not found")
    
    if owner_id.data[0]["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the owner of this fridge")
    
    invite_code = generate_invite_code()
    
    invitation_data = {
        "fridge_id": fridge_invite_dto.fridge_id,
        "email_to": fridge_invite_dto.email_to,
        "invited_by": fridge_invite_dto.invited_by,
        "invite_code": invite_code
    }
    # Insert invitation data into table
    response = supabase.table("fridge_invitations").insert(invitation_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to send invite")
    
    try:
        owner_name = supabase.table("users").select("first_name").eq("id", owner_id.data[0]["created_by"]).execute()

        if not owner_name.data:
            raise HTTPException(status_code=404, detail="Owner not found")

        # Invoke Edge Function to send email
        email_response = supabase.functions.invoke("send-fridge-invite", { "body": {
            "inviteCode": invite_code,
            "recipientEmail": fridge_invite_dto.email_to,
            "senderName": owner_name.data[0]["first_name"]
        }})

        if not email_response:
            print("Failed to send invite")
    
    except Exception as email_error:
            print(f"Email error: {str(email_error)}")

    return {
            "status": "success",
            "message": "Invitation sent successfully",
            "data": {
                "invite_code": invite_code,
                "invited_email": fridge_invite_dto.email_to
            }
        }

# Accept fridge invite
@app.post("/accept-fridge-invite/")
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
        profile_response = supabase.table("profiles").update({
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
            
    
       
