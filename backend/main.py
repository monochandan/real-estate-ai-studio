
import os
import tempfile
import traceback
from pathlib import Path

from dotenv import load_dotenv
import requests
from supabase import create_client
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException

from models import VideoJob
from renderer import render_property_video

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="Property Video Worker")


@app.get("/")
def root():
    return {"status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


def notify_nextjs(job_id: str, status: str, error: str | None = None,
                  output_path: str | None = None):
    """Notify Next.js when rendering and upload finish."""
    callback_url = os.getenv("NEXTJS_CALLBACK_URL")
    callback_secret = os.getenv("NEXTJS_CALLBACK_SECRET")

    if not callback_url or not callback_secret:
        print(f"Callback configuration missing for job {job_id}.")
        return False

    payload = {"jobId": job_id, "status": status}

    if error:
        payload["error"] = error[:5000]

    # The callback will use this storage path to create the video Asset.
    if output_path:
        payload["outputPath"] = output_path

    try:
        response = requests.post(
            callback_url,
            json=payload,
            headers={"x-callback-secret": callback_secret},
            timeout=15,
        )
        response.raise_for_status()
        print(f"Next.js callback accepted for {job_id}: {status}")
        return True
    except requests.RequestException as exc:
        print(f"Could not notify Next.js for {job_id}: {exc}")
        return False


def upload_video_to_supabase(job_id: str, video_path: Path) -> str:
    """Upload the rendered MP4 to the configured private bucket."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
    bucket = os.getenv("SUPABASE_VIDEO_OUTPUT_BUCKET")

    if not supabase_url or not supabase_key or not bucket:
        raise RuntimeError(
            "Missing SUPABASE_URL, server-side Supabase key, "
            "or SUPABASE_VIDEO_OUTPUT_BUCKET."
        )

    if not video_path.is_file() or video_path.stat().st_size == 0:
        raise RuntimeError("Rendered video file is missing or empty.")

    supabase = create_client(supabase_url, supabase_key)
    storage_path = f"{job_id}/{job_id}.mp4"

    with video_path.open("rb") as video_file:
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=video_file,
            file_options={
                "content-type": "video/mp4",
                "upsert": "true",
            },
        )

    print(f"Uploaded video for job {job_id} to {bucket}/{storage_path}")
    return storage_path


def process_job(job: VideoJob):
    """Render locally, upload to Supabase, and report the result."""
    job_id = job.jobId
    final_output = ROOT_DIR / "worker_outputs" / f"{job_id}.mp4"

    try:
        output_dir = final_output.parent
        output_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(prefix="render-") as temp_dir:
            temp_output = Path(temp_dir) / "video.mp4"

            render_property_video(
                job.model_dump(),
                str(temp_output),
            )

            if not temp_output.is_file() or temp_output.stat().st_size == 0:
                raise RuntimeError("Renderer did not produce a valid MP4.")

            temp_output.replace(final_output)

        print(f"Job {job_id} rendered successfully: {final_output}")

        output_path = upload_video_to_supabase(job_id, final_output)

    except Exception as exc:
        print(f"Job {job_id} failed during rendering or upload:")
        traceback.print_exc()

        notify_nextjs(
            job_id,
            "failed",
            error=str(exc) or "Video rendering or upload failed.",
        )
        return

    callback_sent = notify_nextjs(
        job_id,
        "completed",
        output_path=output_path,
    )

    if not callback_sent:
        print(
            f"WARNING: Video uploaded for {job_id}, but the completion "
            "callback failed. The job may remain PROCESSING."
        )


@app.post("/jobs", status_code=202)
def receive_job(
    job: VideoJob,
    background_tasks: BackgroundTasks,
    x_worker_secret: str | None = Header(default=None),
):
    expected_secret = os.getenv("WORKER_SHARED_SECRET")

    if not expected_secret or x_worker_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    background_tasks.add_task(process_job, job)

    return {
        "accepted": True,
        "jobId": job.jobId,
        "status": "queued",
    }
