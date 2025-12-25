const { publicRobloxRequest } = require('./http');

async function getUserProfile(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;

  const user = await publicRobloxRequest(`https://users.roblox.com/v1/users/${id}`);
  const presence = await publicRobloxRequest(`https://presence.roblox.com/v1/presence/users`, {
    method: 'POST',
    body: { userIds: [id] }
  }).catch(() => null);

  const p = presence?.userPresences?.[0] || null;

  return {
    id,
    name: user?.name || null,
    displayName: user?.displayName || null,
    created: user?.created || null,
    isBanned: user?.isBanned ?? null,
    description: user?.description || null,
    presence: p
      ? {
          userPresenceType: p.userPresenceType,
          lastLocation: p.lastLocation || null,
          placeId: p.placeId ?? null,
          rootPlaceId: p.rootPlaceId ?? null,
          gameId: p.gameId ?? null,
          lastOnline: p.lastOnline || null
        }
      : null
  };
}

module.exports = {
  getUserProfile
};
