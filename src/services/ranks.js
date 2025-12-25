function normalizeRankNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeOrderNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sortRanks(ranks) {
  const list = [...(ranks || [])]
    .map((r) => ({ ...r, rank: normalizeRankNumber(r.rank), order: normalizeOrderNumber(r.order) }))
    .filter((r) => Number.isFinite(r.rank));

  const allHaveOrder = list.length > 0 && list.every((r) => Number.isFinite(r.order));
  if (allHaveOrder) {
    return list.sort((a, b) => (a.order - b.order) || (a.rank - b.rank));
  }

  return list.sort((a, b) => a.rank - b.rank);
}

function findConfiguredRank(ranks, rankNumber) {
  const list = sortRanks(ranks);
  return list.find((r) => r.rank === rankNumber) || null;
}

function nextRank(ranks, currentRank) {
  const list = sortRanks(ranks);
  const idx = list.findIndex((r) => r.rank === currentRank);
  if (idx === -1) return null;
  return list[idx + 1] || null;
}

function prevRank(ranks, currentRank) {
  const list = sortRanks(ranks);
  const idx = list.findIndex((r) => r.rank === currentRank);
  if (idx === -1) return null;
  return list[idx - 1] || null;
}

module.exports = {
  normalizeRankNumber,
  normalizeOrderNumber,
  sortRanks,
  findConfiguredRank,
  nextRank,
  prevRank
};
