const api_url = `${process.env.EXPO_PUBLIC_API_URL}`; // Same as before
export async function LoginRequest(email: string, password: string) {
    const response = await fetch(`${api_url}/log-in/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
}
