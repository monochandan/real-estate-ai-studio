
from dotenv import load_dotenv
from pathlib import Path
import json

# Load the .env file from your project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from ai_content import generate_property_text

property_data = {
    "property_type": "Apartment",
    "location": "Trier, Germany",
    "bedrooms": 3,
    "bathrooms": 2,
    "area": "120 m²",
    "price": "€350,000",
    "features": ["Balcony", "Modern kitchen", "Bright living room"],
}

result = generate_property_text(
    property_data=property_data,
    language="English",
    scene_count=5,
)

print(json.dumps(result, indent=2, ensure_ascii=False))
