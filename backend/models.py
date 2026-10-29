
from pydantic import BaseModel, Field


class VideoJob(BaseModel):
    jobId: str

    property: dict
    voiceLanguage: str = "en"
    videoTextLanguage: str = "en"
    video: dict

    generateVideoJson: bool = False
    generateVoiceText: bool = False
    generateVideoText: bool = False

    logoUrl: str | None = None

    images: list[dict] = Field(min_length=5, max_length=6)
