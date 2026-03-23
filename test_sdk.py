import os
from google import genai

key = os.environ.get("GEMINI_API_KEY")
print(f"Using KEY: '{key}'")

try:
    client = genai.Client(api_key=key)
    print("Client created")
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=["test"]
    )
    print("Success")
except Exception as e:
    print("Exception:", e)
