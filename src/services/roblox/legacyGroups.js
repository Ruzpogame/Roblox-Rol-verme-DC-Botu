const { publicRobloxRequest } = require('./http');

async function getCsrfToken(cookie) {
  const res = await fetch('https://auth.roblox.com/v2/logout', {
    method: 'POST',
    headers: {
      cookie
    }
  });

  const token = res.headers.get('x-csrf-token');
  if (!token) {
    const err = new Error('Could not obtain x-csrf-token');
    err.status = res.status;
    throw err;
  }

  return token;
}

async function removeUserFromGroup({ groupId, userId, cookie }) {
  if (!cookie) {
    const err = new Error('ROBLOX cookie not configured');
    err.code = 'NO_COOKIE';
    throw err;
  }

  let csrf = await getCsrfToken(cookie);

  const url = `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`;

  const doReq = async () =>
    publicRobloxRequest(url, {
      method: 'DELETE',
      headers: {
        cookie,
        'x-csrf-token': csrf
      }
    });

  try {
    await doReq();
    return true;
  } catch (e) {
    if (e.status === 403) {
      csrf = await getCsrfToken(cookie);
      await doReq();
      return true;
    }
    throw e;
  }
}

module.exports = {
  removeUserFromGroup
};
