
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import {
  FaImages,
  FaVideo,
  FaPlay,
  FaDownload,
  FaTrashAlt,
  FaTimes,
  FaSpinner,
  FaPlus,
  FaGoogle,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function GalleryPage() {
  const { data: session, status } = useSession();

  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const fetchGallery = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/gallery", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load gallery");
      }

      setAssets(data.assets || []);
    } catch (err) {
      console.error("Gallery error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGallery();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchGallery]);

  const filteredAssets = assets.filter((asset) => {
    if (filter === "ALL") return true;
    return asset.type === filter;
  });

  const imageCount = assets.filter(
    (asset) => asset.type === "GENERATED_IMAGE"
  ).length;

  const videoCount = assets.filter(
    (asset) => asset.type === "VIDEO"
  ).length;

  async function handleDownload(asset) {
    if (!asset.url) {
      alert("This file is currently unavailable.");
      return;
    }

    try {
      const response = await fetch(asset.url);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const extension =
        asset.type === "VIDEO" ? "mp4" : "png";

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `property-${asset.id}.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("Download error:", err);
      alert(
        "Unable to download the file. Please refresh and try again."
      );
    }
  }

  async function handleDelete(asset) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this file?"
    );

    if (!confirmed) return;

    setDeletingId(asset.id);

    try {
      const response = await fetch(
        `/api/gallery/${encodeURIComponent(asset.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete this file"
        );
      }

      setAssets((previous) =>
        previous.filter((item) => item.id !== asset.id)
      );

      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message);
      // Refresh in case database deletion succeeded
      // but storage cleanup failed.
      await fetchGallery();
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-slate-50">
        <FaSpinner className="animate-spin text-3xl text-indigo-600" />
        <p className="text-slate-500 text-sm">
          Loading your gallery...
        </p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <FaImages className="text-4xl text-indigo-600 mx-auto mb-5" />

          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            My Gallery
          </h1>

          <p className="text-slate-500 text-sm mb-6">
            Sign in to view your generated property images
            and videos.
          </p>

          <button
            onClick={() => signIn("google")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 w-full cursor-pointer"
          >
            <FaGoogle />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              My Gallery
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              View, download, and manage your AI-generated
              property images and videos.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            <FaPlus />
            Create New
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            {
              id: "ALL",
              label: "All Media",
              count: assets.length,
              icon: FaImages,
            },
            {
              id: "GENERATED_IMAGE",
              label: "Images",
              count: imageCount,
              icon: FaImages,
            },
            {
              id: "VIDEO",
              label: "Videos",
              count: videoCount,
              icon: FaVideo,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = filter === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon />
                {item.label}
                <span className={active ? "text-indigo-100" : "text-slate-400"}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-6">
            <FaExclamationTriangle />
            <span className="text-sm">{error}</span>
            <button
              onClick={fetchGallery}
              className="ml-auto underline text-sm cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {filteredAssets.length === 0 && !error ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-20 px-6 text-center">
            <FaImages className="text-5xl text-slate-300 mx-auto mb-5" />

            <h2 className="text-xl font-bold text-slate-800 mb-2">
              No media found
            </h2>

            <p className="text-slate-500 text-sm mb-6">
              Your generated images and videos will appear here.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-semibold"
            >
              <FaPlus />
              Generate Your First Asset
            </Link>
          </div>
        ) : (
          /* Media grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => {
              const isVideo = asset.type === "VIDEO";
              const isDeleting = deletingId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Media thumbnail */}
                  <button
                    type="button"
                    disabled={!asset.url}
                    onClick={() => setSelectedAsset(asset)}
                    className="relative w-full aspect-video bg-slate-900 overflow-hidden group cursor-pointer disabled:cursor-not-allowed"
                  >
                    {asset.url ? (
                      isVideo ? (
                        <video
                          src={asset.url}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.roomType || "Generated property"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="text-slate-400 text-sm p-4">
                        Media unavailable
                      </div>
                    )}

                    {isVideo && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center">
                          <FaPlay />
                        </span>
                      </span>
                    )}

                    <span className="absolute top-3 left-3 bg-white/95 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      {isVideo ? <FaVideo /> : <FaImages />}
                      {isVideo ? "Video" : "Image"}
                    </span>
                  </button>

                  {/* Metadata */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">
                      {asset.roomType ||
                        asset.projectName ||
                        (isVideo ? "Property Video" : "Generated Image")}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <button
                        onClick={() => setSelectedAsset(asset)}
                        disabled={!asset.url}
                        className="bg-slate-100 hover:bg-slate-200 rounded-lg py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleDownload(asset)}
                        disabled={!asset.url}
                        title="Download"
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg py-2 flex justify-center items-center cursor-pointer disabled:opacity-50"
                      >
                        <FaDownload />
                      </button>

                      <button
                        onClick={() => handleDelete(asset)}
                        disabled={isDeleting}
                        title="Delete"
                        className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg py-2 flex justify-center items-center disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTrashAlt />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fullscreen preview */}
        {selectedAsset && (
          <div
            role="presentation"
            onClick={() => setSelectedAsset(null)}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Media preview"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-slate-950 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-semibold text-sm">
                  {selectedAsset.type === "VIDEO"
                    ? "Video Preview"
                    : "Image Preview"}
                </h2>

                <button
                  onClick={() => setSelectedAsset(null)}
                  aria-label="Close preview"
                  className="text-white hover:text-red-400 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="flex items-center justify-center bg-black max-h-[75vh] overflow-hidden">
                {selectedAsset.type === "VIDEO" ? (
                  <video
                    key={selectedAsset.id}
                    src={selectedAsset.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[75vh]"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedAsset.url}
                    alt="Generated property preview"
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 p-4">
                <button
                  onClick={() => handleDownload(selectedAsset)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <FaDownload />
                  Download
                </button>

                <button
                  onClick={() => handleDelete(selectedAsset)}
                  disabled={deletingId === selectedAsset.id}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <FaTrashAlt />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
