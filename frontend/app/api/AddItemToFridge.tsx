const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export async function AddItemToFridge (access_token: string, title: string, quantity: string, expiryDate: Date, currentUserId: number, sharedByUsers: number[]) {
          const response = await fetch(`${API_URL}/fridge_items/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          quantity: quantity ? Number(quantity) : 1,
          expiry_date: expiryDate.toISOString().split('T')[0],
          added_by: currentUserId,
          shared_by: sharedByUsers.length > 0 ? sharedByUsers : null,
        }),
      });

}