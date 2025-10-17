
const api_url = `${process.env.EXPO_PUBLIC_API_URL}` // Replace environment variables later

export async function CreateParseReceiptRequest(base64Image: string) {
    const response = await fetch(`${api_url}/receipt/parse-receipt`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Image }),
    });

    return response.json(); // parse JSON result
}