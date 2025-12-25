const { EmbedBuilder } = require('discord.js');

function formatDateTimeTR(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function buildLogEmbed({
  action,
  actorTag,
  actorId,
  approverTag,
  approverId,
  targetName,
  groupLabel,
  oldRank,
  newRank
}) {
  const e = new EmbedBuilder();
  e.setTitle(`LOG: ${action}`);
  e.addFields(
    { name: 'Kim yaptı', value: `${actorTag} (${actorId})`, inline: false },
    { name: 'Onaylayan', value: approverId ? `${approverTag} (${approverId})` : '-', inline: false },
    { name: 'Kime', value: targetName, inline: false },
    { name: 'Grup', value: groupLabel, inline: false },
    { name: 'Eski -> Yeni', value: `${oldRank ?? '-'} -> ${newRank ?? '-'}`, inline: false },
    { name: 'Tarih', value: formatDateTimeTR(new Date()), inline: false }
  );
  return e;
}

async function sendLog(client, settings, { groupConfig, actionKey, embed, text }) {
  const enabled = groupConfig?.logs?.[actionKey] !== false;
  if (!enabled) return;

  const channelId = groupConfig?.logChannelId;
  if (!channelId) return;

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || !ch.isTextBased()) return;

  const payload = { embeds: [embed] };
  const plainEnabled = groupConfig?.logs?.plainText === true;
  if (plainEnabled && text) payload.content = text;

  await ch.send(payload).catch(() => null);
}

module.exports = {
  buildLogEmbed,
  sendLog
};
