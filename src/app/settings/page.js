
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiSettings, FiFacebook, FiInstagram } from "react-icons/fi";
import toast from "react-hot-toast";

const PLATFORMS = [
  { key: "FACEBOOK", label: "Facebook Page", Icon: FiFacebook },
  { key: "INSTAGRAM", label: "Instagram", Icon: FiInstagram },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const metaStatus = searchParams.get("meta_status");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [connections, setConnections] = useState({});
  const [urls, setUrls] = useState({
    FACEBOOK: "",
    INSTAGRAM: "",
  });
  const [showPrompt, setShowPrompt] = useState(true);

  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [connectingPage, setConnectingPage] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/socials/settings", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load settings");
    }

    const data = await response.json();
    const mapped = {};

    for (const connection of data.connections || []) {
      mapped[connection.platform] = connection;
    }

    setConnections(mapped);
    setUrls({
      FACEBOOK: mapped.FACEBOOK?.profileUrl ?? "",
      INSTAGRAM: mapped.INSTAGRAM?.profileUrl ?? "",
    });
    setShowPrompt(data.showPublishingPrompt ?? true);
  }, []);

  
  const [disconnectingPlatform, setDisconnectingPlatform] =
    useState(null);

  async function disconnectSocialAccount(platform) {
    const confirmed = window.confirm(
      platform === "FACEBOOK"
        ? "Disconnect Facebook? This will also disconnect the linked Instagram account."
        : "Disconnect Instagram from Real Estate AI Studio?"
    );

    if (!confirmed) return;

    setDisconnectingPlatform(platform);

    try {
      const response = await fetch(
        `/api/socials/connections/${platform.toLowerCase()}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to disconnect account."
        );
      }

      toast.success(
        platform === "FACEBOOK"
          ? "Facebook and linked Instagram disconnected."
          : "Instagram disconnected."
      );

      await loadSettings();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDisconnectingPlatform(null);
    }
  }


  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status !== "authenticated") return;

    let cancelled = false;

    async function initialize() {
      try {
        await loadSettings();
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [status, router, loadSettings]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      metaStatus !== "select_account"
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadAvailablePages() {
      setLoadingPages(true);
      setSelectionError("");

      try {
        const response = await fetch(
          "/api/socials/oauth/meta/select", 
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load Facebook Pages"
          );
        }

        if (controller.signal.aborted) return;

        const pages = data.accounts || [];

        setAvailablePages(pages);
        setSelectedPageId(pages[0]?.id || "");
      } catch (error) {
        if (controller.signal.aborted) return;

        setSelectionError(error.message);
        toast.error(error.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPages(false);
        }
      }
    }

    loadAvailablePages();

    return () => controller.abort();
  }, [status, metaStatus]);

  async function connectSelectedPage() {
    if (!selectedPageId || connectingPage) return;

    setConnectingPage(true);

    try {
      const response = await fetch(
        "/api/socials/oauth/meta/select",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageId: selectedPageId,
          }),
        }
      );

      const data = await response.json();

      // ADD THIS BLOCK HERE
      console.log("Meta publishing permission check:", {
        verified: data.permissions?.verified,
        missing: data.permissions?.missing,
        pageTasks: data.permissions?.pageTasks,
      });

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to connect Facebook Page"
        );
      }

      await loadSettings();

      setAvailablePages([]);
      setSelectedPageId("");
      setSelectionError("");

      toast.success(
        `${data.account.name} connected successfully`
      );

      // Remove the selection status from the address bar.
      router.replace("/settings", { scroll: false });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConnectingPage(false);
    }
  }

  async function saveProfile(platform) {
    setSaving(platform);

    try {
      const response = await fetch(
        `/api/socials/connections/${platform.toLowerCase()}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
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
      const response = await fetch("/api/socials/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showPublishingPrompt: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save preference");
      }

      toast.success("Publishing preference updated");
    } catch (error) {
      setShowPrompt(previous);
      toast.error(error.message);
    }
  }

  function startMetaConnection() {
    window.location.assign("/api/socials/oauth/meta/start");
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
    <main className="settings-scroll mx-auto min-h-screen max-w-4xl overflow-y-auto px-4 py-10 pb-24 sm:px-6">
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

      {metaStatus === "select_account" && (
        <section className="mb-6 rounded-xl border border-primary bg-bg-card p-5">
          <h2 className="text-lg font-semibold text-primary-text">
            Choose a Facebook Page
          </h2>

          <p className="mt-2 text-sm text-secondary-text">
            Select the Facebook Page you want to connect to your
            account. Your linked Instagram account is shown for
            reference.
          </p>

          {loadingPages ? (
            <p className="mt-4 text-sm text-secondary-text">
              Loading available Facebook Pages...
            </p>
          ) : selectionError ? (
            <div className="mt-4 space-y-3">
              <p role="alert" className="text-sm text-red-500">
                {selectionError}
              </p>

              <button
                type="button"
                onClick={startMetaConnection}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Reconnect Facebook
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {availablePages.map((page) => (
                <label
                  key={page.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-divider bg-bg-page p-4"
                >
                  <input
                    type="radio"
                    name="facebook-page"
                    value={page.id}
                    checked={selectedPageId === page.id}
                    onChange={() => setSelectedPageId(page.id)}
                    disabled={connectingPage}
                    className="mt-1 accent-primary"
                  />

                  <div className="min-w-0">
                    <p className="font-semibold text-primary-text">
                      {page.name}
                    </p>

                    <p className="mt-1 text-xs text-secondary-text">
                      Facebook Page ID: {page.id}
                    </p>

                    {page.instagram && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-secondary-text">
                        <FiInstagram />
                        Linked Instagram: @{page.instagram.username}
                      </p>
                    )}
                  </div>
                </label>
              ))}

              {availablePages.length > 0 && (
                <button
                  type="button"
                  onClick={connectSelectedPage}
                  disabled={!selectedPageId || connectingPage}
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {connectingPage
                    ? "Connecting..."
                    : "Connect Selected Page"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {metaStatus &&
        metaStatus !== "select_account" &&
        metaStatus !== "connected" && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-divider bg-bg-card p-4 text-sm text-secondary-text"
          >
            Facebook authorization status: {metaStatus.replaceAll(
              "_",
              " "
            )}
          </div>
        )}

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
                      ? connection.accountName ||
                        connection.username ||
                        "Connected account"
                      : "Not connected for publishing"}
                  </p>
                </div>

                <span
                  className={
                    connected
                      ? "text-xs text-emerald-500"
                      : "text-xs text-secondary-text"
                  }
                >
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
                    type="button"
                    onClick={() => saveProfile(key)}
                    disabled={saving === key}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving === key
                      ? "Saving..."
                      : "Save Profile Link"}
                  </button>
                )}

                {key === "FACEBOOK" && (
                  <button
                    type="button"
                    onClick={startMetaConnection}
                    className="rounded-lg border border-divider px-4 py-2 text-sm font-semibold text-primary-text"
                  >
                    {connected
                      ? "Change Facebook Page"
                      : "Connect Facebook"}
                  </button>
                )}

                {/* ADD DISCONNECT BUTTON HERE */}
                {connected && (
                  <button
                    type="button"
                    onClick={() => disconnectSocialAccount(key)}
                    disabled={disconnectingPlatform !== null}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {disconnectingPlatform === key
                      ? "Disconnecting..."
                      : "Disconnect"}
                  </button>
                )}

                <span className="self-center text-xs text-secondary-text">
                  {connected
                    ? "Account connected. Publishing permissions are being verified."
                    : key === "INSTAGRAM"
                      ? "Connect your linked Instagram account through Facebook."
                      : "Connect Facebook to enable publishing."}
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
