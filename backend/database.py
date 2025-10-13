from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"DEBUG: Connecting with URL: '{url}'")

if not url or not key:
    raise ValueError("ERROR: SUPABASE_URL or SUPABASE_KEY is missing. Check your .env file.")

supabase: Client = create_client(url, key)