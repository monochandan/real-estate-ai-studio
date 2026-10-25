import os
from dotenv import load_dotenv


load_dotenv(dotenv_path="../.env")

key = os.getenv("NEXTJS_CALLBACK_SECRET")

print(key)