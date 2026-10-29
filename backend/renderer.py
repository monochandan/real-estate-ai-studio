
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont


WIDTH = 1080
HEIGHT = 1920
FPS = 30
SECONDS_PER_IMAGE = 5
MAX_IMAGE_BYTES = 20 * 1024 * 1024


def _download_image(url: str, destination: Path) -> None:
    """Download one image from a signed URL with a size limit."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError("Image URLs must use HTTPS.")

    total = 0
    with requests.get(url, stream=True, timeout=(10, 60)) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if not content_type.lower().startswith("image/"):
            raise ValueError("The supplied URL did not return an image.")

        with destination.open("wb") as output:
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_IMAGE_BYTES:
                    raise ValueError("An input image exceeds the 20 MB limit.")
                output.write(chunk)

    if total == 0:
        raise ValueError("The downloaded image is empty.")


def _load_font(size: int) -> ImageFont.ImageFont:
    """Use a local font if available, otherwise Pillow's default."""
    candidates = [
        Path(__file__).parent / "fonts" / "Montserrat-Bold.ttf",
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]

    for font_path in candidates:
        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size)
            except OSError:
                pass

    return ImageFont.load_default()


def _cover_resize(image: Image.Image) -> Image.Image:
    """Resize and center-crop an image to fill the vertical video frame."""
    image = image.convert("RGB")
    source_width, source_height = image.size
    scale = max(WIDTH / source_width, HEIGHT / source_height)

    resized = image.resize(
        (int(source_width * scale), int(source_height * scale)),
        Image.Resampling.LANCZOS,
    )

    left = (resized.width - WIDTH) // 2
    top = (resized.height - HEIGHT) // 2
    return resized.crop((left, top, left + WIDTH, top + HEIGHT))


def _make_frame(
    source: Image.Image,
    progress: float,
    property_data: dict,
    style: str,
) -> np.ndarray:
    """Create one vertical frame with a gentle zoom and property overlay."""
    zoom = 1.0 + 0.07 * progress
    zoom_width = max(1, int(WIDTH * zoom))
    zoom_height = max(1, int(HEIGHT * zoom))

    enlarged = source.resize(
        (zoom_width, zoom_height),
        Image.Resampling.LANCZOS,
    )

    left = (zoom_width - WIDTH) // 2
    top = (zoom_height - HEIGHT) // 2
    frame = enlarged.crop((left, top, left + WIDTH, top + HEIGHT))

    # Darken the lower portion so text remains legible.
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(HEIGHT // 2, HEIGHT):
        alpha = int(155 * (y - HEIGHT // 2) / (HEIGHT // 2))
        draw.line((0, y, WIDTH, y), fill=(0, 0, 0, alpha))

    frame = Image.alpha_composite(frame.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(frame)

    title_font = _load_font(58)
    detail_font = _load_font(38)
    small_font = _load_font(30)

    title = str(property_data.get("title") or "Featured Property")
    location = str(property_data.get("location") or "")
    price = str(property_data.get("price") or "")
    beds = property_data.get("bedrooms")
    bathrooms = property_data.get("bathrooms")
    area = property_data.get("area")

    margin = 70
    y = HEIGHT - 520

    draw.text(
        (margin, y),
        title[:55],
        font=title_font,
        fill="white",
        stroke_width=2,
        stroke_fill=(0, 0, 0, 150),
    )
    y += 90

    if location:
        draw.text((margin, y), location[:65], font=detail_font, fill="white")
        y += 65

    if price:
        draw.text((margin, y), price[:40], font=title_font, fill="white")
        y += 90

    # facts = []
    # if beds is not None:
    #     facts.append(f"{beds} beds")
    # if bathrooms is not None:
    #     facts.append(f"{bathrooms} baths")
    # if area is not None:
    #     facts.append(f"{area} area")

    # if facts:
    #     draw.text(
    #         (margin, y),
    #         "  |  ".join(facts)[:65],
    #         font=small_font,
    #         fill="white",
    #     )
    #     y += 55

    
    # PROPERTY DETAILS - BEDROOMS AND BATHROOMS
    facts = []

    if beds is not None:
        facts.append(f"{beds} Bedrooms")

    if bathrooms is not None:
        facts.append(f"{bathrooms} Bathrooms")

    if facts:
        details_text = " \u2022 ".join(facts)

        draw.text(
            (margin, y),
            details_text[:65],
            font=small_font,
            fill="white",
        )
        y += 55

    # PROPERTY AREA
    if isinstance(area, dict):
        area_value = area.get("value")
        area_unit = area.get("unit") or "m\u00B2"
    else:
        area_value = area
        area_unit = "m\u00B2"

    if area_value is not None and area_value != "":
        draw.text(
            (margin, y),
            f"{area_value} {area_unit}"[:65],
            font=small_font,
            fill="white",
        )
        y += 55
    

    agent = str(property_data.get("agent") or "")
    if agent:
        draw.text(
            (margin, y),
            f"Contact: {agent}"[:60],
            font=small_font,
            fill="white",
        )

    return cv2.cvtColor(np.array(frame.convert("RGB")), cv2.COLOR_RGB2BGR)


def render_property_video(job: dict, output_path: str) -> str:
    """
    Render a basic property video from the worker job payload.

    Expected fields:
      jobId, property, video, images
    Each image should contain a signed URL in its 'url' field.
    """
    property_data = job.get("property") or {}
    video_settings = job.get("video") or {}
    images = job.get("images") or []

    if not isinstance(images, list) or not 5 <= len(images) <= 6:
        raise ValueError("A video job must contain 5 or 6 images.")

    style = str(video_settings.get("style") or "modern").lower()
    if style not in {"classic", "modern", "cinematic"}:
        style = "modern"

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="property-video-") as temp_dir:
        temp_path = Path(temp_dir)
        prepared_images = []

        for index, item in enumerate(images):
            url = item.get("url") if isinstance(item, dict) else None
            if not isinstance(url, str) or not url:
                raise ValueError(f"Image {index + 1} is missing its URL.")

            downloaded = temp_path / f"input-{index}.image"
            _download_image(url, downloaded)

            with Image.open(downloaded) as image:
                image.load()
                prepared_images.append(_cover_resize(image))

        writer = cv2.VideoWriter(
            str(output),
            cv2.VideoWriter_fourcc(*"mp4v"),
            FPS,
            (WIDTH, HEIGHT),
        )

        if not writer.isOpened():
            raise RuntimeError("Could not initialize the MP4 video writer.")

        try:
            for image in prepared_images:
                for frame_index in range(FPS * SECONDS_PER_IMAGE):
                    progress = frame_index / max(1, FPS * SECONDS_PER_IMAGE - 1)
                    frame = _make_frame(image, progress, property_data, style)
                    writer.write(frame)
        finally:
            writer.release()

    if not output.exists() or output.stat().st_size == 0:
        raise RuntimeError("Video rendering failed to produce an MP4 file.")

    return str(output)
