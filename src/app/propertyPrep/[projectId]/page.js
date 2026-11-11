"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import PropertyPhotoUploader from "@/components/propertyPrep/PropertyPhotoUploader";
import PropertyPhotoGrid from "@/components/propertyPrep/PropertyPhotoGrid";

export default function PropertyWorkspacePage() {
  const { projectId } = useParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  const loadProject = useCallback(
    async (initialLoad = false) => {
      if (!projectId) return;

      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const response = await fetch(
          `/api/propertyPrep/${projectId}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Could not load project."
          );
        }

        setProject(result.project);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    loadProject(true);
  }, [loadProject]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        Loading property project...
      </main>
    );
  }

  if (error && !project) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p role="alert" className="text-red-600">
          {error}
        </p>

        <button
          onClick={() => router.push("/propertyprep")}
          className="mt-4 underline"
        >
          Back to Property Prep
        </button>
      </main>
    );
  }

  
    async function handleReorder(reorderedPhotos) {
        if (!project || savingOrder) return;

        const previousPhotos = project.propertyPhotos;

        // Show the new order immediately.
        setProject((current) => ({
            ...current,
            propertyPhotos: reorderedPhotos,
        }));

        setSavingOrder(true);
        setError("");

        try {
            const response = await fetch(
            `/api/propertyPrep/${projectId}/photos/reorder`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                photoIds: reorderedPhotos.map((photo) => photo.id),
                }),
            }
            );

            const result = await response.json();

            if (!response.ok) {
            throw new Error(
                result.error || "Could not save photo order."
            );
            }

            // Refresh to get the authoritative database order.
            await loadProject();
        } catch (err) {
            // Restore the previous order if saving fails.
            setProject((current) => ({
            ...current,
            propertyPhotos: previousPhotos,
            }));

            setError(err.message);
        } finally {
            setSavingOrder(false);
        }
    }

    
    async function handleDeletePhoto(photo) {
        if (savingOrder) return;

        const confirmed = window.confirm(
            "Delete this photo from the property project?"
        );

        if (!confirmed) return;

        setSavingOrder(true);
        setError("");

        try {
            const response = await fetch(
            `/api/propertyPrep/${projectId}/photos/${photo.id}`,
            { method: "DELETE" }
            );

            const result = await response.json();

            if (!response.ok) {
            throw new Error(
                result.error || "Could not delete photo."
            );
            }

            await loadProject();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingOrder(false);
        }
    }

    
    async function handleRoomTypeChange(photo, selectedRoomType) {
        if (savingOrder) return;

        const previousPhotos = project.propertyPhotos;
        const roomType = selectedRoomType || null;

        // Update the dropdown immediately.
        setProject((current) => ({
            ...current,
            propertyPhotos: current.propertyPhotos.map((item) =>
            item.id === photo.id
                ? {
                    ...item,
                    roomType,
                    roomTypeSource: roomType ? "manual" : null,
                }
                : item
            ),
        }));

        setSavingOrder(true);
        setError("");

        try {
            const response = await fetch(
            `/api/propertyPrep/${projectId}/photos/${photo.id}/room-type`,
            {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ roomType }),
            }
            );

            const result = await response.json();

            if (!response.ok) {
            throw new Error(
                result.error || "Could not save room type."
            );
            }
        } catch (err) {
            // Restore the previous selection if saving fails.
            setProject((current) => ({
            ...current,
            propertyPhotos: previousPhotos,
            }));

            setError(err.message);
        } finally {
            setSavingOrder(false);
        }
    }




  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <button
          onClick={() => router.push("/propertyprep")}
          className="mb-4 text-sm text-blue-600 underline"
        >
          Back to Property Prep
        </button>

        <h1 className="text-3xl font-bold">
          {project?.name || "Untitled property"}
        </h1>

        <p className="mt-2 text-gray-500">
          Upload and prepare photos for your property video.
        </p>
      </header>

      <PropertyPhotoUploader
        projectId={projectId}
        onUploadComplete={() => loadProject()}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {refreshing && (
        <p role="status" className="text-sm text-gray-500">
          Refreshing photos...
        </p>
      )}

      <PropertyPhotoGrid
            photos={project?.propertyPhotos || []}
            onReorder={handleReorder}
            onDelete={handleDeletePhoto}
            onRoomTypeChange={handleRoomTypeChange}
            saving={savingOrder}
      />
    </main>
  );
}
