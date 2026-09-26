from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)


response = supabase.table("student").select("name, id").eq("enrollment_no", 101).execute()
print(response.data)