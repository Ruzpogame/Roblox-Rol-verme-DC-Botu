const crypto = require('node:crypto');

function normalizeCode(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function generateBranchCode(existingCodes) {
  const set = new Set(Object.keys(existingCodes || {}));
  for (let i = 0; i < 20; i++) {
    const code = crypto.randomBytes(3).toString('hex');
    if (!set.has(code)) return code;
  }

  return crypto.randomBytes(6).toString('hex');
}

function addBranch(settings, { name, groupId, hcMinRank, hqMinRank, apiKey }) {
  const code = generateBranchCode(settings.branches || {});
  settings.branches[code] = {
    name,
    groupId: Number(groupId),
    hcMinRank: Number(hcMinRank),
    hqMinRank: Number(hqMinRank),
    apiKey: apiKey || '',
    logChannelId: '',
    logs: {
      terfi: true,
      tenzil: true,
      rutbeDegis: true,
      eklemeSilme: true,
      plainText: false
    },
    ranks: []
  };
  return code;
}

function removeBranch(settings, codeInput) {
  const code = normalizeCode(codeInput);
  if (!settings.branches?.[code]) return false;
  delete settings.branches[code];
  return true;
}

module.exports = {
  normalizeCode,
  generateBranchCode,
  addBranch,
  removeBranch
};
