const { robloxRequest, publicRobloxRequest } = require('./http');

function membershipIdFromMembership(m) {
  if (!m) return null;
  if (m.id) {
    const s = String(m.id);
    if (s.includes('/')) {
      const parts = s.split('/');
      return parts[parts.length - 1] || null;
    }
    return s;
  }
  if (m.membershipId) {
    const s = String(m.membershipId);
    if (s.includes('/')) {
      const parts = s.split('/');
      return parts[parts.length - 1] || null;
    }
    return s;
  }
  const path = m.path || m.name;
  if (typeof path === 'string') {
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
  }
  return null;
}

function roleIdFromRole(r) {
  if (!r) return null;
  if (typeof r === 'string') {
    const s = r.trim();
    if (!s) return null;
    if (s.includes('/')) {
      const parts = s.split('/');
      return parts[parts.length - 1] || null;
    }
    return s;
  }
  if (typeof r === 'number') return String(r);
  if (r.id) {
    const s = String(r.id);
    if (s.includes('/')) {
      const parts = s.split('/');
      return parts[parts.length - 1] || null;
    }
    return s;
  }
  const path = r.path || r.name;
  if (typeof path === 'string') {
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
  }
  return null;
}

function roleRankFromRole(r) {
  if (!r) return null;
  if (typeof r.rank === 'number') return r.rank;
  if (typeof r.rank === 'string') {
    const n = Number(r.rank);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof r.rankValue === 'number') return r.rankValue;
  return null;
}

function roleResourceFromRole(r, groupId) {
  if (!r) return null;
  if (typeof r === 'string') {
    const s = r.trim();
    if (!s) return null;
    if (s.includes('/')) return s;
    if (/^\d+$/.test(s)) return `groups/${groupId}/roles/${s}`;
    return s;
  }
  if (typeof r === 'number') return `groups/${groupId}/roles/${r}`;

  const candidates = [r.id, r.path, r.name];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const s = c.trim();
      if (s.includes('/')) return s;
      if (/^\d+$/.test(s)) return `groups/${groupId}/roles/${s}`;
      return s;
    }
  }

  const rid = roleIdFromRole(r);
  return rid ? `groups/${groupId}/roles/${rid}` : null;
}

async function listGroupRoles(apiKey, groupId) {
  const all = [];
  let pageToken = null;
  let safety = 0;

  do {
    const qs = pageToken
      ? `maxPageSize=100&pageToken=${encodeURIComponent(pageToken)}`
      : 'maxPageSize=100';
    const data = await robloxRequest(`/cloud/v2/groups/${groupId}/roles?${qs}`, { apiKey });
    const roles = data?.groupRoles || data?.roles || [];
    if (Array.isArray(roles)) all.push(...roles);
    pageToken = data?.nextPageToken || null;
    safety++;
  } while (pageToken && safety < 50);

  return all;
}

async function findRoleByRank(apiKey, groupId, rankNumber) {
  const roles = await listGroupRoles(apiKey, groupId);
  for (const r of roles) {
    const rr = roleRankFromRole(r);
    if (rr === rankNumber) return r;
  }
  return null;
}

async function getMembershipForUser(apiKey, groupId, userId) {
  const filter = encodeURIComponent(`user == 'users/${userId}'`);
  const data = await robloxRequest(`/cloud/v2/groups/${groupId}/memberships?maxPageSize=10&filter=${filter}`, { apiKey });
  const memberships = data?.groupMemberships || data?.memberships || [];
  return memberships[0] || null;
}

async function getUserRankInGroupPublic(groupId, userId) {
  const gid = Number(groupId);
  const uid = Number(userId);
  if (!Number.isFinite(gid) || !Number.isFinite(uid)) return null;

  const data = await publicRobloxRequest(`https://groups.roblox.com/v2/users/${uid}/groups/roles`);
  const items = Array.isArray(data?.data) ? data.data : [];
  const found = items.find((x) => Number(x?.group?.id) === gid);
  const rank = Number(found?.role?.rank);
  return Number.isFinite(rank) ? rank : null;
}

