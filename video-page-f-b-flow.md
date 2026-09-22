````
NEXT.JS FRONTEND
      │
      │ POST /api/videos/generate
      │ images + logo + property JSON
      ▼
NEXT.JS API
      │
      ├── authenticate user
      ├── validate files
      ├── create Project
      ├── store input images/logo
      ├── create GenerationJob(PROCESSING)
      └── send job to Python
                │
                ▼
        PYTHON VIDEO WORKER
                │
                ├── download images
                ├── generate LLM text
                ├── generate voice
                ├── create video
                └── upload MP4
                │
                ▼
       POST /api/videos/complete
                │
                ├── create Asset(type VIDEO)
                ├── update GenerationJob
                ├── deduct credits
                └── return video URL
                │
                ▼
        FRONTEND POLLING
                │
                ▼
       videoUrl → <video>
                │
                └── Download
````
# request with data:

````
NEXT.JS FRONTEND
      │
      │ POST /api/videos/generate
      │ images + logo + property JSON
      ▼
NEXT.JS API
      │
      ├── authenticate user
      ├── validate files
      ├── create Project
      ├── store input images/logo
      ├── create GenerationJob(PROCESSING)
      └── send job to Python
                │
                ▼
        PYTHON VIDEO WORKER
                │
                ├── download images
                ├── generate LLM text
                ├── generate voice
                ├── create video
                └── upload MP4
                │
                ▼
       POST /api/videos/complete
                │
                ├── create Asset(type VIDEO)
                ├── update GenerationJob
                ├── deduct credits
                └── return video URL
                │
                ▼
        FRONTEND POLLING
                │
                ▼
       videoUrl → <video>
                │
                └── Download
````
# recommended flow:
````
                    FRONTEND
                       │
          ┌────────────┴────────────┐
          │                         │
    Property fields              Files
          │                 ┌───────┴───────┐
          │                 │               │
          │              5–6 images       logo?
          │                 │               │
          └─────────────────┴───────┬───────┘
                                    │
                              FormData POST
                                    │
                                    ▼
                         /api/videos/generate
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    Save images            Save logo
                         │                     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                              Create Job
                                    │
                                    ▼
                              Python Worker
                                    │
                ┌───────────────────┼──────────────────┐
                │                   │                  │
             Images              Logo             Property
                │                   │                  │
                └───────────────────┼──────────────────┘
                                    │
                                    ▼
                              Render MP4
                                    │
                                    ▼
                              Store video
                                    │
                                    ▼
                            Return video URL
````
