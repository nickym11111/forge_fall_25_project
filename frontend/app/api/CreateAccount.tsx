
const api_url = "http://127.0.0.1:8000" // Replace environment variables later

export async function CreateAccountRequest(email: string, password: string, firstName?: string, lastName?: string, dietaryRestrictions?: string[]) {
    const response = await fetch(`${api_url}/sign-up/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName, dietaryRestrictions }),
    });

    return response.json(); // parse JSON result
}