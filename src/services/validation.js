const ALLOWED_TIERS = new Set(['LR', 'MR', 'HR', 'HC', 'HQ', 'OWNER']);

function validateRankTier(tier) {
  if (!tier) return false;
  return ALLOWED_TIERS.has(String(tier).toUpperCase());
}

function validateSettings(settings) {
  const problems = [];

  const checkRanks = (groupLabel, ranks) => {
    if (!Array.isArray(ranks)) return;
    for (const r of ranks) {
      if (!validateRankTier(r?.rutbe)) {
        problems.push(`${groupLabel}: invalid rutbe '${r?.rutbe}' for rank '${r?.name ?? 'unknown'}'`);
      }
    }
  };

  checkRanks('main', settings.main?.ranks);
  for (const [code, br] of Object.entries(settings.branches || {})) {
    checkRanks(`branch:${code}`, br?.ranks);
  }

  return problems;
}

module.exports = {
  validateSettings,
  validateRankTier
};
