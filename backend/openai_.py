from dotenv import load_dotenv # type: ignore
import os
import openai
load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
if openai.api_key is None:
    raise ValueError("OPENAI_API_KEY environment variable not set")
