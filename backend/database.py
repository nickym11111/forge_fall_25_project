# EXAMPLE TEMPLATE SETUP
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv # type: ignore
from supabase import create_client


load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print(f"DEBUG: Connecting with URL: '{url}'")

if not url or not key:
    raise ValueError("ERROR: SUPABASE_URL or SUPABASE_KEY is missing. Check your .env file.")

supabase = create_client(url, key)