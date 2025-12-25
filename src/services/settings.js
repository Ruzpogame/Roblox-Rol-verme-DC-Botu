const path = require('node:path');
const { readJson, writeJson } = require('./storage');

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

function defaultSettings() {
  return {
    guildId: process.env.DISCORD_GUILD_ID || "",
    activeChannelId: process.env.ACTIVE_CHANNEL_ID || "",
    ownerIds: [process.env.OWNER_DISCORD_ID || ""].filter(Boolean),
    branchCodesMessageId: "",
    userLinks: {},
    main: {
      groupId: Number(process.env.MAIN_GROUP_ID || 0),
      apiKey: "",
      hcMinRank: 180,
      hqMinRank: 220,
      logChannelId: "",
      logs: {
        terfi: true,
        tenzil: true,
        rutbeDegis: true,
        eklemeSilme: true,
        plainText: false
      },
      ranks: []
    },
    branches: {}
  };
}

function loadSettings() {
  const existing = readJson(SETTINGS_PATH, null);
  if (!existing) {
    const created = defaultSettings();
    writeJson(SETTINGS_PATH, created);
    return created;
  }

  const merged = { ...defaultSettings(), ...existing };
  merged.main = { ...defaultSettings().main, ...(existing.main || {}) };
  merged.branches = existing.branches || {};
  merged.ownerIds = Array.isArray(existing.ownerIds) ? existing.ownerIds : defaultSettings().ownerIds;
  merged.userLinks = existing.userLinks || {};

  writeJson(SETTINGS_PATH, merged);
  return merged;
}

function saveSettings(settings) {
  writeJson(SETTINGS_PATH, settings);
}

module.exports = {
  SETTINGS_PATH,
  loadSettings,
  saveSettings
};
