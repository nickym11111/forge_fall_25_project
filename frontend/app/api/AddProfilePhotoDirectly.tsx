import { supabase } from "@/app/utils/client";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

/**
 * Upload profile photo directly to Supabase Storage from frontend
 * This is more efficient than base64 encoding and sending to backend
 */
export async function uploadProfilePhotoDirectly(
  imageUri: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let fileData: Blob | ArrayBuffer;
    let fileExt = "jpg";

    if (Platform.OS === "web") {
      // Web: Use standard fetch
      const response = await fetch(imageUri);
      fileData = await response.blob();
      fileExt = (fileData as Blob).type.split("/")[1] || "jpg";
    } else {
      // Mobile: Use expo-file-system to read as base64, then convert to ArrayBuffer
      // This is the official Supabase recommended approach for React Native
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: "base64",
      });

      // Convert base64 to ArrayBuffer using decode from base64-arraybuffer
      fileData = decode(base64);

      // Determine file extension from URI or default to jpg
      const uriParts = imageUri.split(".");
      fileExt = uriParts[uriParts.length - 1] || "jpg";
    }

    // Validate file size (5MB limit)
    const fileSize =
      fileData instanceof ArrayBuffer ? fileData.byteLength : fileData.size;

    if (fileSize > 5 * 1024 * 1024) {
      return {
        success: false,
        error: `Image size (${(fileSize / (1024 * 1024)).toFixed(
          2
        )}MB) exceeds 5MB limit`,
      };
    }

    // Delete old profile photo if exists
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("profile_photo")
        .eq("id", userId)
        .single();

      if (
        userData?.profile_photo &&
        userData.profile_photo.includes("profile-photos/")
      ) {
        const oldFilePath = userData.profile_photo
          .split("profile-photos/")[1]
          .split("?")[0];
        await supabase.storage.from("profile-photos").remove([oldFilePath]);
        console.log("Deleted old profile photo:", oldFilePath);
      }
    } catch (error) {
      console.log("No old photo to delete or error:", error);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.${fileExt}`;

    console.log("Uploading to storage:", fileName);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    console.log("Upload successful:", uploadData);

    // Get public URL - ensure it has the correct format with /public/
    const { data: urlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(fileName);

    let publicUrl = urlData.publicUrl;

    // Fix URL if it doesn't have /public/ in the path
    if (publicUrl && !publicUrl.includes("/public/")) {
      publicUrl = publicUrl.replace("/object/", "/object/public/");
    }

    console.log("Public URL:", publicUrl);
    console.log("Updating database for user ID:", userId);

    // Update user record with the new photo URL
    const { data: updateData, error: updateError } = await supabase
      .from("users")
      .update({ profile_photo: publicUrl })
      .eq("id", userId)
      .select();

    console.log("Database update response:", {
      data: updateData,
      error: updateError,
    });

    if (updateError) {
      console.error("Database update error:", updateError);
      return { success: false, error: updateError.message };
    }

    if (!updateData || updateData.length === 0) {
      console.error("No rows updated - user might not exist");
      return {
        success: false,
        error: "Failed to update user profile photo - user not found",
      };
    }

    console.log(
      "Profile photo uploaded successfully, updated data:",
      updateData
    );
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}