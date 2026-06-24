import os

# On HF Spaces: set this in Settings > Variables and secrets
# Locally: still works via .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    raise ValueError("HF_TOKEN not set. Add it in HF Spaces secrets or your .env file.")