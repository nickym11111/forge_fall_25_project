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
        if (!session) {
          return null;
        }
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/userInfo`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Fix profile photo URL if needed and update database
          if (userData && userData.profile_photo) {
            const originalUrl = userData.profile_photo;
            const fixedUrl = fixProfilePhotoUrl(userData.profile_photo);
            userData.profile_photo = fixedUrl;
            
            // If URL was fixed, update it in the database
            if (originalUrl !== fixedUrl) {
              console.log('Fixing profile photo URL in database');
              console.log('Old URL:', originalUrl);
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
          
          return userData;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
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