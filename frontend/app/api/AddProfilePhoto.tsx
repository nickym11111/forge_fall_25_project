const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export async function AddProfilePhoto(
  profile_photo: string,
    access_token: string
) {
  const response = await fetch(`${API_URL}/users/profile_photo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
        profile_photo: profile_photo,
    }),
  });

  return response;
}