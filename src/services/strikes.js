const path = require('node:path');
const { readJson, writeJson } = require('./storage');

const STRIKES_PATH = path.join(process.cwd(), 'data', 'strikes.json');

function loadStrikes() {
  return readJson(STRIKES_PATH, { users: {} });
}

function saveStrikes(db) {
  writeJson(STRIKES_PATH, db);
}

function addStrike(userId, nowMs = Date.now()) {
  const db = loadStrikes();
  if (!db.users[userId]) db.users[userId] = [];
  db.users[userId].push(nowMs);

  const oneHourAgo = nowMs - 60 * 60 * 1000;
  db.users[userId] = db.users[userId].filter((t) => t >= oneHourAgo);

  saveStrikes(db);
  return db.users[userId].length;
}

module.exports = {
  STRIKES_PATH,
  addStrike
};
