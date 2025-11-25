import { supabase } from "@/app/utils/client";
import { Platform } from "react-native";

/**
 * Upload profile photo directly to Supabase Storage from frontend
 * This is more efficient than base64 encoding and sending to backend
 */
export async function uploadProfilePhotoDirectly(
  imageUri: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let blob: Blob;
    let fileExt = 'jpg';

    if (Platform.OS === 'web') {
      // Web: Fetch as blob
      const response = await fetch(imageUri);
      blob = await response.blob();
      fileExt = blob.type.split('/')[1] || 'jpg';
    } else {
      // Mobile: Convert to blob from file URI
      const response = await fetch(imageUri);
      blob = await response.blob();
      fileExt = 'jpg'; // Default for mobile
    }

    // Validate file size (5MB limit)
    if (blob.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: `Image size (${(blob.size / (1024 * 1024)).toFixed(2)}MB) exceeds 5MB limit`,
      };
    }

    // Delete old profile photo if exists
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('profile_photo')
        .eq('id', userId)
        .single();

      if (userData?.profile_photo && userData.profile_photo.includes('profile-photos/')) {
        const oldFilePath = userData.profile_photo.split('profile-photos/')[1].split('?')[0];
        await supabase.storage.from('profile-photos').remove([oldFilePath]);
        console.log('Deleted old profile photo:', oldFilePath);
      }
    } catch (error) {
      console.log('No old photo to delete or error:', error);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.${fileExt}`;

    console.log('Uploading to storage:', fileName);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('Public URL:', publicUrl);

    // Update user record with the new photo URL
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ profile_photo: publicUrl })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('Profile photo uploaded successfully');
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
