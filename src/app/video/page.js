
"use client";

import { useEffect, useRef, useState } from "react";
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
  FaFilm,
  FaMapMarkerAlt,
  FaEuroSign,
  FaBed,
  FaBath,
  FaCouch,
  FaWhatsapp,
  FaPhone,
  FaRulerCombined,
  FaVolumeUp,
  FaGlobeEurope,
  FaExclamationTriangle,
} from "react-icons/fa";


/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const MAX_IMAGES = 6;
const MIN_IMAGES = 5;

const VIDEO_COST = 10;


/*
|--------------------------------------------------------------------------
| PROPERTY TYPES
|--------------------------------------------------------------------------
*/

const PROPERTY_TYPES = [
  { id: "villa", name: "Villa", emoji: "🏡" },
  { id: "house", name: "House", emoji: "🏠" },
  { id: "apartment", name: "Apartment", emoji: "🏢" },
  { id: "penthouse", name: "Penthouse", emoji: "🌇" },
  { id: "townhouse", name: "Townhouse", emoji: "🏘️" },
  { id: "other", name: "Other", emoji: "🏠" },
];


/*
|--------------------------------------------------------------------------
| OTHER ROOMS
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| AREA UNITS
|--------------------------------------------------------------------------
*/

const AREA_UNITS = [
  "m²",
  "ft²",
  "sq yd",
  "acres",
];


/*
|--------------------------------------------------------------------------
| VIDEO STYLES
|--------------------------------------------------------------------------
*/

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
  {
    id: "random",
    name: "Random",
    emoji: "🎲",
    description: "AI chooses the style",
  },
];


/*
|--------------------------------------------------------------------------
| TRANSLATIONS
|--------------------------------------------------------------------------
*/

const ROOM_TRANSLATIONS = {
  en: {
    kitchen: "Kitchen",
    dining: "Dining Room",
    office: "Office",
    garage: "Garage",
    garden: "Garden",
    balcony: "Balcony",
    terrace: "Terrace",
    basement: "Basement",
  },

  de: {
    kitchen: "Küche",
    dining: "Esszimmer",
    office: "Büro",
    garage: "Garage",
    garden: "Garten",
    balcony: "Balkon",
    terrace: "Terrasse",
    basement: "Keller",
  },
};


const PROPERTY_TYPE_TRANSLATIONS = {
  en: {
    villa: "Villa",
    house: "House",
    apartment: "Apartment",
    penthouse: "Penthouse",
    townhouse: "Townhouse",
    other: "Property",
  },

  de: {
    villa: "Villa",
    house: "Haus",
    apartment: "Wohnung",
    penthouse: "Penthouse",
    townhouse: "Reihenhaus",
    other: "Immobilie",
  },
};


