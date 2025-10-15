from dotenv import load_dotenv # type: ignore
import base64
import os
from openai import OpenAI
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)


def getChatGPTResponse(base64_image: str):
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "user",
                "content": [
                    { "type": "input_text", "text": "parse this receipt for text and give me back a list of the items. Only give me the items and give it to me as a JSON list. Do not include any extra text (including backticks `), only give me the json starting with the bracket" },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                    },
                ],
            }
        ],
    )

    return response
