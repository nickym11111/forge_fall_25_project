import { Platform } from "react-native";

const API_URL =
  Platform.OS === "web"
    ? "http://127.0.0.1:8000"  // works for web in your local browser
    : process.env.EXPO_PUBLIC_API_URL; // your LAN IP for mobile/simulator

export async function CreateAccountRequest(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  dietaryRestrictions?: string[]
) {
  const response = await fetch(`${API_URL}/users/sign-up/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName, dietaryRestrictions }),
  });
  return response.json();
}
