import { supabase } from "../utils/client";

export async function fetchUserDetails() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/userInfo`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Normalize user object
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
      fridge_id: data.fridge_id ?? null,
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