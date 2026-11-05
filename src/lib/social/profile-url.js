// This prevents users from saving arbitrary or malformed links as Facebook and Instagram profiles.

// This is a first validation layer. Before production, 
// you should also reject unsupported Facebook URL patterns, 
// Instagram post/reel URLs, and other non-profile paths. 
// A URL's shape alone does not prove that the profile exists or belongs to the user.

const ALLOWED_HOSTS = {
  FACEBOOK: new Set([
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
  ]),
  INSTAGRAM: new Set([
    "instagram.com",
    "www.instagram.com",
  ]),
};

export function validateProfileUrl(platform, value) {
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("Invalid profile URL");
  }

  const trimmed = value.trim();

  if (!trimmed) return null;

  let url;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid HTTPS profile URL");
  }

  if (
    url.protocol !== "https:" ||
    !ALLOWED_HOSTS[platform]?.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error(`Enter a valid ${platform} profile URL`);
  }

  if (url.pathname === "/" || url.pathname === "") {
    throw new Error("Enter a specific profile or Page URL");
  }

  // Do not retain tracking parameters or fragments.
  url.search = "";
  url.hash = "";

  return url.toString();
}