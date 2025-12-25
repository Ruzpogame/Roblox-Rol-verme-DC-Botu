function isOwner(settings, userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  if (Array.isArray(settings?.ownerIds) && settings.ownerIds.includes(id)) return true;

  const env = String(process.env.OWNER_DISCORD_ID || '').trim();
  if (!env) return false;
  const envIds = env.split(',').map((s) => s.trim()).filter(Boolean);
  return envIds.includes(id);
}

function getHcHqStatus(groupConfig, actorRank) {
  const hcMin = Number(groupConfig?.hcMinRank ?? 0);
  const hqMin = Number(groupConfig?.hqMinRank ?? 0);

  return {
    isHC: Number.isFinite(actorRank) && actorRank >= hcMin,
    isHQ: Number.isFinite(actorRank) && actorRank >= hqMin
  };
}

function canActOnTarget({
  settings,
  actorUserId,
  actorRank,
  targetRank,
  groupConfig,
  action
}) {
  if (isOwner(settings, actorUserId)) {
    return { ok: true };
  }

  const { isHC, isHQ } = getHcHqStatus(groupConfig, actorRank);
  if (!isHC && !isHQ) {
    return { ok: false, reason: 'Yetkin yok (HC/HQ gerekli).' };
  }

  if (action === 'tenzil') {
    return { ok: true };
  }

  if (!Number.isFinite(actorRank) || !Number.isFinite(targetRank)) {
    return { ok: false, reason: 'Rütbe bilgisi alınamadı.' };
  }

  if (targetRank >= actorRank) {
    return { ok: false, reason: 'Eşit veya daha yüksek rütbeye işlem yapamazsın.' };
  }

  return { ok: true };
}

module.exports = {
  isOwner,
  getHcHqStatus,
  canActOnTarget
};
