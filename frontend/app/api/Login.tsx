const api_url = "http://127.0.0.1:8000"; // Same as before

export async function LoginRequest(email: string, password: string) {
    const response = await fetch(`${api_url}/login/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
}
