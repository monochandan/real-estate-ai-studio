
"use client";

import { useState, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  FaUpload,
  FaSpinner,
  FaMagic,
  FaDownload,
  FaShareAlt,
  FaHome,
  FaImages,
  FaChevronUp,
  FaChevronDown,
  FaTimes,
  FaCheck,
  FaPlay,
  FaPause,
  FaRedo,
  FaCoins,
  FaVolumeUp,
  FaMusic,
  FaFilm,
  FaMapMarkerAlt,
  FaEuroSign,
  FaBed,
  FaBath,
  FaCouch,
  FaTree,
  FaBuilding,
  FaChevronRight,
  FaExclamationTriangle,
} from "react-icons/fa";

/*
|--------------------------------------------------------------------------
| PROPERTY VIDEO GENERATOR
|--------------------------------------------------------------------------
|
| Frontend page for creating social-media property videos.
|
| Expected API:
|
| POST /api/upload
|   -> { url: "https://..." }
|
| POST /api/videos/generate
|   body:
|   {
|     images: [...],
|     logo: "...",
|     propertyType: "...",
|     bedrooms: 3,
|     bathrooms: 2,
|     livingRooms: 1,
|     otherRooms: [...],
|     location: "...",
|     price: "...",
|     extraInfo: "...",
|     videoStyle: "modern",
|     voice: "random",
|     music: "random",
|     voiceover: true
|   }
|
| The generation API should return either:
|
|   { videoUrl: "..." }
|
| or:
|
|   { videoId: "..." }
|
| You can later connect this to your Colab/backend video generator.
|--------------------------------------------------------------------------
*/

const MAX_IMAGES = 6;
const MIN_IMAGES = 5;

const PROPERTY_TYPES = [
  { id: "villa", name: "Villa", emoji: "🏡" },
  { id: "house", name: "House", emoji: "🏠" },
  { id: "apartment", name: "Apartment", emoji: "🏢" },
  { id: "penthouse", name: "Penthouse", emoji: "🌇" },
  { id: "townhouse", name: "Townhouse", emoji: "🏘️" },
  { id: "other", name: "Other", emoji: "🏠" },
];

const OTHER_ROOMS = [
  { id: "kitchen", name: "Kitchen", emoji: "🍳" },
  { id: "dining", name: "Dining Room", emoji: "🍽️" },
  { id: "office", name: "Office", emoji: "💼" },
  { id: "garage", name: "Garage", emoji: "🚗" },
  { id: "garden", name: "Garden", emoji: "🌳" },
  { id: "balcony", name: "Balcony", emoji: "🌿" },
  { id: "terrace", name: "Terrace", emoji: "☀️" },
  { id: "basement", name: "Basement", emoji: "📦" },
];

const VIDEO_STYLES = [
  {
    id: "classic",
    name: "Classic",
    emoji: "🎬",
    description: "Elegant & balanced",
  },
  {
    id: "modern",
    name: "Modern",
    emoji: "✨",
    description: "Bold & energetic",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    emoji: "🎞️",
    description: "Slow & luxurious",
  },
];

const VOICES = [
  {
    id: "random",
    name: "Random",
    description: "AI chooses a voice",
  },
  {
    id: "voice-1",
    name: "Voice 1",
    description: "Warm & professional",
  },
  {
    id: "voice-2",
    name: "Voice 2",
    description: "Confident & modern",
  },
  {
    id: "voice-3",
    name: "Voice 3",
    description: "Calm & premium",
  },
];

const MUSIC = [
  {
    id: "random",
    name: "Random",
    description: "AI chooses music",
  },
  {
    id: "music-1",
    name: "Luxury",
    description: "Premium property mood",
  },
  {
    id: "music-2",
    name: "Modern",
    description: "Clean & energetic",
  },
  {
    id: "music-3",
    name: "Cinematic",
    description: "Elegant atmosphere",
  },
];

