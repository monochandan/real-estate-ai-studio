
const META_GRAPH_VERSION = "v24.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const META_OAUTH_URL = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

function getMetaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const configId = process.env.META_CONFIG_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId || !appSecret || !configId || !appUrl) {
    throw new Error("Missing Meta OAuth environment configuration");
  }

  return {
    appId,
    appSecret,
    configId,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/socials/oauth/meta/callback`,
  };
}

export async function metaGet(path, accessToken, params = {}) {
  const url = new URL(`${META_GRAPH_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message || "Meta Graph API request failed"
    );
  }

  return data;
}

export function buildMetaAuthorizationUrl(state) {
  const { appId, configId, redirectUri } = getMetaConfig();

  const url = new URL(META_OAUTH_URL);

  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("config_id", configId);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeMetaCode(code) {
  const { appId, appSecret, redirectUri } = getMetaConfig();

  const url = new URL(`${META_GRAPH_URL}/oauth/access_token`);

  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error?.message || "Failed to exchange Meta authorization code"
    );
  }

  return data;
}

export async function getLongLivedMetaToken(shortLivedToken) {
  const { appId, appSecret } = getMetaConfig();

  const url = new URL(`${META_GRAPH_URL}/oauth/access_token`);

  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(
      data.error?.message || "Failed to obtain long-lived Meta token"
    );
  }

  return data;
}


export async function getMetaPages(userAccessToken) {
  const pages = [];
  let after;

  do {
    const data = await metaGet(
      "/me/accounts",
      userAccessToken,
      {
        fields:
          "id,name,access_token,tasks,instagram_business_account{id,username}",
        limit: 100,
        ...(after ? { after } : {}),
      }
    );

    pages.push(...(data.data || []));
    after = data.paging?.cursors?.after;

    if (!data.paging?.next) {
      break;
    }
  } while (after && pages.length < 1000);

  return pages;
}


export async function getMetaInstagramAccount(
  pageId,
  pageAccessToken
) {
  const data = await metaGet(
    `/${encodeURIComponent(pageId)}`,
    pageAccessToken,
    {
      fields: "id,name,instagram_business_account{id,username}",
    }
  );

  return data.instagram_business_account || null;
}
