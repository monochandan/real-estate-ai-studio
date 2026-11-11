
"use client";

import { useRef, useState } from "react";

export default function PropertyPhotoUploader({
  projectId,
  onUploadComplete,
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setUploading(true);
    setError("");

    let successfulUploads = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setProgress(
          `Uploading ${i + 1} of ${files.length}: ${file.name}`
        );

        if (
          !["image/jpeg", "image/png", "image/webp"].includes(
            file.type
          )
        ) {
          throw new Error(
            `${file.name}: Unsupported image format.`
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            `${file.name}: File exceeds 10 MB.`
          );
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/propertyPrep/${projectId}/photos`,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || `Upload failed: ${file.name}`
          );
        }

        successfulUploads++;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress("");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (successfulUploads > 0) {
        onUploadComplete?.();
      }
    }
  }

  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-xl font-semibold">
        Upload property photos
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Select multiple JPEG, PNG, or WebP photos.
        Maximum 10 MB per photo.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        disabled={uploading}
        className="mt-5 block w-full text-sm"
      />

      {uploading && (
        <p role="status" className="mt-4 text-sm">
          {progress}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
