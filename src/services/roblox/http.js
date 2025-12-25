async function robloxRequest(path, { method = 'GET', apiKey, body, headers = {} } = {}) {
  const url = path.startsWith('http') ? path : `https://apis.roblox.com${path}`;

  const finalHeaders = {
    ...headers
  };

  if (apiKey) {
    const key = String(apiKey).trim();
    if (/^Bot\s+/i.test(key)) {
      const err = new Error("Invalid Roblox auth: looks like a Discord/RoWiFi bot token. Use a Roblox User API key (x-api-key) or an OAuth token (Authorization: Bearer ...)." );
      err.code = 'INVALID_ROBLOX_AUTH';
      throw err;
    }
    const parts = key.split('.');
    const looksLikeJwt =
      parts.length === 3 &&
      parts.every((p) => p.length >= 10 && /^[A-Za-z0-9_-]+$/.test(p));

    if (/^Bearer\s+/i.test(key) || /^OAuth\s+/i.test(key)) {
      finalHeaders['authorization'] = key;
    } else if (looksLikeJwt || key.startsWith('eyJ')) {
      finalHeaders['authorization'] = `Bearer ${key}`;
    } else {
      finalHeaders['x-api-key'] = key;
    }
  }

  if (body !== undefined) {
    finalHeaders['content-type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.message || json?.error?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }

  return json;
}

async function publicRobloxRequest(url, { method = 'GET', body, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders['content-type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }

  return json;
}

module.exports = {
  robloxRequest,
  publicRobloxRequest
};
