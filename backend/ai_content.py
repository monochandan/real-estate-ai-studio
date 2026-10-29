
import os
import json
import time
from pathlib import Path

import requests


API = "https://api.muapi.ai/api/v1"
PROMPT_FILE = Path(__file__).parent / "prompts" / "property_video.txt"


def generate_property_text(property_data, language, scene_count):
    api_key = os.getenv("MUAPIAPP_API_KEY")

    if not api_key:
        raise RuntimeError("MUAPIAPP_API_KEY is missing")

    system_prompt = PROMPT_FILE.read_text(encoding="utf-8")

    user_prompt = json.dumps({
        "property_data": property_data,
        "language": language,
        "scene_count": scene_count,
    }, ensure_ascii=False)

    headers = {"x-api-key": api_key}

    response = requests.post(
        f"{API}/gemini-2-5-flash",
        headers=headers,
        json={
            "system_prompt": system_prompt,
            "prompt": user_prompt,
        },
        timeout=30,
    )
    response.raise_for_status()

    request_id = response.json()["request_id"]

    for _ in range(40):
        time.sleep(3)

        result_response = requests.get(
            f"{API}/predictions/{request_id}/result",
            headers=headers,
            timeout=30,
        )
        result_response.raise_for_status()
        result = result_response.json()

        if result["status"] == "completed":
            output = result["outputs"]

            # The API may return text or a list of text outputs.
            if isinstance(output, list):
                output = output[0]

            if isinstance(output, dict):
                return output

            output = output.strip()

            # Remove Markdown fences if the model adds them.
            if output.startswith("```"):
                output = output.split("\n", 1)[1]
                output = output.rsplit("```", 1)[0].strip()

            generated = json.loads(output)

            if not generated.get("voiceover"):
                raise ValueError("Voiceover is missing")

            if len(generated.get("scenes", [])) != scene_count:
                raise ValueError("Incorrect number of scene captions")

            return generated

        if result["status"] == "failed":
            raise RuntimeError(str(result.get("error")))

    raise TimeoutError("MuAPI text generation timed out")
