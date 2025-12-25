const { usernameToUserId } = require('./roblox/users');
const { getUserRankInGroup } = require('./roblox/groups');

const cache = new Map();

function now() {
  return Date.now();
}

function cacheGet(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (v.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return v.value;
}

function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: now() + ttlMs });
}

function normalizeCandidateName(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const first = raw.split('|')[0].trim();
  const noBrackets = first.replace(/\[[^\]]*\]/g, '').trim();
  const noParens = noBrackets.replace(/\([^)]*\)/g, '').trim();
  const token = noParens.split(/\s+/)[0].trim();
  if (!token) return null;
  return token;
}

async function getActorRobloxUserIdFromCandidates(discordId, candidates) {
  const cleaned = (candidates || [])
    .map(normalizeCandidateName)
    .filter(Boolean);

  if (cleaned.length === 0) return null;

  const key = `actorUserId:${discordId}:${cleaned.join(',')}`;
  const hit = cacheGet(key);
  if (hit !== null) return hit;

  for (const name of cleaned) {
    const id = await usernameToUserId(name).catch(() => null);
    if (id) {
      cacheSet(key, id, 5 * 60 * 1000);
      return id;
    }
  }

  cacheSet(key, null, 60 * 1000);
  return null;
}

async function getActorRobloxUserId(discordUser) {
  return getActorRobloxUserIdFromCandidates(discordUser.id, [discordUser.username]);
}

async function getActorRobloxUserIdFromInteraction(settings, interaction) {
  const link = settings?.userLinks?.[interaction.user.id];
  if (link?.robloxUserId) return Number(link.robloxUserId);
  if (link?.robloxName) {
    const id = await usernameToUserId(String(link.robloxName)).catch(() => null);
    if (id) return id;
  }

  const globalName = typeof interaction?.user?.globalName === 'string' ? interaction.user.globalName : null;
  const username = interaction?.user?.username;

  return getActorRobloxUserIdFromCandidates(interaction.user.id, [globalName, username]);
}

async function getAllowedBranchCodes(settings, actorDiscordUser) {
  const key = `allowedBranches:${actorDiscordUser.id}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const actorUserId = await getActorRobloxUserId(actorDiscordUser);
  if (!actorUserId) {
    cacheSet(key, [], 30 * 1000);
    return [];
  }

  const allowed = [];
  const branches = settings.branches || {};

  for (const [code, br] of Object.entries(branches)) {
    const groupId = Number(br?.groupId);
    const apiKey = br?.apiKey || process.env.ROBLOX_API_KEY || settings.main?.apiKey || '';
    const hcMin = Number(br?.hcMinRank ?? 0);

    if (!groupId || !apiKey) continue;

    const rank = await getUserRankInGroup(apiKey, groupId, actorUserId).catch(() => null);
    if (Number.isFinite(rank) && rank >= hcMin) {
      allowed.push(code);
    }
  }

  cacheSet(key, allowed, 60 * 1000);
  return allowed;
}

function clearCachesForDiscordUser(discordUserId) {
  const id = String(discordUserId || '').trim();
  if (!id) return;
  for (const k of cache.keys()) {
    if (k.includes(`:${id}`) || k.endsWith(`:${id}`) || k.startsWith(`allowedBranches:${id}`)) {
      cache.delete(k);
    }
  }
}

async function getAllowedBranchCodesFromInteraction(settings, interaction) {
  const key = `allowedBranches:${interaction.user.id}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const actorUserId = await getActorRobloxUserIdFromInteraction(settings, interaction);
  if (!actorUserId) {
    cacheSet(key, [], 30 * 1000);
    return [];
  }

  const allowed = [];
  const branches = settings.branches || {};

  for (const [code, br] of Object.entries(branches)) {
    const groupId = Number(br?.groupId);
    const apiKey = br?.apiKey || process.env.ROBLOX_API_KEY || settings.main?.apiKey || '';
    const hcMin = Number(br?.hcMinRank ?? 0);

    if (!groupId || !apiKey) continue;

    const rank = await getUserRankInGroup(apiKey, groupId, actorUserId).catch(() => null);
    if (Number.isFinite(rank) && rank >= hcMin) {
      allowed.push(code);
    }
  }

  cacheSet(key, allowed, 60 * 1000);
  return allowed;
}

module.exports = {
  getActorRobloxUserId,
  getActorRobloxUserIdFromInteraction,
  getAllowedBranchCodes,
  getAllowedBranchCodesFromInteraction,
  clearCachesForDiscordUser
};
