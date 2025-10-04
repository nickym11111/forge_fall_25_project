# EXAMPLE TEMPLATE SETUP
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv # type: ignore

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)