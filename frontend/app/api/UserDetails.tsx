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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Fetch user info from your API
    let response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error || !newSession) {
        console.error("Session refresh failed:", error);
        return null;
      }
      
      // Retry with new token
      response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
        headers: {
          Authorization: `Bearer ${newSession.access_token}`,
        },
      });
    }

    if (!response.ok) return null;

    const data = await response.json();

    // Fix profile photo URL if needed and update database
    let profilePhoto = data.profile_photo;
    if (profilePhoto) {
      const fixedUrl = fixProfilePhotoUrl(profilePhoto);
      profilePhoto = fixedUrl;
      
      // If URL was fixed, update it in the database
      if (fixedUrl !== data.profile_photo) {
        console.log('Fixing profile photo URL in database');
        console.log('Old URL:', data.profile_photo);
        console.log('New URL:', fixedUrl);
        
        try {
          await supabase
            .from('users')
            .update({ profile_photo: fixedUrl })
            .eq('id', session.user.id);
          console.log('Profile photo URL updated in database');
        } catch (error) {
          console.error('Error updating profile photo URL:', error);
        }
      }
    }

    // Normalize user object
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      first_name:
        data.first_name ??
        session.user.user_metadata?.first_name ??
        "",
      last_name:
        data.last_name ??
        session.user.user_metadata?.last_name ??
        "",
      fridge_id: data.fridge_id ?? data.active_fridge_id ?? null,
      active_fridge_id: data.active_fridge_id ?? null,
      fridge_count: data.fridge_count ?? 0,
      fridge: data.fridge ?? null,
      fridgeMates: data.fridgeMates ?? [],
      profile_photo: profilePhoto || null,
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
    
    let response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/fridge/leave-fridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ fridgeId, userId: session.user.id })
    });
    
    // If 401, try to refresh token and retry
    if (response.status === 401) {
      console.log("Token expired, attempting to refresh...");
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error || !newSession) {
        console.error("Session refresh failed:", error);
        return null;
      }
      
      // Retry with new token
      response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/fridge/leave-fridge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newSession.access_token}`
        },
        body: JSON.stringify({ fridgeId, userId: session.user.id })
      });
    }
    
    if (response.ok) {
      return(await response.json());
    }
  } catch (error) {
    console.error('Error leaving fridge:', error);
    return null;
  }
}
