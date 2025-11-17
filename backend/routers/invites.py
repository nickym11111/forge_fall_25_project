from fastapi import APIRouter, Depends, HTTPException, Header
from typing import List, Optional
from pydantic import BaseModel
from routers import fridges
from service import get_current_user, generate_invite_code
from database import supabase
from datetime import datetime

app = APIRouter()

class FridgeInviteDTO(BaseModel):
    fridge_id: str
    emails: List[str]
    invited_by: Optional[str] = None
    invite_code: Optional[str] = None

class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str

class JoinRequest(BaseModel):
    fridge_code: str

class LeaveRequest(BaseModel):
    fridgeId: str
    userId: str

# Send fridge invite
@app.post("/send-invite/")
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


# Accept fridge invite
@app.post("/accept-invite/")
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


# Join a fridge by code
@app.post("/join-fridge/")
def join_fridge(request: JoinRequest):
    code_to_check = request.fridgeCode

    try:
        response = supabase.table("fridges").select("id, name").eq("invite_code", code_to_check).execute()
        
        if response.data:
            found_fridge = response.data[0]
            return {"status": "success", "message": f"Successfully joined fridge: {found_fridge['name']}"}
        else:
            return {"status": "error", "message": "Invalid fridge code. Please try again."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Leave a Fridge
@app.post("/leave-fridge")
def leave_fridge(request: LeaveRequest):
    fridge_id = request.fridgeId
    user_id = request.userId

    try:
        response = supabase.table("users").select("id, fridge_id").eq("id", user_id).execute()
        if response.data:
            user = response.data[0]
            if user["fridge_id"] == fridge_id:
                supabase.table("users").update({"fridge_id": None}).eq("id", user_id).execute()
            
            return {"status": "success", "message": f"Successfully left fridge: {fridges}"}
        else:
            return {"status": "error", "message": "Invalid fridge code. Please try again."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}