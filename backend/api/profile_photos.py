"""
API endpoints for user profile and photo management
Extracted from frontend queries in AddProfilePhotoDirectly.tsx and UserDetails.tsx
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import supabase
from service import get_current_user
from typing import Optional
from pydantic import BaseModel
import base64

app = APIRouter()


class ProfilePhotoUpdate(BaseModel):
    profile_photo: str


class ProfilePhotoUrlFix(BaseModel):
    user_id: str
    new_url: str


@app.get("/profile-photo")
async def get_user_profile_photo(
    current_user=Depends(get_current_user)
):
    """
    Get the current user's profile photo URL
    
    Original query from AddProfilePhotoDirectly.tsx:
    supabase
        .from("users")
        .select("profile_photo")
        .eq("id", userId)
        .single()
    """
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        response = supabase.table("users").select("profile_photo").eq("id", user_id).single().execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "data": response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching profile photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile photo: {str(e)}")


@app.patch("/profile-photo")
async def update_profile_photo(
    photo_update: ProfilePhotoUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update the user's profile photo URL in the database
    
    Original query from AddProfilePhotoDirectly.tsx:
    supabase
        .from("users")
        .update({ profile_photo: publicUrl })
        .eq("id", userId)
        .select()
    """
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        response = supabase.table("users").update({
            "profile_photo": photo_update.profile_photo
        }).eq("id", user_id).select().execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "status": "success",
            "message": "Profile photo updated successfully",
            "data": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile photo: {str(e)}")


@app.patch("/fix-profile-photo-url")
async def fix_profile_photo_url(
    fix_data: ProfilePhotoUrlFix,
    current_user=Depends(get_current_user)
):
    """
    Fix profile photo URL to ensure it has the correct /public/ path
    
    Original query from UserDetails.tsx:
    supabase
        .from('users')
        .update({ profile_photo: fixedUrl })
        .eq('id', session.user.id)
    """
    try:
        # Verify the current user has permission to update this profile
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not user_id or user_id != fix_data.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this profile")
        
        response = supabase.table("users").update({
            "profile_photo": fix_data.new_url
        }).eq("id", fix_data.user_id).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))
        
        return {
            "status": "success",
            "message": "Profile photo URL fixed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fixing profile photo URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fix profile photo URL: {str(e)}")


@app.delete("/profile-photo/storage/{file_path:path}")
async def delete_profile_photo_from_storage(
    file_path: str,
    current_user=Depends(get_current_user)
):
    """
    Delete a profile photo from Supabase storage
    
    Original query from AddProfilePhotoDirectly.tsx:
    supabase.storage.from("profile-photos").remove([oldFilePath])
    
    Note: This is a storage operation, not a database query
    """
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Ensure user can only delete their own photos (file_path should start with user_id)
        if not file_path.startswith(user_id):
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")
        
        response = supabase.storage.from_("profile-photos").remove([file_path])
        
        return {
            "status": "success",
            "message": "Profile photo deleted from storage"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting profile photo from storage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete profile photo: {str(e)}")


@app.post("/profile-photo/upload")
async def upload_profile_photo_to_storage(
    file_name: str,
    file_data: bytes,
    content_type: str,
    current_user=Depends(get_current_user)
):
    """
    Upload a profile photo to Supabase storage and update user record
    
    Original query from AddProfilePhotoDirectly.tsx:
    supabase.storage.from("profile-photos").upload(fileName, fileData, {...})
    
    Note: This endpoint handles the backend portion of the upload process
    """
    try:
        user_id = current_user.get("id") if isinstance(current_user, dict) else None
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Validate file size (5MB limit)
        if len(file_data) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Image size ({len(file_data) / (1024 * 1024):.2f}MB) exceeds 5MB limit"
            )
        
        # Upload to storage
        storage_response = supabase.storage.from_("profile-photos").upload(
            path=file_name,
            file=file_data,
            file_options={"content-type": content_type, "upsert": False}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("profile-photos").get_public_url(file_name)
        
        # Fix URL if needed
        if public_url and "/object/" in public_url and "/object/public/" not in public_url:
            public_url = public_url.replace("/object/", "/object/public/")
        
        # Update user record
        update_response = supabase.table("users").update({
            "profile_photo": public_url
        }).eq("id", user_id).select().execute()
        
        if update_response.error:
            raise HTTPException(status_code=500, detail=str(update_response.error))
        
        return {
            "status": "success",
            "message": "Profile photo uploaded successfully",
            "url": public_url,
            "data": update_response.data[0] if update_response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading profile photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload profile photo: {str(e)}")
