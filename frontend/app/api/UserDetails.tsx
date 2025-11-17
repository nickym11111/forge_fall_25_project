import { supabase } from "../utils/client";

export async function fetchUserDetails() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return null;
        }
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/userInfo`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          return(await response.json());
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