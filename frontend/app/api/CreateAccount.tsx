
const api_url = `${process.env.EXPO_PUBLIC_API_URL}` // Replace environment variables later

export async function CreateAccountRequest(email: string, password: string, firstName?: string, lastName?: string, dietaryRestrictions?: string[]) {
    const response = await fetch(`${api_url}/users/sign-up/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName, dietaryRestrictions }),
    });

    return response.json(); // parse JSON result
}