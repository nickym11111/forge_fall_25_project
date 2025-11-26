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
      const fullName =
        sharedByUserIds.length === 0
          ? "Someone"
          : sharedByUserIds.join(", ");

      await supabase
        .from("shopping_list")
        .update({
          checked: true,
          bought_by: fullName,
        })
        .ilike("name", name.trim());
    } catch (err) {
      console.error("Error auto-checking shopping list:", err);
    }
  }

  return response;
}

export async function PredictExpiryDate(itemName: string) {
  const url = `${API_URL}/expiry/predict-expiry`;
  console.log("📡 Calling:", url);

  const controller = new AbortController();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item_name: itemName,
    }),
    signal: controller.signal,
  });

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