async function getUserRankInGroup(apiKey, groupId, userId) {
  const membership = await getMembershipForUser(apiKey, groupId, userId);
  if (!membership) return null;
  const role = membership.role || membership.groupRole;
  const rank = roleRankFromRole(role);
  if (Number.isFinite(rank)) return rank;

  const roleId = roleIdFromRole(role);
  if (!roleId) {
    const publicRank = await getUserRankInGroupPublic(groupId, userId).catch(() => null);
    return Number.isFinite(publicRank) ? publicRank : null;
  }

  const roles = await listGroupRoles(apiKey, groupId).catch(() => []);
  for (const r of roles) {
    const rid = roleIdFromRole(r);
    if (rid === roleId) {
      const rr = roleRankFromRole(r);
      return Number.isFinite(rr) ? rr : null;
    }
  }

  const publicRank = await getUserRankInGroupPublic(groupId, userId).catch(() => null);
  if (Number.isFinite(publicRank)) return publicRank;

  return null;
}

async function updateMembershipRoleByRank(apiKey, groupId, userId, newRankNumber) {
  const membership = await getMembershipForUser(apiKey, groupId, userId);
  if (!membership) {
    const err = new Error('User is not in group');
    err.code = 'NOT_IN_GROUP';
    throw err;
  }

  const membershipId = membershipIdFromMembership(membership);
  if (!membershipId) {
    const err = new Error('Could not determine membership id');
    err.code = 'NO_MEMBERSHIP_ID';
    throw err;
  }

  const role = await findRoleByRank(apiKey, groupId, newRankNumber);
  if (!role) {
    const err = new Error('Role not found for rank');
    err.code = 'ROLE_NOT_FOUND';
    throw err;
  }

  const roleResource = roleResourceFromRole(role, groupId);
  if (!roleResource) {
    const err = new Error('Could not determine role resource');
    err.code = 'NO_ROLE_RESOURCE';
    throw err;
  }

  const basePath = `/cloud/v2/groups/${groupId}/memberships/${membershipId}`;

  const roleId = roleIdFromRole(role);

  const attempts = [
    { path: `${basePath}?updateMask=role`, body: { role: roleResource } },
    { path: basePath, body: { role: roleResource } },
    { path: `${basePath}?updateMask=role.path`, body: { role: { path: roleResource } } },
    { path: `${basePath}?updateMask=role`, body: { role: { path: roleResource } } },
    { path: basePath, body: { role: { path: roleResource } } },
    { path: `${basePath}?updateMask=role`, body: { role: { id: roleResource } } },
    { path: basePath, body: { role: { id: roleResource } } },
    { path: `${basePath}?updateMask=groupRole`, body: { groupRole: roleResource } },
    { path: basePath, body: { groupRole: roleResource } },
    { path: `${basePath}?updateMask=groupRole.path`, body: { groupRole: { path: roleResource } } },
    { path: `${basePath}?updateMask=groupRole`, body: { groupRole: { path: roleResource } } },
    { path: basePath, body: { groupRole: { path: roleResource } } },
    { path: `${basePath}?updateMask=groupRole`, body: { groupRole: { id: roleResource } } },
    { path: basePath, body: { groupRole: { id: roleResource } } },
    ...(roleId ? [{ path: `${basePath}?updateMask=roleId`, body: { roleId } }, { path: basePath, body: { roleId } }] : [])
  ];

  let updated = null;
  let lastErr = null;
  for (const a of attempts) {
    try {
      updated = await robloxRequest(a.path, {
        apiKey,
        method: 'PATCH',
        body: a.body
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      const code = e?.body?.code;
      if (e?.status === 400 && code === 'INVALID_ARGUMENT') {
        continue;
      }
      throw e;
    }
  }

  if (!updated) throw lastErr;

  return {
    before: membership,
    after: updated
  };
}

async function removeUserFromGroupOpenCloud(apiKey, groupId, userId) {
  const membership = await getMembershipForUser(apiKey, groupId, userId);
  if (!membership) {
    const err = new Error('User is not in group');
    err.code = 'NOT_IN_GROUP';
    throw err;
  }

  const membershipId = membershipIdFromMembership(membership);
  if (!membershipId) {
    const err = new Error('Could not determine membership id');
    err.code = 'NO_MEMBERSHIP_ID';
    throw err;
  }

  await robloxRequest(`/cloud/v2/groups/${groupId}/memberships/${membershipId}`, {
    apiKey,
    method: 'DELETE'
  });

  return true;
}

module.exports = {
  listGroupRoles,
  findRoleByRank,
  getMembershipForUser,
  getUserRankInGroupPublic,
  getUserRankInGroup,
  updateMembershipRoleByRank,
  removeUserFromGroupOpenCloud,
  membershipIdFromMembership,
  roleIdFromRole,
  roleRankFromRole
};
