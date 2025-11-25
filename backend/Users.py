from fastapi import APIRouter, HTTPException, Depends
from database import supabase  
from pydantic import BaseModel
from typing import List, Optional
from service import get_current_user, generate_invite_code, get_current_user_with_fridgeMates
import ast
import base64
import uuid

app = APIRouter()
#TEMPLATE to get started :)

@app.get("/")
def get_users():
    
    try:
        response = response = supabase.table("users").select("*").execute()
        return {"data": response.data, "error": None}
    except Exception as e:
        return {"data": None, "error": str(e)}


class UserCreate(BaseModel):
    email: str
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    dietaryRestrictions: Optional[List[str]] = None

class ProfilePhotoUpdate(BaseModel):
    profile_photo: str
    
    
def findAccount(email: str):
    response = supabase.auth.get_user(email)
    return response

@app.post("/sign-up")
async def create_user(user: UserCreate):
    try:
        # Example of using the database session
        supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "first_name": user.firstName,
                    "last_name": user.lastName,
                    "dietary_restrictions": user.dietaryRestrictions
                },
                "email_redirect_to": "http://localhost:8081/" # Redirect to this URL after email confirmation
            }
        })  
        #supabase.table("users").insert({"first_name": user.firstName, "last_name": user.lastName, "email": user.email}).execute()
        return {"email": user.email, 
                "firstName": user.firstName,
                "lastName": user.lastName,
                "status": "User created successfully"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/userInfo")
async def get_current_user_info(current_user = Depends(get_current_user_with_fridgeMates)):
    try:
        user_data = current_user if isinstance(current_user, dict) else {
            "id": current_user.id,
            "email": current_user.email,
            "fridge_id": None,
            "first_name": None,
            "last_name": None,
            "fridgeMates": [],
            "profile_photo": None
        }
        
        if user_data.get("fridge_id"):
            fridge_response = supabase.table("fridges").select("*").eq("id", user_data["fridge_id"]).execute()
            
            if fridge_response.data and len(fridge_response.data) > 0:
                user_data["fridge"] = fridge_response.data[0]
            else:
                user_data["fridge"] = None
        else:
            user_data["fridge"] = None
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/profile_photo")
async def add_profile_photo(photo_data: ProfilePhotoUpdate, current_user = Depends(get_current_user)):
    try:
        MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB in bytes
        base64_size = len(photo_data.profile_photo)
        approximate_original_size = (base64_size * 3) / 4
        
        if approximate_original_size > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=400, 
                detail=f"Image size exceeds 5MB limit. Approximate size: {approximate_original_size / (1024 * 1024):.2f}MB"
            )
        
        user_id = current_user.get("id") if isinstance(current_user, dict) else current_user.id
        
        # Decode base64 image
        image_data = base64.b64decode(photo_data.profile_photo)
        
        # Generate unique filename
        file_name = f"{user_id}/{uuid.uuid4()}.jpg"
        
        # Delete old profile photo if exists
        try:
            user_response = supabase.table("users").select("profile_photo").eq("id", user_id).execute()
            if user_response.data and user_response.data[0].get("profile_photo"):
                old_photo_url = user_response.data[0]["profile_photo"]
                # Extract file path from URL if it's a storage URL
                if "profile-photos/" in old_photo_url:
                    old_file_path = old_photo_url.split("profile-photos/")[1].split("?")[0]
                    supabase.storage.from_("profile-photos").remove([old_file_path])
        except Exception as e:
            print(f"Error deleting old photo: {str(e)}")
        
        # Upload to Supabase Storage
        print(f"Uploading image to storage: {file_name}")
        try:
            storage_response = supabase.storage.from_("profile-photos").upload(
                file_name,
                image_data,
                file_options={"content-type": "image/jpeg"}
            )
            print(f"Storage response: {storage_response}")
        except Exception as storage_error:
            error_msg = f"Storage upload error: {str(storage_error)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Get public URL (upload was successful if we reach here)
        public_url = supabase.storage.from_("profile-photos").get_public_url(file_name)
        print(f"Generated public URL: {public_url}")
        
        # Update user record with storage URL
        response = supabase.table("users").update({
            "profile_photo": public_url
        }).eq("id", user_id).execute()
        
        print(f"Database update response: {response.data}")
        
        return {"data": response.data, "status": "Profile photo updated successfully", "url": public_url}
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error updating profile photo: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)