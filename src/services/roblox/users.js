const { publicRobloxRequest } = require('./http');

async function usernameToUserId(username) {
  const data = await publicRobloxRequest('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    body: {
      usernames: [username],
      excludeBannedUsers: false
    }
  });

  const found = data?.data?.[0];
  if (!found?.id) return null;
  return Number(found.id);
}

async function searchUsersByKeyword(keyword, limit = 5) {
  const q = String(keyword || '').trim();
  if (!q) return [];

  const url = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(q)}&limit=${encodeURIComponent(
    String(limit)
  )}`;
  const data = await publicRobloxRequest(url);
  const items = Array.isArray(data?.data) ? data.data : [];
  return items
    .map((u) => ({ id: u?.id, name: u?.name || u?.displayName }))
    .filter((u) => u?.name)
    .slice(0, limit);
}

module.exports = {
  usernameToUserId,
  searchUsersByKeyword
};
