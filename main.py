from supabase import create_client

url = "https://xhmpdhousonsdasolyzc.supabase.co"
key = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp"

supabase = create_client(url, key)


response = supabase.table("student").select("name, id").eq("enrollment_no", 101).execute()
print(response.data)