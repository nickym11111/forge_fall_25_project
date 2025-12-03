import { supabase } from "../utils/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export async function AddItemToFridge(
  access_token: string,
  name: string,
  quantity: string,
  expiryDate: Date,
  sharedByUserIds: string[],
  price?: number
) {
  const response = await fetch(`${API_URL}/fridge_items/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      name: name.trim(),
      quantity: quantity ? Number(quantity) : 1,
      expiry_date: expiryDate.toISOString().split("T")[0],
      shared_by: sharedByUserIds.length > 0 ? sharedByUserIds : null,
      price: price || 0.0,
    }),
  });

  if (response.ok) {
    try {
      //Get the shopping list item
      const { data: shoppingItems, error } = await supabase
        .from("shopping_list")
        .select("*")
        .ilike("name", name.trim())
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching shopping list:", error);
        return response;
      }

      if (shoppingItems) {
        const currentQty = shoppingItems.quantity;
        const addedQuantity = Number(quantity);
        const fullName =
          sharedByUserIds.length === 0 ? "Someone" : sharedByUserIds.join(", ");

        if (addedQuantity >= currentQty) {
          await supabase
            .from("shopping_list")
            .update({
              checked: true,
              bought_by: fullName,
            })
            .eq("id", shoppingItems.id);
        } else {
          // just reduce quantity if not already checked
          await supabase
            .from("shopping_list")
            .update({
              checked: false,
              quantity: currentQty - addedQuantity,
            })
            .eq("id", shoppingItems.id)
        }

      }
    } catch (err) {
      console.error("Error updating shopping list:", err);
    }
  }


  return response;
}

export async function UpdateFridgeItem(
  access_token: string,
  itemId: number,
  name: string,
  quantity: string,
  expiryDate: Date,
  sharedByUserIds: string[],
  price?: number
) {
  const response = await fetch(`${API_URL}/fridge_items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      name: name.trim(),
      quantity: quantity ? Number(quantity) : 1,
      expiry_date: expiryDate.toISOString().split("T")[0],
      shared_by: sharedByUserIds.length > 0 ? sharedByUserIds : null,
      price: price || 0.0,
    }),
  });

  return response;
}
