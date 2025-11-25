import { supabase } from "@/app/utils/client";

/**
 * Upload profile photo directly to Supabase Storage from frontend
 * This bypasses the backend API
 */
export async function uploadProfilePhotoDirectly(
  imageUri: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate unique filename
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

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

    console.log('Profile photo uploaded successfully:', publicUrl);
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
