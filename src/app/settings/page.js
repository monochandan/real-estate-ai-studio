
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiSettings, FiFacebook, FiInstagram } from "react-icons/fi";
import toast from "react-hot-toast";

const PLATFORMS = [
  { key: "FACEBOOK", label: "Facebook Page", Icon: FiFacebook },
  { key: "INSTAGRAM", label: "Instagram", Icon: FiInstagram },
];

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [connections, setConnections] = useState({});
  const [urls, setUrls] = useState({
    FACEBOOK: "",
    INSTAGRAM: "",
  });
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status !== "authenticated") return;

    async function loadSettings() {
      try {
        const response = await fetch("/api/social/settings", {
          cache: "no-store",
        });

        if (!response.ok) throw new Error("Unable to load settings");

        const data = await response.json();
        const mapped = {};

        for (const connection of data.connections) {
          mapped[connection.platform] = connection;
        }

        setConnections(mapped);
        setUrls({
          FACEBOOK: mapped.FACEBOOK?.profileUrl ?? "",
          INSTAGRAM: mapped.INSTAGRAM?.profileUrl ?? "",
        });
        setShowPrompt(data.showPublishingPrompt);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [status, router]);

  async function saveProfile(platform) {
    setSaving(platform);

    try {
      const response = await fetch(
        `/api/social/connections/${platform.toLowerCase()}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileUrl: urls[platform],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile");
      }

      setConnections((previous) => ({
        ...previous,
        [platform]: data.connection,
      }));

      toast.success("Profile link saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(null);
    }
  }

  async function updatePrompt(enabled) {
    const previous = showPrompt;
    setShowPrompt(enabled);

    try {
      const response = await fetch("/api/social/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showPublishingPrompt: enabled,
        }),
      });

      if (!response.ok) throw new Error("Unable to save preference");

      toast.success("Publishing preference updated");
    } catch (error) {
      setShowPrompt(previous);
      toast.error(error.message);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-secondary-text">
        Loading settings...
      </main>
    );
  }

  if (status !== "authenticated") return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <FiSettings className="text-primary" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-primary-text">
            Settings
          </h1>
          <p className="text-sm text-secondary-text">
            Manage social accounts and publishing preferences.
          </p>
        </div>
      </div>

      <section className="space-y-5">
        {PLATFORMS.map(({ key, label, Icon }) => {
          const connection = connections[key];
          const connected = connection?.status === "CONNECTED";

          return (
            <div
              key={key}
              className="rounded-xl border border-divider bg-bg-card p-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <Icon size={23} className="text-primary" />
                <div className="flex-1">
                  <h2 className="font-semibold text-primary-text">
                    {label}
                  </h2>
                  <p className="text-xs text-secondary-text">
                    {connected
                      ? connection.accountName || "Connected account"
                      : "Not connected for publishing"}
                  </p>
                </div>

                <span className={
                  connected
                    ? "text-xs text-emerald-500"
                    : "text-xs text-secondary-text"
                }>
                  {connected ? "Connected" : "Not Connected"}
                </span>
              </div>

              <label
                htmlFor={`profile-${key}`}
                className="mb-2 block text-xs font-semibold text-secondary-text"
              >
                Profile URL
              </label>

              <input
                id={`profile-${key}`}
                type="url"
                value={urls[key]}
                disabled={connected}
                onChange={(event) =>
                  setUrls((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                placeholder={
                  key === "FACEBOOK"
                    ? "https://www.facebook.com/yourpage"
                    : "https://www.instagram.com/yourprofile"
                }
                className="w-full rounded-lg border border-divider bg-bg-page px-4 py-3 text-sm text-primary-text outline-none focus:border-primary disabled:opacity-60"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                {!connected && (
                  <button
                    onClick={() => saveProfile(key)}
                    disabled={saving === key}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving === key ? "Saving..." : "Save Profile Link"}
                  </button>
                )}

                <span className="self-center text-xs text-secondary-text">
                  {connected
                    ? "Use Change Account to authorize a different profile."
                    : "Publishing connection will be available after OAuth setup."}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-xl border border-divider bg-bg-card p-5">
        <h2 className="font-semibold text-primary-text">
          Publishing Preferences
        </h2>

        <label className="mt-4 flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary-text">
              Ask to publish after video generation
            </p>
            <p className="mt-1 text-xs text-secondary-text">
              You can always publish later from Gallery.
            </p>
          </div>

          <input
            type="checkbox"
            checked={showPrompt}
            onChange={(event) =>
              updatePrompt(event.target.checked)
            }
            className="h-5 w-5 accent-primary"
          />
        </label>
      </section>
    </main>
  );
}
