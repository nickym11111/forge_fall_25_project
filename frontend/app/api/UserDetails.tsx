import { supabase } from "../utils/client";

/**
 * Fix profile photo URL to ensure it has the correct /public/ path
 */
function fixProfilePhotoUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  // If URL doesn't have /public/ in the path, add it
  if (url.includes('/object/') && !url.includes('/object/public/')) {
    return url.replace('/object/', '/object/public/');
  }
  
  return url;
}

export async function fetchUserDetails() {
      try {
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Fetch user info from your API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();

      // Fix profile pic if needed
      let profilePhoto = data.profile_photo;

      if (profilePhoto) {
        const fixedUrl = fixProfilePhotoUrl(profilePhoto);

        if (fixedUrl !== profilePhoto) {
          console.log("Fixing profile photo URL in database...");
          console.log("Old URL:", profilePhoto);
          console.log("New URL:", fixedUrl);

          profilePhoto = fixedUrl; // update local value

          try {
            await supabase
              .from("users")
              .update({ profile_photo: fixedUrl })
              .eq("id", session.user.id);
            console.log("Profile photo URL updated in database.");
          } catch (dbError) {
            console.error("Error updating profile photo URL:", dbError);
          }
        }
      }

      // Normalized User
      return {
        id: session.user.id,
        email: session.user.email,
        first_name:
          data.first_name ??
          session.user.user_metadata?.first_name ??
          "",
        last_name:
          data.last_name ??
          session.user.user_metadata?.last_name ??
          "",
        profile_photo: profilePhoto ?? null,
        fridge_id: data.fridge_id ?? null,
        active_fridge_id: data.active_fridge_id ?? null,
        fridge_count: data.fridge_count ?? 0,  
        fridge: data.fridge ?? null,
        fridgeMates: data.fridgeMates ?? [],
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }

}

export async function leaveFridge(fridgeId: string) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return null;
        }
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/fridge/leave-fridge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ fridgeId, userId: session.user.id })
        });
        
        if (response.ok) {
          return(await response.json());
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
}