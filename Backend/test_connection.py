from dotenv import load_dotenv
import os
import requests

load_dotenv(override=True)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# Check table columns using PostgREST OPTIONS or a simple query
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
}

# This returns column info
resp = requests.options(f"{url}/rest/v1/users", headers=headers)
print("=== Table Info ===")
print(f"Status: {resp.status_code}")
print(f"Headers: {dict(resp.headers)}")

# Try a simple select to see column names
resp2 = requests.get(f"{url}/rest/v1/users?select=*&limit=0", headers={
    **headers,
    "Prefer": "count=exact"
})
print(f"\n=== Select * (limit 0) ===")
print(f"Status: {resp2.status_code}")
print(f"Content-Profile: {resp2.headers.get('Content-Profile', 'N/A')}")

# Get column definitions from the OpenAPI spec
resp3 = requests.get(f"{url}/rest/v1/", headers=headers)
print(f"\n=== Available tables/columns ===")
if resp3.status_code == 200:
    data = resp3.json()
    if "definitions" in data:
        if "users" in data["definitions"]:
            cols = data["definitions"]["users"].get("properties", {})
            print(f"Columns in 'users' table: {list(cols.keys())}")
            for col_name, col_info in cols.items():
                print(f"  - {col_name}: {col_info.get('type', '?')} | {col_info.get('format', '?')}")
        else:
            print(f"Available tables: {list(data.get('definitions', {}).keys())}")
    elif "paths" in data:
        print(f"Available paths: {list(data.get('paths', {}).keys())}")
    else:
        print(f"Response keys: {list(data.keys())}")
else:
    print(f"Status: {resp3.status_code}")
    print(f"Response: {resp3.text[:500]}")