export default function PropertyVideoPage() {
  const { data: session } = useSession();

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [images, setImages] = useState([]);
  const [logo, setLogo] = useState("");

  const [propertyType, setPropertyType] = useState("villa");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [livingRooms, setLivingRooms] = useState(1);

  const [otherRooms, setOtherRooms] = useState([]);

  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [videoStyle, setVideoStyle] = useState("modern");
  const [voice, setVoice] = useState("random");
  const [music, setMusic] = useState("random");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);

  const [selectedScene, setSelectedScene] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [generationStatus, setGenerationStatus] = useState("idle");
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationError, setGenerationError] = useState("");

  const [videoUrl, setVideoUrl] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const videoRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | UPLOAD PROPERTY IMAGES
  |--------------------------------------------------------------------------
  */

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Image upload failed.");
    }

    const data = await response.json();

    if (!data.url) {
      throw new Error("Upload API did not return an image URL.");
    }

    return data.url;
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      alert(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);

    setIsUploading(true);

    try {
      const uploadedImages = [];

      for (const file of selectedFiles) {
        const url = await uploadImage(file);

        uploadedImages.push({
          id: `${Date.now()}-${Math.random()}`,
          url,
          name: file.name,
        });
      }

      setImages((current) => [...current, ...uploadedImages]);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not upload images.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOGO UPLOAD
  |--------------------------------------------------------------------------
  */

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingLogo(true);

    try {
      const url = await uploadImage(file);
      setLogo(url);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not upload logo.");
    } finally {
      setUploadingLogo(false);

      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  /*
  |--------------------------------------------------------------------------
  | IMAGE REORDERING
  |--------------------------------------------------------------------------
  */

  const moveImage = (index, direction) => {
    setImages((current) => {
      const newImages = [...current];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= newImages.length
      ) {
        return current;
      }

      const temp = newImages[index];

      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;

      return newImages;
    });

    if (direction === "up" && selectedScene === index) {
      setSelectedScene(index - 1);
    }

    if (direction === "down" && selectedScene === index) {
      setSelectedScene(index + 1);
    }
  };

  const removeImage = (index) => {
    setImages((current) =>
      current.filter((_, i) => i !== index)
    );

    if (selectedScene >= images.length - 1) {
      setSelectedScene(
        Math.max(0, images.length - 2)
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | OTHER ROOM SELECTION
  |--------------------------------------------------------------------------
  */

  const toggleOtherRoom = (roomId) => {
    setOtherRooms((current) => {
      if (current.includes(roomId)) {
        return current.filter((id) => id !== roomId);
      }

      return [...current, roomId];
    });
  };

  /*
  |--------------------------------------------------------------------------
  | PREVIEW VIDEO CONTROLS
  |--------------------------------------------------------------------------
  */

  const togglePlay = () => {
    if (!videoRef.current || !videoUrl) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const restartVideo = () => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD
  |--------------------------------------------------------------------------
  */

  const handleDownload = () => {
    if (!videoUrl) return;

    const link = document.createElement("a");

    link.href = videoUrl;
    link.download = "property-video.mp4";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /*
  |--------------------------------------------------------------------------
  | SHARE
  |--------------------------------------------------------------------------
  */

  const handleShare = async () => {
    if (!videoUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Property Video",
          text: "Check out this property video.",
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        alert("Video link copied.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GENERATE VIDEO
  |--------------------------------------------------------------------------
  */

  const handleGenerateVideo = async () => {
    if (!session?.user) {
      signIn("google");
      return;
    }

    if (images.length < MIN_IMAGES) {
      alert(
        `Please upload at least ${MIN_IMAGES} property images.`
      );
      return;
    }

    const credits = session.user.credits ?? 0;

    if (credits < 10) {
      alert(
        "You need at least 10 credits to generate a property video."
      );
      return;
    }

    setGenerationStatus("generating");
    setGenerationMessage(
      "Preparing your property video..."
    );
    setGenerationError("");
    setVideoUrl("");

    try {
      /*
      |--------------------------------------------------------------------------
      | Build the payload
      |--------------------------------------------------------------------------
      */

      const payload = {
        images: images.map((image) => image.url),

        logo: logo || null,

        propertyType,

        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        livingRooms: Number(livingRooms),

        otherRooms,

        location: location.trim(),
        price: price.trim(),
        extraInfo: extraInfo.trim(),

        videoStyle,

        voice,
        music,

        voiceover: voiceoverEnabled,
      };

      /*
      |--------------------------------------------------------------------------
      | Send to backend
      |--------------------------------------------------------------------------
      */

      setGenerationMessage(
        "Creating your voice-over and scenes..."
      );

      const response = await fetch(
        "/api/videos/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText || "Video generation failed."
        );
      }

      const data = await response.json();

      /*
      |--------------------------------------------------------------------------
      | Direct video URL
      |--------------------------------------------------------------------------
      */

      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setGenerationStatus("success");
        setGenerationMessage(
          "Your property video is ready."
        );
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | If backend returns a video ID
      |--------------------------------------------------------------------------
      */

      if (data.videoId) {
        setGenerationMessage(
          "Rendering your property video..."
        );

        await pollVideoStatus(data.videoId);

        return;
      }

      throw new Error(
        "Video generation API did not return a video URL or video ID."
      );
    } catch (error) {
      console.error(error);

      setGenerationStatus("error");

      setGenerationError(
        error.message ||
          "Something went wrong while generating your video."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | POLL VIDEO STATUS
  |--------------------------------------------------------------------------
  */

  const pollVideoStatus = async (videoId) => {
    const maxAttempts = 180;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `/api/videos?id=${encodeURIComponent(videoId)}`
        );

        if (response.ok) {
          const data = await response.json();

          if (
            data.status === "completed" &&
            data.videoUrl
          ) {
            setVideoUrl(data.videoUrl);

            setGenerationStatus("success");

            setGenerationMessage(
              "Your property video is ready."
            );

            return;
          }

          if (data.status === "failed") {
            throw new Error(
              data.error ||
                "Video rendering failed."
            );
          }

          if (data.status === "processing") {
            setGenerationMessage(
              "Rendering your property video..."
            );
          }
        }
      } catch (error) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }

    throw new Error(
      "Video generation timed out."
    );
  };

  /*
  |--------------------------------------------------------------------------
  | GENERATION BUTTON TEXT
  |--------------------------------------------------------------------------
  */

  const getGenerateButtonText = () => {
    if (generationStatus === "generating") {
      return "Generating Video...";
    }

    if (generationStatus === "success") {
      return "Video Ready";
    }

    return "Generate Property Video";
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden overflow-y-auto bg-slate-50 min-h-screen">

      {/* ================================================================
          LEFT SIDEBAR
      ================================================================ */}

      <div className="w-full md:w-[400px] border-r border-slate-200 bg-white flex flex-col overflow-y-auto flex-shrink-0">

        {/* HEADER */}

        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">

          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2 leading-none">

            <FaFilm className="text-primary text-xs" />

            Property Video

          </h1>

          <p className="text-[11px] text-slate-400 mt-1">

            Create professional property reels for social media

          </p>

        </div>


        {/* FORM */}

        <div className="p-5 flex-1 space-y-6">

          {/* ============================================================
              1. PROPERTY IMAGES
          ============================================================ */}

          <div>

            <div className="flex items-center justify-between mb-2">

              <label className="block text-[11px] font-bold text-slate-400">

                1. Property Photos

              </label>

              <span
                className={`text-[9px] font-bold ${
                  images.length >= MIN_IMAGES
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >

                {images.length}/{MAX_IMAGES}

              </span>

            </div>


            {/* IMAGE GRID */}

            {images.length > 0 && (

              <div className="space-y-2 mb-3">

                {images.map((image, index) => (

                  <div
                    key={image.id}
                    className={`relative flex items-center gap-2 p-2 rounded border transition-all ${
                      selectedScene === index
                        ? "border-primary bg-bg-page"
                        : "border-slate-200 bg-white"
                    }`}
                  >

                    {/* NUMBER */}

                    <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">

                      {index + 1}

                    </div>


                    {/* THUMBNAIL */}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedScene(index)
                      }
                      className="h-12 w-16 rounded overflow-hidden border border-slate-200 flex-shrink-0 cursor-pointer"
                    >

                      <img
                        src={image.url}
                        alt={`Property ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                    </button>


                    {/* NAME */}

                    <div className="min-w-0 flex-1">

                      <p className="text-[10px] font-bold text-slate-700 truncate">

                        {image.name || `Property Photo ${index + 1}`}

                      </p>

                      <p className="text-[9px] text-slate-400">

                        Scene {index + 1}

                      </p>

                    </div>


                    {/* UP / DOWN */}

                    <div className="flex flex-col">

                      <button
                        type="button"
                        onClick={() =>
                          moveImage(index, "up")
                        }
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >

                        <FaChevronUp className="text-[8px]" />

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveImage(index, "down")
                        }
                        disabled={
                          index === images.length - 1
                        }
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                      >

                        <FaChevronDown className="text-[8px]" />

                      </button>

                    </div>


                    {/* REMOVE */}

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                    >

                      <FaTimes className="text-[9px]" />

                    </button>

                  </div>

                ))}

              </div>

            )}


            {/* UPLOAD */}

            {images.length < MAX_IMAGES && (

              <div
                className="relative border-2 border-dashed border-slate-200 rounded p-4 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 cursor-pointer"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >

                {isUploading ? (

                  <div className="flex flex-col items-center gap-2 py-2">

                    <FaSpinner className="animate-spin text-lg text-indigo-600" />

                    <span className="text-xs text-slate-500 font-semibold">

                      Uploading photos...

                    </span>

                  </div>

                ) : (

                  <div className="flex flex-col items-center gap-2 py-2">

                    <div className="h-9 w-9 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">

                      <FaImages className="text-xs" />

                    </div>

                    <div>

                      <p className="text-xs font-bold text-slate-700">

                        Add property photos

                      </p>

                      <p className="text-[10px] text-slate-400 mt-0.5">

                        Upload {Math.max(0, MIN_IMAGES - images.length)} more minimum

                      </p>

                    </div>

                  </div>

                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />

              </div>

            )}

            {images.length < MIN_IMAGES && (

              <p className="text-[9px] text-amber-600 mt-1.5">

                Add at least {MIN_IMAGES} photos to generate the video.

              </p>

            )}

          </div>


          {/* ============================================================
              2. AGENCY LOGO
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              2. Agency Logo

              <span className="font-normal text-slate-300 ml-1">

                Optional

              </span>

            </label>

            {logo ? (

              <div className="relative h-20 border border-slate-200 rounded bg-slate-50 flex items-center justify-center">

                <img
                  src={logo}
                  alt="Agency logo"
                  className="max-h-14 max-w-[180px] object-contain"
                />

                <button
                  type="button"
                  onClick={() => setLogo("")}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 cursor-pointer"
                >

                  <FaTimes className="text-[9px]" />

                </button>

              </div>

            ) : (

              <button
                type="button"
                onClick={() =>
                  logoInputRef.current?.click()
                }
                className="w-full border border-slate-200 rounded p-3 flex items-center gap-3 hover:border-indigo-300 hover:bg-slate-50 transition-all text-left cursor-pointer"
              >

                <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center text-slate-400">

                  {uploadingLogo ? (
                    <FaSpinner className="animate-spin text-xs" />
                  ) : (
                    <FaUpload className="text-xs" />
                  )}

                </div>

                <div>

                  <p className="text-[10px] font-bold text-slate-700">

                    Upload agency logo

                  </p>

                  <p className="text-[9px] text-slate-400">

                    PNG with transparent background recommended

                  </p>

                </div>

              </button>

            )}

            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />

          </div>


          {/* ============================================================
              3. PROPERTY TYPE
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              3. Property Type

            </label>

            <div className="grid grid-cols-3 gap-1.5">

              {PROPERTY_TYPES.map((type) => {

                const selected =
                  propertyType === type.id;

                return (

                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      setPropertyType(type.id)
                    }
                    className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded border text-[10px] font-bold transition-all cursor-pointer ${
                      selected
                        ? "bg-bg-page border-primary text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >

                    <span className="text-sm">

                      {type.emoji}

                    </span>

                    <span className="truncate max-w-full">

                      {type.name}

                    </span>

                  </button>

                );

              })}

            </div>

          </div>


          {/* ============================================================
              4. PROPERTY DETAILS
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              4. Property Details

            </label>

            <div className="grid grid-cols-3 gap-2">

              {/* BEDROOMS */}

              <div>

                <label className="text-[9px] text-slate-400 font-semibold">

                  Bedrooms

                </label>

                <div className="relative mt-1">

                  <FaBed className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]" />

                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={bedrooms}
                    onChange={(e) =>
                      setBedrooms(e.target.value)
                    }
                    className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
                  />

                </div>

              </div>


              {/* BATHROOMS */}

              <div>

                <label className="text-[9px] text-slate-400 font-semibold">

                  Bathrooms

                </label>

                <div className="relative mt-1">

                  <FaBath className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]" />

                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={bathrooms}
                    onChange={(e) =>
                      setBathrooms(e.target.value)
                    }
                    className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
                  />

                </div>

              </div>


              {/* LIVING ROOMS */}

              <div>

                <label className="text-[9px] text-slate-400 font-semibold">

                  Living Rooms

                </label>

                <div className="relative mt-1">

                  <FaCouch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]" />

                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={livingRooms}
                    onChange={(e) =>
                      setLivingRooms(e.target.value)
                    }
                    className="w-full pl-7 pr-2 py-2 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-400"
                  />

                </div>

              </div>

            </div>

          </div>


          {/* ============================================================
              5. OTHER ROOMS
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              5. Other Rooms

              <span className="font-normal text-slate-300 ml-1">

                Optional

              </span>

            </label>

            <div className="grid grid-cols-2 gap-1.5">

              {OTHER_ROOMS.map((room) => {

                const selected =
                  otherRooms.includes(room.id);

                return (

                  <button
                    key={room.id}
                    type="button"
                    onClick={() =>
                      toggleOtherRoom(room.id)
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded border text-left text-[10px] font-semibold transition-all cursor-pointer ${
                      selected
                        ? "bg-bg-page border-primary text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >

                    <span>

                      {room.emoji}

                    </span>

                    <span className="truncate">

                      {room.name}

                    </span>

                    {selected && (

                      <FaCheck className="ml-auto text-[8px] text-emerald-600" />

                    )}

                  </button>

                );

              })}

            </div>

          </div>


          {/* ============================================================
              6. LOCATION
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              6. Location

            </label>

            <div className="relative">

              <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]" />

              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                placeholder="e.g. Kaiserslautern, Germany"
                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400"
              />

            </div>

          </div>


          {/* ============================================================
              7. PRICE
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              7. Property Price

            </label>

            <div className="relative">

              <FaEuroSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]" />

              <input
                type="text"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="e.g. €449,000"
                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400"
              />

            </div>

          </div>


          {/* ============================================================
              8. EXTRA INFORMATION
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              8. Extra Information

              <span className="font-normal text-slate-300 ml-1">

                Optional

              </span>

            </label>

            <textarea
              value={extraInfo}
              onChange={(e) =>
                setExtraInfo(e.target.value)
              }
              rows={4}
              placeholder="e.g. Private garden, garage, recently renovated, large windows, quiet neighborhood..."
              className="w-full bg-white border border-slate-200 rounded px-3 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 resize-none leading-relaxed"
            />

            <p className="text-[9px] text-slate-400 mt-1">

              The AI will use this information when creating the video and voice-over.

            </p>

          </div>


          {/* ============================================================
              9. VIDEO STYLE
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              9. Video Style

            </label>

            <div className="space-y-1.5">

              {VIDEO_STYLES.map((style) => {

                const selected =
                  videoStyle === style.id;

                return (

                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      setVideoStyle(style.id)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-all cursor-pointer ${
                      selected
                        ? "bg-bg-page border-primary"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >

                    <span className="text-base">

                      {style.emoji}

                    </span>

                    <div className="flex-1 min-w-0">

                      <p className="text-[10px] font-bold text-slate-800">

                        {style.name}

                      </p>

                      <p className="text-[9px] text-slate-400">

                        {style.description}

                      </p>

                    </div>

                    {selected && (

                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center">

                        <FaCheck className="text-[7px]" />

                      </div>

                    )}

                  </button>

                );

              })}

            </div>

          </div>


          {/* ============================================================
              10. VOICE-OVER
          ============================================================ */}

          <div>

            <div className="flex items-center justify-between mb-2">

              <label className="block text-[11px] font-bold text-slate-400">

                10. Voice-over

              </label>

              <button
                type="button"
                onClick={() =>
                  setVoiceoverEnabled(
                    !voiceoverEnabled
                  )
                }
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  voiceoverEnabled
                    ? "bg-slate-900"
                    : "bg-slate-200"
                }`}
              >

                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    voiceoverEnabled
                      ? "left-4.5"
                      : "left-0.5"
                  }`}
                />

              </button>

            </div>

            {voiceoverEnabled && (

              <div className="grid grid-cols-2 gap-1.5">

                {VOICES.map((item) => {

                  const selected =
                    voice === item.id;

                  return (

                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setVoice(item.id)
                      }
                      className={`flex items-center gap-2 px-2.5 py-2 rounded border text-left transition-all cursor-pointer ${
                        selected
                          ? "bg-bg-page border-primary"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >

                      <FaVolumeUp
                        className={`text-[9px] ${
                          selected
                            ? "text-slate-900"
                            : "text-slate-300"
                        }`}
                      />

                      <div className="min-w-0">

                        <p className="text-[10px] font-bold text-slate-700">

                          {item.name}

                        </p>

                        <p className="text-[8px] text-slate-400 truncate">

                          {item.description}

                        </p>

                      </div>

                    </button>

                  );

                })}

              </div>

            )}

            {voiceoverEnabled && (

              <p className="text-[9px] text-slate-400 mt-1.5">

                AI automatically writes the property narration from your listing details.

              </p>

            )}

          </div>


          {/* ============================================================
              11. MUSIC
          ============================================================ */}

          <div>

            <label className="block text-[11px] font-bold text-slate-400 mb-2">

              11. Background Music

            </label>

            <div className="grid grid-cols-2 gap-1.5">

              {MUSIC.map((item) => {

                const selected =
                  music === item.id;

                return (

                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setMusic(item.id)
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded border text-left transition-all cursor-pointer ${
                      selected
                        ? "bg-bg-page border-primary"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >

                    <FaMusic
                      className={`text-[9px] ${
                        selected
                          ? "text-slate-900"
                          : "text-slate-300"
                      }`}
                    />

                    <div className="min-w-0">

                      <p className="text-[10px] font-bold text-slate-700">

                        {item.name}

                      </p>

                      <p className="text-[8px] text-slate-400 truncate">

                        {item.description}

                      </p>

                    </div>

                  </button>

                );

              })}

            </div>

          </div>

        </div>


        {/* ================================================================
            GENERATE FOOTER
        ================================================================ */}

        <div className="p-5 border-t border-slate-100 bg-white flex-shrink-0 space-y-3">

          <button
            type="button"
            onClick={handleGenerateVideo}
            disabled={
              generationStatus === "generating" ||
              isUploading ||
              images.length < MIN_IMAGES
            }
            className="w-full bg-slate-950 hover:bg-slate-800 text-white rounded py-3.5 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-slate-200"
          >

            {generationStatus === "generating" ? (

              <>

                <FaSpinner className="animate-spin text-xs" />

                <span>

                  {getGenerateButtonText()}

                </span>

              </>

            ) : generationStatus === "success" ? (

              <>

                <FaCheck className="text-xs text-emerald-400" />

                <span>

                  Video Ready

                </span>

              </>

            ) : (

              <>

                <FaMagic className="text-xs text-primary" />

                <span>

                  Generate Property Video

                </span>

              </>

            )}

          </button>


          <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 px-1">

            <span>

              Video Cost: 10 Credits

            </span>

            <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-1.5 py-0.5">

              <FaCoins className="text-amber-400" />

              {session?.user?.credits ?? 0} Credits

            </span>

          </div>


          {/* ERROR */}

          {generationStatus === "error" && (

            <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2.5 flex items-start gap-2">

              <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />

              <span>

                {generationError}

              </span>

            </p>

          )}

        </div>

      </div>


      {/* ================================================================
          RIGHT WORKSPACE
      ================================================================ */}

      <div className="flex-1 flex flex-col overflow-hidden min-h-[700px]">

        {/* ==============================================================
            PREVIEW TOOLBAR
        ============================================================== */}

        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">

          <div className="min-w-0">

            <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">

              Property Video Preview

            </h2>

            <p className="text-[10px] text-slate-400 mt-1">

              Vertical 9:16 format • Perfect for Instagram, TikTok & Shorts

            </p>

          </div>


          <div className="flex items-center gap-2">

            {videoUrl && (

              <>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
                >

                  <FaShareAlt className="text-[9px]" />

                  Share

                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-950 px-3 py-1.5 rounded hover:bg-slate-800 transition-all cursor-pointer"
                >

                  <FaDownload className="text-[9px]" />

                  Download

                </button>

              </>

            )}

          </div>

        </div>


        {/* ==============================================================
            MAIN PREVIEW
        ============================================================== */}

        <div className="flex-1 overflow-y-auto">

          <div className="min-h-full flex flex-col items-center justify-center p-5 sm:p-8">

            {/* ==========================================================
                VIDEO / PLACEHOLDER
            ========================================================== */}

            <div className="relative w-full max-w-[420px]">

              {/* PHONE FRAME */}

              <div className="relative mx-auto w-full max-w-[360px] aspect-[9/16] bg-slate-950 rounded-[28px] p-2 shadow-2xl border border-slate-800">

                <div className="relative w-full h-full rounded-[22px] overflow-hidden bg-slate-900">

                  {/* VIDEO */}

                  {videoUrl ? (

                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      controls={false}
                      onPlay={() =>
                        setIsPlaying(true)
                      }
                      onPause={() =>
                        setIsPlaying(false)
                      }
                    />

                  ) : images.length > 0 ? (

                    /* ====================================================
                       LIVE PLACEHOLDER PREVIEW
                    ==================================================== */

                    <div className="absolute inset-0">

                      <img
                        src={
                          images[
                            Math.min(
                              selectedScene,
                              images.length - 1
                            )
                          ]?.url
                        }
                        alt="Property preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* DARK GRADIENT */}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />


                      {/* LOGO */}

                      {logo && (

                        <img
                          src={logo}
                          alt="Agency logo"
                          className="absolute top-5 left-5 max-w-[100px] max-h-[45px] object-contain"
                        />

                      )}


                      {/* TOP PROPERTY LABEL */}

                      <div className="absolute top-5 right-5">

                        <div className="bg-black/40 backdrop-blur-sm text-white text-[8px] font-bold px-2 py-1 rounded-full">

                          PROPERTY VIDEO

                        </div>

                      </div>


                      {/* TEXT PREVIEW */}

                      <div className="absolute left-5 right-5 bottom-8 text-white">

                        {location && (

                          <p className="text-[9px] font-semibold opacity-80 mb-1">

                            {location}

                          </p>

                        )}

                        <h3 className="text-xl sm:text-2xl font-bold leading-tight">

                          {propertyType === "villa"
                            ? "Beautiful Villa"
                            : propertyType === "apartment"
                            ? "Modern Apartment"
                            : propertyType === "penthouse"
                            ? "Luxury Penthouse"
                            : propertyType === "townhouse"
                            ? "Elegant Townhouse"
                            : "Beautiful Property"}

                        </h3>


                        <div className="flex items-center gap-2 mt-2 text-[9px] font-semibold">

                          <span>

                            {bedrooms} Bedrooms

                          </span>

                          <span className="opacity-50">

                            •

                          </span>

                          <span>

                            {bathrooms} Bathrooms

                          </span>

                        </div>


                        {price && (

                          <p className="text-lg font-bold mt-3">

                            {price}

                          </p>

                        )}

                      </div>


                      {/* PLAY OVERLAY */}

                      <div className="absolute inset-0 flex items-center justify-center">

                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">

                          <FaPlay className="text-slate-900 text-sm ml-1" />

                        </div>

                      </div>

                    </div>

                  ) : (

                    /* ====================================================
                       EMPTY STATE
                    ==================================================== */

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-950">

                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">

                        <FaHome className="text-xl text-slate-500" />

                      </div>

                      <p className="text-sm font-bold text-white">

                        Your property video

                      </p>

                      <p className="text-[10px] text-slate-500 mt-2 max-w-[190px] leading-relaxed">

                        Upload your property photos to create a professional vertical video.

                      </p>

                    </div>

                  )}


                  {/* PHONE NOTCH */}

                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-950 rounded-b-xl z-20" />

                </div>

              </div>


              {/* ========================================================
                  VIDEO CONTROLS
              ======================================================== */}

              {videoUrl && (

                <div className="mt-4 flex items-center justify-center gap-2">

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
                  >

                    {isPlaying ? (
                      <FaPause className="text-[10px]" />
                    ) : (
                      <FaPlay className="text-[10px] ml-0.5" />
                    )}

                  </button>

                  <button
                    type="button"
                    onClick={restartVideo}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
                  >

                    <FaRedo className="text-[10px]" />

                  </button>

                </div>

              )}

            </div>


            {/* ==========================================================
                GENERATION STATUS
            ========================================================== */}

            {generationStatus === "generating" && (

              <div className="mt-6 w-full max-w-[420px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">

                    <FaSpinner className="animate-spin text-indigo-600 text-xs" />

                  </div>

                  <div className="flex-1">

                    <p className="text-[11px] font-bold text-slate-800">

                      Creating your property video

                    </p>

                    <p className="text-[9px] text-slate-400 mt-0.5">

                      {generationMessage}

                    </p>

                  </div>

                </div>


                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">

                  <div className="h-full w-1/2 bg-slate-900 rounded-full animate-pulse" />

                </div>

              </div>

            )}


            {/* ==========================================================
                SUCCESS STATUS
            ========================================================== */}

            {generationStatus === "success" && videoUrl && (

              <div className="mt-6 w-full max-w-[420px] bg-emerald-50 border border-emerald-100 rounded-xl p-4">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">

                    <FaCheck className="text-emerald-600 text-xs" />

                  </div>

                  <div>

                    <p className="text-[11px] font-bold text-emerald-800">

                      Video ready

                    </p>

                    <p className="text-[9px] text-emerald-600 mt-0.5">

                      Your property reel has been generated successfully.

                    </p>

                  </div>

                </div>

              </div>

            )}


            {/* ==========================================================
                SCENES
            ========================================================== */}

            {images.length > 0 && (

              <div className="w-full max-w-[700px] mt-8">

                <div className="flex items-center justify-between mb-3">

                  <div>

                    <h3 className="text-xs font-bold text-slate-800">

                      Video Scenes

                    </h3>

                    <p className="text-[9px] text-slate-400 mt-0.5">

                      Each photo becomes a scene in your reel.

                    </p>

                  </div>

                  <span className="text-[9px] font-bold text-slate-400">

                    {images.length} scenes

                  </span>

                </div>


                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">

                  {images.map((image, index) => (

                    <button
                      type="button"
                      key={image.id}
                      onClick={() =>
                        setSelectedScene(index)
                      }
                      className={`relative aspect-[9/14] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedScene === index
                          ? "border-slate-900 shadow-md scale-[1.02]"
                          : "border-white hover:border-slate-300"
                      }`}
                    >

                      <img
                        src={image.url}
                        alt={`Scene ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-5">

                        <span className="absolute bottom-1.5 left-1.5 text-white text-[8px] font-bold">

                          {index + 1}

                        </span>

                      </div>

                    </button>

                  ))}

                </div>

              </div>

            )}


            {/* ==========================================================
                VIDEO INFORMATION
            ========================================================== */}

            <div className="w-full max-w-[700px] mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">

              <div className="bg-white border border-slate-200 rounded-lg p-3">

                <FaFilm className="text-slate-300 text-xs mb-2" />

                <p className="text-[8px] uppercase font-bold text-slate-400">

                  Format

                </p>

                <p className="text-[10px] font-bold text-slate-700 mt-0.5">

                  9:16 Vertical

                </p>

              </div>


              <div className="bg-white border border-slate-200 rounded-lg p-3">

                <FaImages className="text-slate-300 text-xs mb-2" />

                <p className="text-[8px] uppercase font-bold text-slate-400">

                  Scenes

                </p>

                <p className="text-[10px] font-bold text-slate-700 mt-0.5">

                  {images.length || "—"}

                </p>

              </div>


              <div className="bg-white border border-slate-200 rounded-lg p-3">

                <FaVolumeUp className="text-slate-300 text-xs mb-2" />

                <p className="text-[8px] uppercase font-bold text-slate-400">

                  Voice

                </p>

                <p className="text-[10px] font-bold text-slate-700 mt-0.5">

                  {voiceoverEnabled
                    ? "Enabled"
                    : "Off"}

                </p>

              </div>


              <div className="bg-white border border-slate-200 rounded-lg p-3">

                <FaMagic className="text-slate-300 text-xs mb-2" />

                <p className="text-[8px] uppercase font-bold text-slate-400">

                  Style

                </p>

                <p className="text-[10px] font-bold text-slate-700 mt-0.5 capitalize">

                  {videoStyle}

                </p>

              </div>

            </div>


            {/* ==========================================================
                HELPER MESSAGE
            ========================================================== */}

            {!videoUrl && images.length >= MIN_IMAGES && (

              <div className="mt-6 text-center">

                <p className="text-[10px] text-slate-400">

                  Everything looks ready.

                </p>

                <p className="text-[9px] text-slate-300 mt-1">

                  Click “Generate Property Video” to create your reel.

                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}


