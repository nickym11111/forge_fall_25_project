from typing import List, Any, Optional, Dict
from fastapi import FastAPI, HTTPException, Depends, Header
from database import supabase
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from service import get_current_user, generate_invite_code
from Join import app as join_router
#from ai_expiration import app as ai_expiration_router
from Users import app as users_router
from ShoppingList import app as shopping_router
from CostSplitting import app as cost_splitting_router
from typing import List, Optional, Any
from receiptParsing.chatGPTParse import app as receipt_router
from recipes import app as recipes_router
from RecipeGen2 import app as recipe_gen_router
from ai_expiration import app as ai_expiration_router
from recipes import app as recipes_router
from favorite_recipes import app as favorite_recipes_router
#from ai_expiration import app as ai_expiration_router
from dotenv import load_dotenv

# Import new API routers
from api.fridge_requests import app as fridge_requests_api_router
from api.shopping_list import app as shopping_list_api_router
from api.profile_photos import app as profile_photos_router

load_dotenv()
app = FastAPI()
app.include_router(users_router)
app.include_router(recipes_router)
app.include_router(recipe_gen_router)
#app.include_router(ai_expiration_router, tags=["ai"])

# Allow CORS origin policy to allow requests from local origins.
origins = [
    "http://localhost:8081",  # React/Next dev server
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "*",  # Allow all origins for development (mobile app)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # allow POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)


app.include_router(join_router, prefix="/fridge")  # ← now /fridge/join works
app.include_router(users_router, prefix="/users")  # ← now /user/ endpoints work
# Data Transfer Object for fridge invite
class FridgeInviteDTO(BaseModel):
    fridge_id: str
    emails: List[str]
    invited_by: Optional[str] = None
    invite_code: Optional[str] = None

# Data Transfer Object for redeem fridge invite
class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str

class RedeemFridgeInviteDTO(BaseModel):
    invite_code: str
# Data Transfer Objects
class RequestJoinDTO(BaseModel):
    fridgeCode: str

class FridgeItemCreate(BaseModel):
    name: str
    quantity: Optional[int] = 1
    expiry_date: str
    shared_by: Optional[List[str]] = None
    price: Optional[float]

class AcceptFridgeRequestDTO(BaseModel):
    request_id: str

class DeclineFridgeRequestDTO(BaseModel):
    request_id: str


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

        fridge_id = current_user["fridge_id"] if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # insert new item to fridge
        response = supabase.table("fridge_items").insert({
            "name": item.name.strip().lower(),
            "quantity": item.quantity,
            "days_till_expiration": days_till_expiration,
            "fridge_id": fridge_id,
            "added_by": current_user["id"],
            "shared_by": item.shared_by,
            "price": item.price
        }).execute()

        #check off matching item in shopping_list
        supabase.table("shopping_list") \
            .update({"checked": True}) \
            .ilike("name", item.name.strip().lower()) \
            .eq("fridge_id", fridge_id) \
            .eq("checked", False) \
            .execute()
        
        return {
            "status": "success",
            "message": "Fridge item added and shopping list item checked off",
            "data": response.data,
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
        
        memberships_response = supabase.table("fridge_memberships").select(
            "users(id, email, first_name, last_name)"
        ).eq("fridge_id", fridge_id).execute()

        users_map = {}
        if memberships_response.data:
            for membership in memberships_response.data:
                if membership.get("users"):
                    user_data = membership["users"]
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
                "name": item["name"],
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

@app.put("/fridge_items/{item_id}")
async def update_fridge_item(
    item_id: int,
    item: FridgeItemCreate,
    current_user = Depends(get_current_user)
):
    try:
        from datetime import datetime, date
        
        # Calculate days till expiration
        expiry = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
        today = date.today()
        days_till_expiration = (expiry - today).days

        fridge_id = current_user["fridge_id"] if isinstance(current_user, dict) else None
        
        if not fridge_id:
            raise HTTPException(status_code=403, detail="User has no fridge assigned")
        
        # Update the item
        response = supabase.table("fridge_items").update({
            "name": item.name,
            "quantity": item.quantity,
            "days_till_expiration": days_till_expiration,
            "shared_by": item.shared_by,
            "price": item.price,
        }).eq("id", item_id).eq("fridge_id", fridge_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Item not found or you don't have permission to update it")
        
        return {
            "status": "success",
            "message": "Fridge item updated successfully",
            "data": response.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating fridge item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update item: {str(e)}")

@app.delete("/items/{item_id}")
def delete_fridge_item(item_id: int):
    response = supabase.table("fridge_items").delete().eq("id", item_id).execute()
    return {"data": response.data}

@join_router.post('/request-join')
def request_join_fridge(request_join_dto: RequestJoinDTO, current_user = Depends(get_current_user)):
    try:
        # Check if fridge with code exists
        fridge_data = supabase.table("fridges").select("*").eq("fridge_code", request_join_dto.fridgeCode).execute()
        
        if not fridge_data.data:
            raise HTTPException(status_code=404, detail="Fridge with code" + request_join_dto.fridgeCode + "not found")
        
        # Create request record in fridge_requests table
        request_data = supabase.table("fridge_requests").insert({
            "fridge_id": fridge_data.data[0]["id"],
            "requested_by": current_user["id"],
            "acceptance_status": "PENDING"
        }).execute()
        
        return {
            "status": "success",
            "message": "Fridge request added successfully",
            "data": request_data.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error requesting to join fridge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to request to join fridge: {str(e)}")
        
# Accept fridge request
@join_router.post("/accept-request/")
async def accept_fridge_request(
    accept_dto: AcceptFridgeRequestDTO,
    authorization: str = Header(None)
):
    try:
        # Check if fridge request exists and is valid
        request_response = supabase.table("fridge_requests").select(
            "*, fridges(name)"
        ).eq(
            "id", accept_dto.request_id
        ).eq(
            "acceptance_status", "PENDING"
        ).execute()

        if not request_response.data:
            raise HTTPException(status_code=404, detail="Invalid code, expired, or not sent to your email")

        fridge_request = request_response.data[0]
        fridge_id = fridge_request["fridge_id"]
        user_id = fridge_request["requested_by"]

        existing_membership = supabase.table("fridge_memberships").select("*").eq(
            "user_id", user_id
        ).eq("fridge_id", fridge_id).execute()
        
        if existing_membership.data:
            # Already a member, just mark request as accepted
            supabase.table("fridge_requests").update({
                "acceptance_status": "ACCEPTED",
            }).eq("id", fridge_request["id"]).execute()
            
            return {
                "status": "success",
                "message": f"Already a member of {fridge_request['fridges']['name']}!",
            }

        membership_response = supabase.table("fridge_memberships").insert({
            "user_id": user_id,
            "fridge_id": fridge_id
        }).execute()

        if not membership_response.data:
            raise HTTPException(status_code=500, detail="Failed to add user to fridge")

        user_response = supabase.table("users").select("active_fridge_id").eq("id", user_id).execute()
        
        if user_response.data and not user_response.data[0].get("active_fridge_id"):
            supabase.table("users").update({
                "active_fridge_id": fridge_id
            }).eq("id", user_id).execute()

        # Mark request as accepted
        supabase.table("fridge_requests").update({
            "acceptance_status": "ACCEPTED",
        }).eq("id", fridge_request["id"]).execute()

        return {
            "status": "success",
            "message": f"Successfully joined {fridge_request['fridges']['name']}!",
            "data": {
                "fridge_id": fridge_request["fridge_id"],
                "fridge_name": fridge_request["fridges"]["name"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/decline-request/")
async def decline_fridge_request(
    decline_dto: DeclineFridgeRequestDTO,
    authorization: str = Header(None)
):
    try:
        # Check if fridge request exists and is valid
        request_response = supabase.table("fridge_requests").select(
            "*, fridges(name)"
        ).eq(
            "id", decline_dto.request_id
        ).eq(
            "acceptance_status", "PENDING"
        ).execute()

        if not request_response.data:
            raise HTTPException(status_code=404, detail="Invalid code, expired, or not sent to your email")

        fridge_request = request_response.data[0]

        # Mark request as declined
        supabase.table("fridge_requests").update({
            "acceptance_status": "DECLINED",
        }).eq("id", fridge_request["id"]).execute()

        return {
            "status": "success",
            "message": f"Successfully declined request to join {fridge_request['fridges']['name']}!"
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
app.include_router(recipes_router, prefix="/recipes")
app.include_router(favorite_recipes_router, prefix="/favorite-recipes")
app.include_router(ai_expiration_router, prefix="/expiry")
app.include_router(cost_splitting_router, prefix="/cost-splitting")
app.include_router(shopping_router, prefix="/shopping")

# Include new API routers
app.include_router(fridge_requests_api_router, prefix="/api/fridge-requests", tags=["api", "fridge-requests"])
app.include_router(shopping_list_api_router, prefix="/api/shopping-list", tags=["api", "shopping-list"])
app.include_router(profile_photos_router, prefix="/api/profile-photos", tags=["api", "profile-photos"])
       

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

@app.post("/fridges")
def create_fridge(fridge: FridgeCreate, current_user = Depends(get_current_user)):
    try:
        # Get user ID from dict
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        # Insert the fridge and get the response
        response = supabase.table("fridges").insert({
            "name": fridge.name,
            "created_by": current_user["id"],
            "created_at": "now()",
            "fridge_code": generate_invite_code()
        }).execute()

        # Check if the response contains data
        if not response.data or len(response.data) == 0:
            print(f"No data returned from database: {response}")
            raise HTTPException(status_code=500, detail="Failed to create fridge: No data returned")
        
        fridge_id = response.data[0].get("id")

        if not fridge_id:
            print(f"No ID in response data: {response.data}")
            raise HTTPException(status_code=500, detail="Failed to get fridge ID from response")

        membership_response = supabase.table("fridge_memberships").insert({
            "user_id": user_id,
            "fridge_id": fridge_id
        }).execute()

        if not membership_response.data:
            raise HTTPException(status_code=500, detail="Failed to add user to fridge")

        active_fridge_response = supabase.table("users").update({
            "active_fridge_id": fridge_id
        }).eq("id", user_id).execute()

        if not active_fridge_response.data or len(active_fridge_response.data) == 0:
            print(f"Error updating user active_fridge_id: {active_fridge_response}")
            raise HTTPException(status_code=500, detail="Error setting active fridge")
            
        return {
            "status": "success",
            "message": "Fridge created successfully",
            "fridge_id": fridge_id,
            "data": response.data
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
