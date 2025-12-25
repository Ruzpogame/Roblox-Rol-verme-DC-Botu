function pickBransChoices(settings, query, allowedCodes = null) {
  const q = (query || '').toLowerCase();
  const entries = Object.entries(settings.branches || {});
  const allowed = Array.isArray(allowedCodes) ? new Set(allowedCodes) : null;

  return entries
    .filter(([code, br]) => {
      if (allowed && !allowed.has(code)) return false;
      const name = String(br?.name || code);
      return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    })
    .slice(0, 25)
    .map(([code, br]) => ({ name: String(br?.name || code), value: code }));
}

function pickRankChoices(rankList, query) {
  const q = (query || '').toLowerCase();
  return (rankList || [])
    .filter((r) => {
      const n = String(r?.name || '');
      const rank = String(r?.rank ?? '');
      return n.toLowerCase().includes(q) || rank.includes(q);
    })
    .slice(0, 25)
    .map((r) => ({ name: `${r.name} (${r.rank})`, value: String(r.rank) }));
}

module.exports = {
  pickBransChoices,
  pickRankChoices
};