/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function PropertyVideoPage() {

  const { data: session } = useSession();


  /*
  |--------------------------------------------------------------------------
  | IMAGE STATE
  |--------------------------------------------------------------------------
  */

  const [images, setImages] = useState([]);

  const [logo, setLogo] = useState("");

  const fileInputRef = useRef(null);

  const logoInputRef = useRef(null);

  const videoRef = useRef(null);


  /*
  |--------------------------------------------------------------------------
  | PROPERTY STATE
  |--------------------------------------------------------------------------
  */

  const [propertyType, setPropertyType] =
    useState("villa");

  const [bedrooms, setBedrooms] =
    useState(3);

  const [bathrooms, setBathrooms] =
    useState(2);

  const [livingRooms, setLivingRooms] =
    useState(1);

  const [otherRooms, setOtherRooms] =
    useState([]);

  const [location, setLocation] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [area, setArea] =
    useState("");

  const [areaUnit, setAreaUnit] =
    useState("m²");

  const [phone, setPhone] =
    useState("");

  const [whatsapp, setWhatsapp] =
    useState("");

  const [agent, setAgent] =
    useState("");

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");


  /*
  |--------------------------------------------------------------------------
  | MVP LANGUAGE SETTINGS
  |--------------------------------------------------------------------------
  |
  | These are intentionally separate.
  |
  | voiceLanguage:
  | Language that the LLM will use for the spoken voice-over.
  |
  | videoTextLanguage:
  | Language that the LLM will use for text appearing on the video.
  |
  */

  const [voiceLanguage, setVoiceLanguage] =
    useState("en");

  const [videoTextLanguage, setVideoTextLanguage] =
    useState("en");


  /*
  |--------------------------------------------------------------------------
  | VIDEO OPTIONS
  |--------------------------------------------------------------------------
  */

  const [videoStyle, setVideoStyle] =
    useState("modern");


  /*
  |--------------------------------------------------------------------------
  | UI STATE
  |--------------------------------------------------------------------------
  */

  const [selectedScene, setSelectedScene] =
    useState(0);

  const [isUploading, setIsUploading] =
    useState(false);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [generationStatus, setGenerationStatus] =
    useState("idle");

  const [generationMessage, setGenerationMessage] =
    useState("");

  const [generationError, setGenerationError] =
    useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [isPlaying, setIsPlaying] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | OPTIONAL LLM OUTPUT
  |--------------------------------------------------------------------------
  |
  | The backend can return these later.
  |
  */

  const [generatedVoiceText, setGeneratedVoiceText] =
    useState("");

  const [generatedVideoText, setGeneratedVideoText] =
    useState(null);


  /*
  |--------------------------------------------------------------------------
  | IMAGE UPLOAD
  |--------------------------------------------------------------------------
  */

  const uploadImage = async (file) => {

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      "/api/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(
        "Image upload failed."
      );
    }

    const data =
      await response.json();

    if (!data.url) {
      throw new Error(
        "Upload API did not return an image URL."
      );
    }

    return data.url;
  };


  const handleImageUpload = async (
    event
  ) => {

    const files =
      Array.from(
        event.target.files || []
      );

    if (!files.length) return;

    const remainingSlots =
      MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {

      alert(
        `You can upload a maximum of ${MAX_IMAGES} images.`
      );

      return;
    }

    const selectedFiles =
      files.slice(
        0,
        remainingSlots
      );

    setIsUploading(true);

    try {

      const uploadedImages = [];

      for (
        const file of selectedFiles
      ) {

        const url =
          await uploadImage(file);

        uploadedImages.push({
          id:
            `${Date.now()}-${Math.random()}`,
          url,
          name:
            file.name,
        });
      }

      setImages(
        (current) => [
          ...current,
          ...uploadedImages,
        ]
      );

    } catch (error) {

      console.error(error);

      alert(
        error.message ||
          "Could not upload images."
      );

    } finally {

      setIsUploading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value = "";
      }
    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOGO UPLOAD
  |--------------------------------------------------------------------------
  */

  const handleLogoUpload = async (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    setUploadingLogo(true);

    try {

      const url =
        await uploadImage(file);

      setLogo(url);

    } catch (error) {

      console.error(error);

      alert(
        error.message ||
          "Could not upload logo."
      );

    } finally {

      setUploadingLogo(false);

      if (
        logoInputRef.current
      ) {
        logoInputRef.current.value = "";
      }
    }
  };


  /*
  |--------------------------------------------------------------------------
  | REORDER IMAGES
  |--------------------------------------------------------------------------
  */

  const moveImage = (
    index,
    direction
  ) => {

    setImages((current) => {

      const newImages = [
        ...current,
      ];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >=
          newImages.length
      ) {
        return current;
      }

      const temp =
        newImages[index];

      newImages[index] =
        newImages[targetIndex];

      newImages[targetIndex] =
        temp;

      return newImages;
    });

    if (
      direction === "up" &&
      selectedScene === index
    ) {
      setSelectedScene(
        index - 1
      );
    }

    if (
      direction === "down" &&
      selectedScene === index
    ) {
      setSelectedScene(
        index + 1
      );
    }
  };


  const removeImage = (index) => {

    setImages((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );

    setSelectedScene(
      (current) =>
        Math.min(
          current,
          Math.max(
            0,
            images.length - 2
          )
        )
    );
  };


  /*
  |--------------------------------------------------------------------------
  | OTHER ROOM SELECTION
  |--------------------------------------------------------------------------
  */

  const toggleOtherRoom = (
    roomId
  ) => {

    setOtherRooms(
      (current) => {

        if (
          current.includes(roomId)
        ) {

          return current.filter(
            (id) =>
              id !== roomId
          );
        }

        return [
          ...current,
          roomId,
        ];
      }
    );
  };


  /*
  |--------------------------------------------------------------------------
  | VIDEO CONTROLS
  |--------------------------------------------------------------------------
  */

  const togglePlay = () => {

    if (
      !videoRef.current ||
      !videoUrl
    ) {
      return;
    }

    if (
      videoRef.current.paused
    ) {

      videoRef.current.play();

      setIsPlaying(true);

    } else {

      videoRef.current.pause();

      setIsPlaying(false);
    }
  };


  const restartVideo = () => {

    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime =
      0;

    videoRef.current.play();

    setIsPlaying(true);
  };


  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD
  |--------------------------------------------------------------------------
  |
  | This is intentionally beside the Property Video Preview title.
  |
  */

  const handleDownload = async () => {

    if (!videoUrl) {
      return;
    }

    try {

      const response =
        await fetch(videoUrl);

      if (!response.ok) {
        throw new Error(
          "Could not download video."
        );
      }

      const blob =
        await response.blob();

      const blobUrl =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        blobUrl;

      link.download =
        "property-video.mp4";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        blobUrl
      );

    } catch (error) {

      console.error(
        "Download failed:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | Fallback
      |--------------------------------------------------------------------------
      */

      window.open(
        videoUrl,
        "_blank"
      );
    }
  };


  /*
  |--------------------------------------------------------------------------
  | SHARE
  |--------------------------------------------------------------------------
  */

  const handleShare = async () => {

    if (!videoUrl) {
      return;
    }

    try {

      if (
        navigator.share
      ) {

        await navigator.share({
          title:
            "Property Video",
          text:
            "Check out this property video.",
          url:
            videoUrl,
        });

      } else {

        await navigator.clipboard.writeText(
          videoUrl
        );

        alert(
          "Video link copied."
        );
      }

    } catch (error) {

      console.error(error);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | PROPERTY OBJECT
  |--------------------------------------------------------------------------
  */

  const buildPropertyObject =
    () => {

      const propertyTypeName =
        PROPERTY_TYPE_TRANSLATIONS.en[
          propertyType
        ] ||
        "Property";

      return {

        title:
          location
            ? `${propertyTypeName} in ${location}`
            : propertyTypeName,

        propertyType,

        propertyTypeName,

        location,

        address,

        price,

        bedrooms:
          Number(bedrooms) || 0,

        bathrooms:
          Number(bathrooms) || 0,

        livingRooms:
          Number(livingRooms) || 0,

        area:
          area
            ? {
                value:
                  Number(area) ||
                  area,
                unit:
                  areaUnit,
              }
            : null,

        otherRooms,

        phone,

        whatsapp,

        agent,

        logo:
          logo || null,

        images:
          images.map(
            (image) =>
              image.url
          ),
      };
    };


  /*
  |--------------------------------------------------------------------------
  | GENERATE VIDEO
  |--------------------------------------------------------------------------
  */

  const handleGenerateVideo =
    async () => {

      if (!session?.user) {

        signIn("google");

        return;
      }


      if (
        images.length <
        MIN_IMAGES
      ) {

        alert(
          `Please upload at least ${MIN_IMAGES} property images.`
        );

        return;
      }


      const credits =
        session.user.credits ?? 0;


      if (
        credits <
        VIDEO_COST
      ) {

        alert(
          `You need at least ${VIDEO_COST} credits to generate a property video.`
        );

        return;
      }


      setGenerationStatus(
        "generating"
      );

      setGenerationMessage(
        "Preparing your property video..."
      );

      setGenerationError("");

      setVideoUrl("");

      setGeneratedVoiceText("");

      setGeneratedVideoText(
        null
      );


      try {

        const property =
          buildPropertyObject();


        /*
        |--------------------------------------------------------------------------
        | BACKEND PAYLOAD
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | voiceLanguage
        |   -> LLM generates spoken voice-over in this language.
        |
        | videoTextLanguage
        |   -> LLM generates on-screen video text in this language.
        |
        |--------------------------------------------------------------------------
        */

        const payload = {

          property,


          /*
          |--------------------------------------------------------------------------
          | LANGUAGE SETTINGS
          |--------------------------------------------------------------------------
          */

          voiceLanguage,

          videoTextLanguage,


          /*
          |--------------------------------------------------------------------------
          | VIDEO SETTINGS
          |--------------------------------------------------------------------------
          */

          video: {

            style:
              videoStyle,

            format:
              "9:16",

            width:
              1080,

            height:
              1920,

            fps:
              30,

            duration:
              30,
          },


          /*
          |--------------------------------------------------------------------------
          | LLM GENERATION FLAG
          |--------------------------------------------------------------------------
          */

          generateVideoJson:
            true,

          generateVoiceText:
            true,

          generateVideoText:
            true,
        };


        console.log(
          "Sending property video payload:",
          payload
        );


        setGenerationMessage(
          "AI is generating the voice-over and video text..."
        );


        const response =
          await fetch(
            "/api/videos/generate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        if (!response.ok) {

          const errorText =
            await response.text();

          throw new Error(
            errorText ||
              "Video generation failed."
          );
        }


        const data =
          await response.json();


        /*
        |--------------------------------------------------------------------------
        | OPTIONAL LLM OUTPUT
        |--------------------------------------------------------------------------
        |
        | Your backend can return these fields.
        |
        */

        if (
          data.voiceoverText
        ) {

          setGeneratedVoiceText(
            data.voiceoverText
          );
        }


        if (
          data.videoText
        ) {

          setGeneratedVideoText(
            data.videoText
          );
        }


        if (
          data.generated?.voiceover
        ) {

          setGeneratedVoiceText(
            data.generated.voiceover
          );
        }


        if (
          data.generated?.videoText
        ) {

          setGeneratedVideoText(
            data.generated.videoText
          );
        }


        /*
        |--------------------------------------------------------------------------
        | DIRECT VIDEO URL
        |--------------------------------------------------------------------------
        */

        if (
          data.videoUrl
        ) {

          setVideoUrl(
            data.videoUrl
          );

          setGenerationStatus(
            "success"
          );

          setGenerationMessage(
            "Your property video is ready."
          );

          return;
        }


        /*
        |--------------------------------------------------------------------------
        | VIDEO ID
        |--------------------------------------------------------------------------
        */

        if (
          data.videoId
        ) {

          setGenerationMessage(
            "Rendering your property video..."
          );

          await pollVideoStatus(
            data.videoId
          );

          return;
        }


        throw new Error(
          "Video generation API did not return a video URL or video ID."
        );

      } catch (error) {

        console.error(error);

        setGenerationStatus(
          "error"
        );

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

  const pollVideoStatus =
    async (videoId) => {

      const maxAttempts =
        180;


      for (
        let attempt = 0;
        attempt <
        maxAttempts;
        attempt++
      ) {

        const response =
          await fetch(
            `/api/videos?id=${encodeURIComponent(
              videoId
            )}`
          );


        if (
          response.ok
        ) {

          const data =
            await response.json();


          /*
          |--------------------------------------------------------------------------
          | Optional generated text
          |--------------------------------------------------------------------------
          */

          if (
            data.voiceoverText
          ) {

            setGeneratedVoiceText(
              data.voiceoverText
            );
          }


          if (
            data.videoText
          ) {

            setGeneratedVideoText(
              data.videoText
            );
          }


          /*
          |--------------------------------------------------------------------------
          | Completed
          |--------------------------------------------------------------------------
          */

          if (
            data.status ===
              "completed" &&
            data.videoUrl
          ) {

            setVideoUrl(
              data.videoUrl
            );

            setGenerationStatus(
              "success"
            );

            setGenerationMessage(
              "Your property video is ready."
            );

            return;
          }


          /*
          |--------------------------------------------------------------------------
          | Failed
          |--------------------------------------------------------------------------
          */

          if (
            data.status ===
            "failed"
          ) {

            throw new Error(
              data.error ||
                "Video rendering failed."
            );
          }


          /*
          |--------------------------------------------------------------------------
          | Processing
          |--------------------------------------------------------------------------
          */

          if (
            data.status ===
            "processing"
          ) {

            setGenerationMessage(
              "Rendering your property video..."
            );
          }
        }


        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              2000
            )
        );
      }


      throw new Error(
        "Video generation timed out."
      );
    };


  /*
  |--------------------------------------------------------------------------
  | CURRENT PROPERTY TYPE
  |--------------------------------------------------------------------------
  */

  const currentPropertyType =
    PROPERTY_TYPES.find(
      (item) =>
        item.id === propertyType
    );


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (

    <div
      className="
        flex-1
        flex
        flex-col
        md:flex-row
        bg-slate-50
        min-h-screen
        overflow-y-auto
      "
    >


      {/* ================================================================
          LEFT SIDEBAR
      ================================================================ */}

      <div
        className="
          w-full
          md:w-[400px]
          border-r
          border-slate-200
          bg-white
          flex
          flex-col
          flex-shrink-0
          min-h-0
        "
      >


        {/* ==============================================================
            HEADER
        ============================================================== */}

        <div
          className="
            px-5
            py-4
            border-b
            border-slate-100
            flex-shrink-0
          "
        >

          <h1
            className="
              text-base
              font-bold
              text-slate-900
              flex
              items-center
              gap-2
              leading-none
            "
          >

            <FaFilm
              className="
                text-primary
                text-xs
              "
            />

            Property Video

          </h1>


          <p
            className="
              text-[11px]
              text-slate-400
              mt-1
            "
          >

            Create professional property reels

          </p>

        </div>


        {/* ==============================================================
            IMPORTANT:
            ENTIRE FORM INCLUDING GENERATE BUTTON IS NOW SCROLLABLE
        ============================================================== */}

        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
          "
        >

          <div
            className="
              p-5
              pb-32
              space-y-6
            "
          >


            {/* ==========================================================
                1. PROPERTY PHOTOS
            ========================================================== */}

            <div>

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-2
                "
              >

                <label
                  className="
                    block
                    text-[11px]
                    font-bold
                    text-slate-400
                  "
                >

                  1. Property Photos

                </label>


                <span
                  className="
                    text-[9px]
                    font-bold
                    text-slate-400
                  "
                >

                  {images.length}/{MAX_IMAGES}

                </span>

              </div>


              {images.length > 0 && (

                <div
                  className="
                    space-y-2
                    mb-3
                  "
                >

                  {images.map(
                    (image, index) => (

                      <div
                        key={image.id}
                        className={`
                          flex
                          items-center
                          gap-2
                          p-2
                          rounded
                          border
                          ${
                            selectedScene ===
                            index
                              ? "border-primary bg-bg-page"
                              : "border-slate-200"
                          }
                        `}
                      >

                        <div
                          className="
                            w-5
                            h-5
                            rounded
                            bg-slate-900
                            text-white
                            flex
                            items-center
                            justify-center
                            text-[9px]
                            font-bold
                          "
                        >

                          {index + 1}

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            setSelectedScene(
                              index
                            )
                          }
                          className="
                            h-12
                            w-16
                            rounded
                            overflow-hidden
                            border
                            border-slate-200
                            flex-shrink-0
                            cursor-pointer
                          "
                        >

                          <img
                            src={
                              image.url
                            }
                            alt={`Property ${
                              index + 1
                            }`}
                            className="
                              w-full
                              h-full
                              object-cover
                            "
                          />

                        </button>


                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >

                          <p
                            className="
                              text-[10px]
                              font-bold
                              text-slate-700
                              truncate
                            "
                          >

                            {image.name}

                          </p>


                          <p
                            className="
                              text-[9px]
                              text-slate-400
                            "
                          >

                            Scene {index + 1}

                          </p>

                        </div>


                        <div
                          className="
                            flex
                            flex-col
                          "
                        >

                          <button
                            type="button"
                            disabled={
                              index === 0
                            }
                            onClick={() =>
                              moveImage(
                                index,
                                "up"
                              )
                            }
                            className="
                              p-1
                              text-slate-400
                              disabled:opacity-20
                              cursor-pointer
                            "
                          >

                            <FaChevronUp
                              className="
                                text-[8px]
                              "
                            />

                          </button>


                          <button
                            type="button"
                            disabled={
                              index ===
                              images.length - 1
                            }
                            onClick={() =>
                              moveImage(
                                index,
                                "down"
                              )
                            }
                            className="
                              p-1
                              text-slate-400
                              disabled:opacity-20
                              cursor-pointer
                            "
                          >

                            <FaChevronDown
                              className="
                                text-[8px]
                              "
                            />

                          </button>

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              index
                            )
                          }
                          className="
                            w-6
                            h-6
                            flex
                            items-center
                            justify-center
                            text-slate-400
                            hover:text-red-500
                            cursor-pointer
                          "
                        >

                          <FaTimes
                            className="
                              text-[9px]
                            "
                          />

                        </button>

                      </div>

                    )
                  )}

                </div>

              )}


              {images.length <
                MAX_IMAGES && (

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="
                    w-full
                    border-2
                    border-dashed
                    border-slate-200
                    rounded
                    p-4
                    hover:border-indigo-400
                    bg-slate-50/50
                    cursor-pointer
                  "
                >

                  {isUploading ? (

                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                      "
                    >

                      <FaSpinner
                        className="
                          animate-spin
                          text-indigo-600
                          text-xs
                        "
                      />

                      <span
                        className="
                          text-[10px]
                          font-semibold
                          text-slate-500
                        "
                      >

                        Uploading...

                      </span>

                    </div>

                  ) : (

                    <>

                      <FaImages
                        className="
                          mx-auto
                          text-indigo-500
                          text-lg
                          mb-2
                        "
                      />

                      <p
                        className="
                          text-xs
                          font-bold
                          text-slate-700
                        "
                      >

                        Add property photos

                      </p>

                      <p
                        className="
                          text-[9px]
                          text-slate-400
                          mt-1
                        "
                      >

                        Minimum {MIN_IMAGES} photos

                      </p>

                    </>

                  )}

                </button>

              )}


              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={
                  handleImageUpload
                }
              />

            </div>


            {/* ==========================================================
                2. LOGO
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                2. Agency Logo

                <span
                  className="
                    font-normal
                    text-slate-300
                    ml-1
                  "
                >

                  Optional

                </span>

              </label>


              {logo ? (

                <div
                  className="
                    relative
                    h-20
                    border
                    border-slate-200
                    rounded
                    bg-slate-50
                    flex
                    items-center
                    justify-center
                  "
                >

                  <img
                    src={logo}
                    alt="Agency logo"
                    className="
                      max-h-14
                      max-w-[180px]
                      object-contain
                    "
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setLogo("")
                    }
                    className="
                      absolute
                      top-2
                      right-2
                      w-6
                      h-6
                      rounded-full
                      bg-white
                      border
                      border-slate-200
                      flex
                      items-center
                      justify-center
                      text-slate-400
                      hover:text-red-500
                      cursor-pointer
                    "
                  >

                    <FaTimes
                      className="
                        text-[9px]
                      "
                    />

                  </button>

                </div>

              ) : (

                <button
                  type="button"
                  onClick={() =>
                    logoInputRef.current?.click()
                  }
                  className="
                    w-full
                    border
                    border-slate-200
                    rounded
                    p-3
                    flex
                    items-center
                    gap-3
                    hover:bg-slate-50
                    cursor-pointer
                  "
                >

                  <FaUpload
                    className="
                      text-slate-400
                      text-xs
                    "
                  />

                  <div
                    className="
                      text-left
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        font-bold
                        text-slate-700
                      "
                    >

                      {uploadingLogo
                        ? "Uploading..."
                        : "Upload agency logo"}

                    </p>


                    <p
                      className="
                        text-[9px]
                        text-slate-400
                      "
                    >

                      PNG recommended

                    </p>

                  </div>

                </button>

              )}


              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={
                  handleLogoUpload
                }
              />

            </div>


            {/* ==========================================================
                3. PROPERTY TYPE
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                3. Property Type

              </label>


              <div
                className="
                  grid
                  grid-cols-3
                  gap-1.5
                "
              >

                {PROPERTY_TYPES.map(
                  (type) => (

                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setPropertyType(
                          type.id
                        )
                      }
                      className={`
                        flex
                        flex-col
                        items-center
                        gap-1
                        p-2.5
                        rounded
                        border
                        cursor-pointer
                        ${
                          propertyType ===
                          type.id
                            ? "border-primary bg-bg-page"
                            : "border-slate-200"
                        }
                      `}
                    >

                      <span
                        className="
                          text-sm
                        "
                      >

                        {type.emoji}

                      </span>


                      <span
                        className="
                          text-[9px]
                          font-bold
                        "
                      >

                        {type.name}

                      </span>

                    </button>

                  )
                )}

              </div>

            </div>


            {/* ==========================================================
                4. PROPERTY DETAILS
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                4. Property Details

              </label>


              <div
                className="
                  grid
                  grid-cols-3
                  gap-2
                "
              >

                <div>

                  <label
                    className="
                      text-[9px]
                      text-slate-400
                    "
                  >

                    Bedrooms

                  </label>


                  <div
                    className="
                      relative
                      mt-1
                    "
                  >

                    <FaBed
                      className="
                        absolute
                        left-2
                        top-1/2
                        -translate-y-1/2
                        text-slate-300
                        text-[9px]
                      "
                    />


                    <input
                      type="number"
                      min="0"
                      value={
                        bedrooms
                      }
                      onChange={(e) =>
                        setBedrooms(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        pl-6
                        pr-2
                        py-2
                        border
                        border-slate-200
                        rounded
                        text-xs
                      "
                    />

                  </div>

                </div>


                <div>

                  <label
                    className="
                      text-[9px]
                      text-slate-400
                    "
                  >

                    Bathrooms

                  </label>


                  <div
                    className="
                      relative
                      mt-1
                    "
                  >

                    <FaBath
                      className="
                        absolute
                        left-2
                        top-1/2
                        -translate-y-1/2
                        text-slate-300
                        text-[9px]
                      "
                    />


                    <input
                      type="number"
                      min="0"
                      value={
                        bathrooms
                      }
                      onChange={(e) =>
                        setBathrooms(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        pl-6
                        pr-2
                        py-2
                        border
                        border-slate-200
                        rounded
                        text-xs
                      "
                    />

                  </div>

                </div>


                <div>

                  <label
                    className="
                      text-[9px]
                      text-slate-400
                    "
                  >

                    Living Rooms

                  </label>


                  <div
                    className="
                      relative
                      mt-1
                    "
                  >

                    <FaCouch
                      className="
                        absolute
                        left-2
                        top-1/2
                        -translate-y-1/2
                        text-slate-300
                        text-[9px]
                      "
                    />


                    <input
                      type="number"
                      min="0"
                      value={
                        livingRooms
                      }
                      onChange={(e) =>
                        setLivingRooms(
                          e.target.value
                        )
                      }
                      className="
                        w-full
                        pl-6
                        pr-2
                        py-2
                        border
                        border-slate-200
                        rounded
                        text-xs
                      "
                    />

                  </div>

                </div>

              </div>

            </div>


            {/* ==========================================================
                5. AREA
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                5. Property Area

              </label>


              <div
                className="
                  grid
                  grid-cols-[1fr_90px]
                  gap-2
                "
              >

                <div
                  className="
                    relative
                  "
                >

                  <FaRulerCombined
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-300
                      text-[10px]
                    "
                  />


                  <input
                    type="number"
                    min="0"
                    value={area}
                    onChange={(e) =>
                      setArea(
                        e.target.value
                      )
                    }
                    placeholder="180"
                    className="
                      w-full
                      pl-8
                      pr-3
                      py-2.5
                      border
                      border-slate-200
                      rounded
                      text-xs
                    "
                  />

                </div>


                <select
                  value={areaUnit}
                  onChange={(e) =>
                    setAreaUnit(
                      e.target.value
                    )
                  }
                  className="
                    px-2
                    py-2.5
                    border
                    border-slate-200
                    rounded
                    text-xs
                    bg-white
                  "
                >

                  {AREA_UNITS.map(
                    (unit) => (

                      <option
                        key={unit}
                        value={unit}
                      >

                        {unit}

                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            {/* ==========================================================
                6. OTHER ROOMS
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                6. Other Rooms

              </label>


              <div
                className="
                  grid
                  grid-cols-2
                  gap-1.5
                "
              >

                {OTHER_ROOMS.map(
                  (room) => {

                    const selected =
                      otherRooms.includes(
                        room.id
                      );

                    return (

                      <button
                        key={room.id}
                        type="button"
                        onClick={() =>
                          toggleOtherRoom(
                            room.id
                          )
                        }
                        className={`
                          flex
                          items-center
                          gap-2
                          px-2.5
                          py-2
                          rounded
                          border
                          text-left
                          cursor-pointer
                          ${
                            selected
                              ? "border-primary bg-bg-page"
                              : "border-slate-200"
                          }
                        `}
                      >

                        <span>
                          {room.emoji}
                        </span>


                        <span
                          className="
                            text-[9px]
                            font-semibold
                            truncate
                          "
                        >

                          {room.name}

                        </span>


                        {selected && (

                          <FaCheck
                            className="
                              ml-auto
                              text-[7px]
                              text-emerald-600
                            "
                          />

                        )}

                      </button>

                    );
                  }
                )}

              </div>

            </div>


            {/* ==========================================================
                7. LOCATION
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                7. Location

              </label>


              <div
                className="
                  relative
                "
              >

                <FaMapMarkerAlt
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-300
                    text-[10px]
                  "
                />


                <input
                  type="text"
                  value={location}
                  onChange={(e) =>
                    setLocation(
                      e.target.value
                    )
                  }
                  placeholder="Kaiserslautern, Germany"
                  className="
                    w-full
                    pl-8
                    pr-3
                    py-2.5
                    border
                    border-slate-200
                    rounded
                    text-xs
                  "
                />

              </div>

            </div>


            {/* ==========================================================
                8. ADDRESS
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                8. Property Address

              </label>


              <input
                type="text"
                value={address}
                onChange={(e) =>
                  setAddress(
                    e.target.value
                  )
                }
                placeholder="Street, City, Postal Code"
                className="
                  w-full
                  px-3
                  py-2.5
                  border
                  border-slate-200
                  rounded
                  text-xs
                "
              />


              <p
                className="
                  text-[8px]
                  text-slate-400
                  mt-1
                "
              >

                The backend can decide whether to display the full address.

              </p>

            </div>


            {/* ==========================================================
                9. PRICE
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                9. Property Price

              </label>


              <div
                className="
                  relative
                "
              >

                <FaEuroSign
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-300
                    text-[10px]
                  "
                />


                <input
                  type="text"
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value
                    )
                  }
                  placeholder="€449,000"
                  className="
                    w-full
                    pl-8
                    pr-3
                    py-2.5
                    border
                    border-slate-200
                    rounded
                    text-xs
                  "
                />

              </div>

            </div>


            {/* ==========================================================
                10. CONTACT
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                10. Contact Information

              </label>


              <div
                className="
                  space-y-2
                "
              >

                <div
                  className="
                    relative
                  "
                >

                  <FaPhone
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-300
                      text-[9px]
                    "
                  />


                  <input
                    type="text"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="+49 123 1234567"
                    className="
                      w-full
                      pl-8
                      pr-3
                      py-2.5
                      border
                      border-slate-200
                      rounded
                      text-xs
                    "
                  />

                </div>


                <div
                  className="
                    relative
                  "
                >

                  <FaWhatsapp
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-300
                      text-[10px]
                    "
                  />


                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) =>
                      setWhatsapp(
                        e.target.value
                      )
                    }
                    placeholder="+49 567 3245678"
                    className="
                      w-full
                      pl-8
                      pr-3
                      py-2.5
                      border
                      border-slate-200
                      rounded
                      text-xs
                    "
                  />

                </div>

              </div>

            </div>


            {/* ==========================================================
                11. AGENCY
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                11. Agency / Agent Name

              </label>


              <input
                type="text"
                value={agent}
                onChange={(e) =>
                  setAgent(
                    e.target.value
                  )
                }
                placeholder="Julia Immobilien"
                className="
                  w-full
                  px-3
                  py-2.5
                  border
                  border-slate-200
                  rounded
                  text-xs
                "
              />

            </div>


            {/* ==========================================================
                12. VIDEO VOICE LANGUAGE
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                12. Video Voice Language

              </label>


              <p
                className="
                  text-[9px]
                  text-slate-400
                  mb-2
                "
              >

                Choose the language the AI voice-over should speak.

              </p>


              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={() =>
                    setVoiceLanguage("en")
                  }
                  className={`
                    flex
                    items-center
                    justify-center
                    gap-2
                    p-3
                    rounded
                    border
                    cursor-pointer
                    ${
                      voiceLanguage ===
                      "en"
                        ? "border-primary bg-bg-page text-slate-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }
                  `}
                >

                  <span
                    className="
                      text-base
                    "
                  >
                    🇬🇧
                  </span>

                  <span
                    className="
                      text-[10px]
                      font-bold
                    "
                  >

                    English

                  </span>


                  {voiceLanguage ===
                    "en" && (

                    <FaCheck
                      className="
                        text-[8px]
                        text-emerald-600
                      "
                    />

                  )}

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setVoiceLanguage("de")
                  }
                  className={`
                    flex
                    items-center
                    justify-center
                    gap-2
                    p-3
                    rounded
                    border
                    cursor-pointer
                    ${
                      voiceLanguage ===
                      "de"
                        ? "border-primary bg-bg-page text-slate-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }
                  `}
                >

                  <span
                    className="
                      text-base
                    "
                  >
                    🇩🇪
                  </span>

                  <span
                    className="
                      text-[10px]
                      font-bold
                    "
                  >

                    Deutsch

                  </span>


                  {voiceLanguage ===
                    "de" && (

                    <FaCheck
                      className="
                        text-[8px]
                        text-emerald-600
                      "
                    />

                  )}

                </button>

              </div>

            </div>


            {/* ==========================================================
                13. VIDEO TEXT LANGUAGE
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                13. Video Text Language

              </label>


              <p
                className="
                  text-[9px]
                  text-slate-400
                  mb-2
                "
              >

                Choose the language for text displayed on the video.

              </p>


              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={() =>
                    setVideoTextLanguage(
                      "en"
                    )
                  }
                  className={`
                    flex
                    items-center
                    justify-center
                    gap-2
                    p-3
                    rounded
                    border
                    cursor-pointer
                    ${
                      videoTextLanguage ===
                      "en"
                        ? "border-primary bg-bg-page text-slate-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }
                  `}
                >

                  <span
                    className="
                      text-base
                    "
                  >
                    🇬🇧
                  </span>

                  <span
                    className="
                      text-[10px]
                      font-bold
                    "
                  >

                    English

                  </span>


                  {videoTextLanguage ===
                    "en" && (

                    <FaCheck
                      className="
                        text-[8px]
                        text-emerald-600
                      "
                    />

                  )}

                </button>


                <button
                  type="button"
                  onClick={() =>
                    setVideoTextLanguage(
                      "de"
                    )
                  }
                  className={`
                    flex
                    items-center
                    justify-center
                    gap-2
                    p-3
                    rounded
                    border
                    cursor-pointer
                    ${
                      videoTextLanguage ===
                      "de"
                        ? "border-primary bg-bg-page text-slate-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }
                  `}
                >

                  <span
                    className="
                      text-base
                    "
                  >
                    🇩🇪
                  </span>

                  <span
                    className="
                      text-[10px]
                      font-bold
                    "
                  >

                    Deutsch

                  </span>


                  {videoTextLanguage ===
                    "de" && (

                    <FaCheck
                      className="
                        text-[8px]
                        text-emerald-600
                      "
                    />

                  )}

                </button>

              </div>

            </div>


            {/* ==========================================================
                14. VIDEO STYLE
            ========================================================== */}

            <div>

              <label
                className="
                  block
                  text-[11px]
                  font-bold
                  text-slate-400
                  mb-2
                "
              >

                14. Video Style

              </label>


              <div
                className="
                  space-y-1.5
                "
              >

                {VIDEO_STYLES.map(
                  (style) => (

                    <button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        setVideoStyle(
                          style.id
                        )
                      }
                      className={`
                        w-full
                        flex
                        items-center
                        gap-3
                        px-3
                        py-2.5
                        rounded
                        border
                        text-left
                        cursor-pointer
                        ${
                          videoStyle ===
                          style.id
                            ? "border-primary bg-bg-page"
                            : "border-slate-200"
                        }
                      `}
                    >

                      <span>
                        {style.emoji}
                      </span>


                      <div
                        className="
                          flex-1
                        "
                      >

                        <p
                          className="
                            text-[10px]
                            font-bold
                          "
                        >

                          {style.name}

                        </p>


                        <p
                          className="
                            text-[8px]
                            text-slate-400
                          "
                        >

                          {style.description}

                        </p>

                      </div>


                      {videoStyle ===
                        style.id && (

                        <FaCheck
                          className="
                            text-[8px]
                            text-emerald-600
                          "
                        />

                      )}

                    </button>

                  )
                )}

              </div>

            </div>


            {/* ==========================================================
                15. GENERATE PROPERTY VIDEO
            ========================================================== */}

            <div
              className="
                pt-2
                pb-6
                border-t
                border-slate-100
              "
            >

              <div
                className="
                  mb-3
                "
              >

                <label
                  className="
                    block
                    text-[11px]
                    font-bold
                    text-slate-400
                  "
                >

                  15. Generate Property Video

                </label>


                <p
                  className="
                    text-[9px]
                    text-slate-400
                    mt-1
                  "
                >

                  The AI will use your property information, selected languages and video style to generate the video.

                </p>

              </div>


              <button
                type="button"
                onClick={
                  handleGenerateVideo
                }
                disabled={
                  generationStatus ===
                    "generating" ||
                  images.length <
                    MIN_IMAGES ||
                  isUploading
                }
                className="
                  w-full
                  bg-slate-950
                  hover:bg-slate-800
                  text-white
                  rounded
                  py-3.5
                  text-xs
                  font-bold
                  flex
                  items-center
                  justify-center
                  gap-2
                  disabled:opacity-50
                  cursor-pointer
                  shadow-md
                  shadow-slate-200
                "
              >

                {generationStatus ===
                "generating" ? (

                  <>

                    <FaSpinner
                      className="
                        animate-spin
                      "
                    />

                    Generating Video...

                  </>

                ) : generationStatus ===
                  "success" ? (

                  <>

                    <FaCheck
                      className="
                        text-emerald-400
                      "
                    />

                    Video Ready

                  </>

                ) : (

                  <>

                    <FaMagic
                      className="
                        text-primary
                      "
                    />

                    Generate Property Video

                  </>

                )}

              </button>


              {/* COST */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  mt-3
                  px-1
                "
              >

                <span
                  className="
                    text-[9px]
                    text-slate-400
                    font-semibold
                  "
                >

                  Cost: {VIDEO_COST} Credits

                </span>


                <span
                  className="
                    flex
                    items-center
                    gap-1
                    text-[9px]
                    font-bold
                    text-amber-600
                  "
                >

                  <FaCoins />

                  {session?.user?.credits ??
                    0}

                </span>

              </div>


              {/* ERROR */}
              {generationStatus ===
                "error" && (

                <div
                  className="
                    mt-3
                    bg-red-50
                    border
                    border-red-100
                    rounded
                    p-2.5
                    flex
                    gap-2
                  "
                >

                  <FaExclamationTriangle
                    className="
                      text-red-400
                      text-[10px]
                      mt-0.5
                    "
                  />


                  <p
                    className="
                      text-[9px]
                      text-red-600
                    "
                  >

                    {generationError}

                  </p>

                </div>

              )}


              {/* SUCCESS */}
              {generationStatus ===
                "success" && (

                <div
                  className="
                    mt-3
                    bg-emerald-50
                    border
                    border-emerald-100
                    rounded
                    p-2.5
                  "
                >

                  <p
                    className="
                      text-[9px]
                      font-bold
                      text-emerald-700
                    "
                  >

                    {generationMessage}

                  </p>

                </div>

              )}


              {/* IMPORTANT BOTTOM SPACE */}
              <div
                className="
                  h-8
                "
              />

            </div>

          </div>

        </div>

      </div>


      {/* ================================================================
          RIGHT WORKSPACE
      ================================================================ */}

      <div
        className="
          flex-1
          min-w-0
          min-h-0
          flex
          flex-col
          overflow-hidden
        "
      >


        {/* ==============================================================
            TOOLBAR
        ============================================================== */}

        <div
          className="
            px-5
            py-3.5
            bg-white
            border-b
            border-slate-200
            flex
            items-center
            justify-between
            gap-3
            flex-shrink-0
          "
        >

          <div
            className="
              min-w-0
            "
          >

            <h2
              className="
                text-xs
                sm:text-sm
                font-bold
                text-slate-900
              "
            >

              Property Video Preview

            </h2>


            <p
              className="
                text-[9px]
                text-slate-400
                mt-1
              "
            >

              1080 × 1920 • 9:16 vertical

            </p>

          </div>


          {/* ==========================================================
              DOWNLOAD BUTTON BESIDE PROPERTY VIDEO PREVIEW
          ========================================================== */}

          <div
            className="
              flex
              items-center
              gap-2
              flex-shrink-0
            "
          >

            {videoUrl && (

              <button
                type="button"
                onClick={
                  handleShare
                }
                className="
                  hidden
                  sm:flex
                  items-center
                  gap-1.5
                  px-3
                  py-1.5
                  rounded
                  border
                  border-slate-200
                  text-[10px]
                  font-bold
                  text-slate-600
                  hover:bg-slate-50
                  cursor-pointer
                "
              >

                <FaShareAlt />

                Share

              </button>

            )}


            {videoUrl && (

              <button
                type="button"
                onClick={
                  handleDownload
                }
                className="
                  flex
                  items-center
                  gap-1.5
                  px-3
                  py-1.5
                  rounded
                  bg-slate-950
                  text-white
                  text-[10px]
                  font-bold
                  hover:bg-slate-800
                  cursor-pointer
                  shadow-sm
                "
              >

                <FaDownload />

                Download

              </button>

            )}

          </div>

        </div>


        {/* ==============================================================
            WORKSPACE SCROLL
        ============================================================== */}

        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
          "
        >

          <div
            className="
              p-5
              sm:p-8
              pb-24
              flex
              flex-col
              items-center
            "
          >


            {/* ==========================================================
                PHONE PREVIEW
            ========================================================== */}

            <div
              className="
                w-full
                max-w-[360px]
              "
            >

              <div
                className="
                  relative
                  aspect-[9/16]
                  bg-slate-950
                  rounded-[28px]
                  p-2
                  shadow-2xl
                "
              >

                <div
                  className="
                    relative
                    w-full
                    h-full
                    rounded-[22px]
                    overflow-hidden
                    bg-slate-900
                  "
                >

                  {videoUrl ? (

                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="
                        absolute
                        inset-0
                        w-full
                        h-full
                        object-cover
                      "
                      playsInline
                      controls={false}
                      onPlay={() =>
                        setIsPlaying(
                          true
                        )
                      }
                      onPause={() =>
                        setIsPlaying(
                          false
                        )
                      }
                    />

                  ) : images.length >
                    0 ? (

                    <div
                      className="
                        absolute
                        inset-0
                      "
                    >

                      <img
                        src={
                          images[
                            Math.min(
                              selectedScene,
                              images.length -
                                1
                            )
                          ]?.url
                        }
                        alt="Property preview"
                        className="
                          absolute
                          inset-0
                          w-full
                          h-full
                          object-cover
                        "
                      />


                      <div
                        className="
                          absolute
                          inset-0
                          bg-gradient-to-t
                          from-black/80
                          via-transparent
                          to-black/20
                        "
                      />


                      {logo && (

                        <img
                          src={logo}
                          alt="Agency logo"
                          className="
                            absolute
                            top-5
                            left-5
                            max-w-[90px]
                            max-h-[40px]
                            object-contain
                          "
                        />

                      )}


                      <div
                        className="
                          absolute
                          top-5
                          right-5
                        "
                      >

                        <div
                          className="
                            bg-black/40
                            backdrop-blur-sm
                            text-white
                            text-[7px]
                            font-bold
                            px-2
                            py-1
                            rounded-full
                          "
                        >

                          {videoTextLanguage ===
                          "de"
                            ? "IMMOBILIEN"
                            : "PROPERTY"}

                        </div>

                      </div>


                      <div
                        className="
                          absolute
                          left-5
                          right-5
                          bottom-8
                          text-white
                        "
                      >

                        {location && (

                          <p
                            className="
                              text-[8px]
                              font-semibold
                              opacity-80
                              mb-1
                            "
                          >

                            {location}

                          </p>

                        )}


                        <h3
                          className="
                            text-xl
                            font-bold
                            leading-tight
                          "
                        >

                          {videoTextLanguage ===
                          "de"
                            ? `${
                                PROPERTY_TYPE_TRANSLATIONS
                                  .de[
                                  propertyType
                                ]
                              }`
                            : `${
                                currentPropertyType?.name ||
                                "Property"
                              }`}

                        </h3>


                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            mt-2
                            text-[8px]
                            font-semibold
                          "
                        >

                          <span>

                            {bedrooms}{" "}

                            {videoTextLanguage ===
                            "de"
                              ? "Schlafzimmer"
                              : "Bedrooms"}

                          </span>


                          <span
                            className="
                              opacity-50
                            "
                          >

                            •

                          </span>


                          <span>

                            {bathrooms}{" "}

                            {videoTextLanguage ===
                            "de"
                              ? "Bäder"
                              : "Bathrooms"}

                          </span>

                        </div>


                        {area && (

                          <p
                            className="
                              text-xs
                              font-semibold
                              mt-2
                            "
                          >

                            {area}{" "}
                            {areaUnit}

                          </p>

                        )}


                        {price && (

                          <p
                            className="
                              text-lg
                              font-bold
                              mt-2
                            "
                          >

                            {price}

                          </p>

                        )}

                      </div>


                      <div
                        className="
                          absolute
                          inset-0
                          flex
                          items-center
                          justify-center
                          pointer-events-none
                        "
                      >

                        <div
                          className="
                            w-14
                            h-14
                            rounded-full
                            bg-white/90
                            flex
                            items-center
                            justify-center
                          "
                        >

                          <FaPlay
                            className="
                              text-slate-900
                              text-sm
                              ml-1
                            "
                          />

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        flex-col
                        items-center
                        justify-center
                        text-center
                        p-8
                      "
                    >

                      <div
                        className="
                          w-16
                          h-16
                          rounded-full
                          bg-white/5
                          flex
                          items-center
                          justify-center
                          mb-5
                        "
                      >

                        <FaHome
                          className="
                            text-xl
                            text-slate-500
                          "
                        />

                      </div>


                      <p
                        className="
                          text-sm
                          font-bold
                          text-white
                        "
                      >

                        Your property video

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-slate-500
                          mt-2
                        "
                      >

                        Upload your property photos to preview your video.

                      </p>

                    </div>

                  )}


                  <div
                    className="
                      absolute
                      top-0
                      left-1/2
                      -translate-x-1/2
                      w-24
                      h-5
                      bg-slate-950
                      rounded-b-xl
                      z-20
                    "
                  />

                </div>

              </div>


              {/* VIDEO CONTROLS */}

              {videoUrl && (

                <div
                  className="
                    flex
                    justify-center
                    gap-2
                    mt-4
                  "
                >

                  <button
                    type="button"
                    onClick={
                      togglePlay
                    }
                    className="
                      w-9
                      h-9
                      rounded-full
                      bg-white
                      border
                      border-slate-200
                      flex
                      items-center
                      justify-center
                      cursor-pointer
                    "
                  >

                    {isPlaying ? (

                      <FaPause
                        className="
                          text-[9px]
                        "
                      />

                    ) : (

                      <FaPlay
                        className="
                          text-[9px]
                        "
                      />

                    )}

                  </button>


                  <button
                    type="button"
                    onClick={
                      restartVideo
                    }
                    className="
                      w-9
                      h-9
                      rounded-full
                      bg-white
                      border
                      border-slate-200
                      flex
                      items-center
                      justify-center
                      cursor-pointer
                    "
                  >

                    <FaRedo
                      className="
                        text-[9px]
                      "
                    />

                  </button>


                  {/* MOBILE DOWNLOAD */}

                  <button
                    type="button"
                    onClick={
                      handleDownload
                    }
                    className="
                      sm:hidden
                      h-9
                      px-4
                      rounded-full
                      bg-slate-950
                      text-white
                      flex
                      items-center
                      justify-center
                      gap-2
                      text-[9px]
                      font-bold
                      cursor-pointer
                    "
                  >

                    <FaDownload />

                    Download

                  </button>

                </div>

              )}

            </div>


            {/* ==========================================================
                GENERATION STATUS
            ========================================================== */}

            {generationStatus ===
              "generating" && (

              <div
                className="
                  mt-6
                  w-full
                  max-w-[600px]
                  bg-white
                  border
                  border-slate-200
                  rounded-xl
                  p-4
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >

                  <FaSpinner
                    className="
                      animate-spin
                      text-indigo-600
                    "
                  />


                  <div>

                    <p
                      className="
                        text-[11px]
                        font-bold
                      "
                    >

                      Creating your property video

                    </p>


                    <p
                      className="
                        text-[9px]
                        text-slate-400
                        mt-1
                      "
                    >

                      {generationMessage}

                    </p>

                  </div>

                </div>

              </div>

            )}


            {/* ==========================================================
                GENERATED VOICE TEXT
                Optional display for future backend response
            ========================================================== */}

            {generatedVoiceText && (

              <div
                className="
                  w-full
                  max-w-[700px]
                  mt-8
                "
              >

                <div
                  className="
                    bg-white
                    border
                    border-slate-200
                    rounded-xl
                    p-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mb-2
                    "
                  >

                    <FaVolumeUp
                      className="
                        text-slate-400
                        text-xs
                      "
                    />


                    <h3
                      className="
                        text-xs
                        font-bold
                        text-slate-800
                      "
                    >

                      AI Voice Text

                    </h3>

                  </div>


                  <p
                    className="
                      text-[10px]
                      text-slate-600
                      leading-relaxed
                    "
                  >

                    {generatedVoiceText}

                  </p>

                </div>

              </div>

            )}


            {/* ==========================================================
                GENERATED VIDEO TEXT
                Optional display for future backend response
            ========================================================== */}

            {generatedVideoText && (

              <div
                className="
                  w-full
                  max-w-[700px]
                  mt-4
                "
              >

                <div
                  className="
                    bg-white
                    border
                    border-slate-200
                    rounded-xl
                    p-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mb-2
                    "
                  >

                    <FaFilm
                      className="
                        text-slate-400
                        text-xs
                      "
                    />


                    <h3
                      className="
                        text-xs
                        font-bold
                        text-slate-800
                      "
                    >

                      AI Video Text

                    </h3>

                  </div>


                  <pre
                    className="
                      text-[9px]
                      text-slate-600
                      leading-relaxed
                      whitespace-pre-wrap
                      font-sans
                    "
                  >

                    {typeof generatedVideoText ===
                    "string"
                      ? generatedVideoText
                      : JSON.stringify(
                          generatedVideoText,
                          null,
                          2
                        )}

                  </pre>

                </div>

              </div>

            )}


            {/* ==========================================================
                SCENES
            ========================================================== */}

            {images.length >
              0 && (

              <div
                className="
                  w-full
                  max-w-[700px]
                  mt-8
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    mb-3
                  "
                >

                  <div>

                    <h3
                      className="
                        text-xs
                        font-bold
                      "
                    >

                      Video Scenes

                    </h3>


                    <p
                      className="
                        text-[9px]
                        text-slate-400
                        mt-1
                      "
                    >

                      Each property photo becomes a scene.

                    </p>

                  </div>


                  <span
                    className="
                      text-[9px]
                      font-bold
                      text-slate-400
                    "
                  >

                    {images.length} Scenes

                  </span>

                </div>


                <div
                  className="
                    grid
                    grid-cols-3
                    sm:grid-cols-6
                    gap-2
                  "
                >

                  {images.map(
                    (image, index) => (

                      <button
                        key={image.id}
                        type="button"
                        onClick={() =>
                          setSelectedScene(
                            index
                          )
                        }
                        className={`
                          relative
                          aspect-[9/14]
                          rounded-lg
                          overflow-hidden
                          border-2
                          cursor-pointer
                          ${
                            selectedScene ===
                            index
                              ? "border-slate-900"
                              : "border-white"
                          }
                        `}
                      >

                        <img
                          src={
                            image.url
                          }
                          alt={`Scene ${
                            index + 1
                          }`}
                          className="
                            w-full
                            h-full
                            object-cover
                          "
                        />


                        <span
                          className="
                            absolute
                            bottom-1
                            left-1.5
                            text-white
                            text-[8px]
                            font-bold
                          "
                        >

                          {index + 1}

                        </span>

                      </button>

                    )
                  )}

                </div>

              </div>

            )}


            {/* ==========================================================
                MVP END SPACE
            ============================================================== */}

            <div
              className="
                h-20
              "
            />

          </div>

        </div>

      </div>

    </div>
  );
}

