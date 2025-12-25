function baseUrl(version) {
  const v = String(version || '3').trim();
  return `https://api.rowifi.xyz/v${v}`;
}

function extractRobloxId(obj) {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.roblox_id) return Number(obj.roblox_id);
  if (obj.robloxId) return Number(obj.robloxId);
  if (obj.robloxID) return Number(obj.robloxID);

  if (obj.roblox && typeof obj.roblox === 'object') {
    if (obj.roblox.id) return Number(obj.roblox.id);
    if (obj.roblox.roblox_id) return Number(obj.roblox.roblox_id);
  }

  if (obj.user && typeof obj.user === 'object') {
    if (obj.user.roblox_id) return Number(obj.user.roblox_id);
    if (obj.user.id) return Number(obj.user.id);
  }

  return null;
}

function extractRobloxName(obj) {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.roblox_username) return String(obj.roblox_username);
  if (obj.robloxUsername) return String(obj.robloxUsername);

  if (obj.roblox && typeof obj.roblox === 'object') {
    if (obj.roblox.username) return String(obj.roblox.username);
    if (obj.roblox.name) return String(obj.roblox.name);
  }

  if (obj.user && typeof obj.user === 'object') {
    if (obj.user.username) return String(obj.user.username);
    if (obj.user.name) return String(obj.user.name);
  }

  return null;
}

async function rowifiRequest(path, { token, version = '3' } = {}) {
  if (!token) {
    const err = new Error('ROWIFI_TOKEN missing');
    err.code = 'NO_ROWIFI_TOKEN';
    throw err;
  }

  const url = `${baseUrl(version)}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${token}`
    }
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }

  return json;
}

async function getVerifiedMember({ guildId, discordUserId, token, version = '3' }) {
  const data = await rowifiRequest(`/guilds/${guildId}/members/${discordUserId}`, { token, version });
  const robloxUserId = extractRobloxId(data);
  const robloxName = extractRobloxName(data);

  if (!robloxUserId || !Number.isFinite(robloxUserId)) {
    return null;
  }

  return { robloxUserId: Number(robloxUserId), robloxName: robloxName || null, raw: data };
}

module.exports = {
  getVerifiedMember
};
