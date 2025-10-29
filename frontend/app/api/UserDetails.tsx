import { supabase } from "../utils/client";

const api_url = `${process.env.EXPO_PUBLIC_API_URL}` // Replace environment variables later

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
          return(await response.json());
        //   cachedUser = userData;
        //   setUser(cachedUser);
        //   notifyListeners(); // Notify all components
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
}