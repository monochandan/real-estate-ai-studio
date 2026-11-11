"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PropertyPrepPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createProject(event) {
    event.preventDefault();

    const name = projectName.trim();

    if (!name) {
      setError("Please enter a property name.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/propertyPrep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not create project."
        );
      }

      router.push(`/propertyprep/${result.project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">
        Property Prep Studio
      </h1>

      <p className="mt-3 text-gray-500">
        Create a property project, upload photos, and
        prepare your listing video.
      </p>

      <form
        onSubmit={createProject}
        className="mt-8 space-y-4 rounded-xl border p-6"
      >
        <label
          htmlFor="projectName"
          className="block font-medium"
        >
          Property name
        </label>

        <input
          id="projectName"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Modern Apartment in Berlin"
          maxLength={120}
          required
          className="w-full rounded-lg border px-4 py-3 text-gray-900"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create project"}
        </button>
      </form>
    </main>
  );
}
