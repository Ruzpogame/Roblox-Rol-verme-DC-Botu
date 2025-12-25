const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes } = require('discord.js');
const { loadSettings } = require('./services/settings');
const { validateSettings } = require('./services/validation');
const { addStrike } = require('./services/strikes');
const { pickBransChoices, pickRankChoices } = require('./discord/autocomplete');
const { confirmOrCancel } = require('./discord/confirm');
const { buildCommands } = require('./discord/commands');
const { usernameToUserId, searchUsersByKeyword } = require('./services/roblox/users');
const {
  getMembershipForUser,
  getUserRankInGroup,
  updateMembershipRoleByRank,
  removeUserFromGroupOpenCloud
} = require('./services/roblox/groups');
const { removeUserFromGroup } = require('./services/roblox/legacyGroups');
const { getVerifiedMember } = require('./services/rowifi');
const { getUserProfile } = require('./services/roblox/profile');
const { canActOnTarget, isOwner } = require('./services/permissions');
const { buildLogEmbed, sendLog } = require('./services/logging');
const { nextRank, prevRank, normalizeRankNumber, findConfiguredRank } = require('./services/ranks');
const { addBranch, removeBranch } = require('./services/branches');
const { saveSettings } = require('./services/settings');
const {
  getAllowedBranchCodes,
  getAllowedBranchCodesFromInteraction,
  getActorRobloxUserIdFromInteraction,
  clearCachesForDiscordUser
} = require('./services/branchAuth');

function parseKisiToRobloxName(input) {
  return String(input || '').trim();
}

function buildSuggestions(message, settings) {
  const tips = [];

  if (typeof message === 'string' && message.toLowerCase().includes('kanal')) {
    if (settings?.activeChannelId) {
      tips.push(`Doğru kanal: <#${settings.activeChannelId}>`);
    }
  }

  if (typeof message === 'string' && message.toLowerCase().includes('roblox kullanıcı')) {
    tips.push('Roblox adını doğru yazdığından emin ol (büyük/küçük harf fark etmez).');
  }

  if (typeof message === 'string' && message.toLowerCase().includes('yetkin yok')) {
    tips.push('Bu işlem için ilgili grupta HC/HQ olman gerekiyor (veya owner).');
  }

  if (typeof message === 'string' && message.includes('ROBLOX_API_KEY')) {
    tips.push('`.env` içine ROBLOX_API_KEY ekle ve botu yeniden başlat.');
  }

  if (tips.length === 0) return message;

  return `${message}\n\nÖneri:\n- ${tips.join('\n- ')}`;
}

async function maybeTimeoutMember(interaction, reason) {
  const me = interaction.guild.members.me;
  if (!me) return;
  if (!me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) return;

  await member.timeout(10 * 60 * 1000, reason).catch(() => null);
}

async function handleInvalidAttempt(interaction, settings, message) {
  if (!interaction.inGuild()) return;

  const count = addStrike(interaction.user.id);

  if (count >= 3 && !isOwner(settings, interaction.user.id)) {
    await maybeTimeoutMember(interaction, '3 hatalı deneme: kanal/yetki');
  }

  const finalMessage = buildSuggestions(message, settings);

  if (interaction.isRepliable()) {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: finalMessage, ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: finalMessage, ephemeral: true }).catch(() => null);
    }
  }
}

async function sendPublicResult(interaction, content) {
  const text = String(content || '');
  const ch = interaction.channel;
  try {
    if (ch && ch.isTextBased()) {
      await ch.send({ content: text });
    } else {
      await interaction.followUp({ content: text, ephemeral: false });
    }
  } catch (e) {
    if (interaction.isRepliable()) {
      await interaction.followUp({
        content: `Mesaj gönderilemedi (Discord izinleri?). Detay: ${String(e?.message || e)}`,
        ephemeral: true
      }).catch(() => null);
    }
  }

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.deleteReply();
    }
  } catch {}
}

function formatRobloxError(e) {
  if (!e) return 'Bilinmeyen hata';
  const status = e.status ? `HTTP ${e.status}` : null;
  const msg = e.message ? String(e.message) : String(e);
  return status ? `${status} - ${msg}` : msg;
}

async function tryRoblox(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function formatRankWithTier(groupConfig, rankNumber) {
  if (!Number.isFinite(rankNumber)) return String(rankNumber);

  const cfg = findConfiguredRank(groupConfig?.ranks || [], rankNumber);
  if (cfg) {
    const tier = cfg.rutbe ? String(cfg.rutbe) : null;
    const name = cfg.name ? String(cfg.name) : null;
    const parts = [];
    if (tier) parts.push(tier);
    if (name) parts.push(name);
    return parts.length ? `${rankNumber} (${parts.join(' - ')})` : String(rankNumber);
  }

  const hcMin = Number(groupConfig?.hcMinRank ?? 0);
  const hqMin = Number(groupConfig?.hqMinRank ?? 0);
  if (Number.isFinite(hqMin) && rankNumber >= hqMin) return `${rankNumber} (HQ)`;
  if (Number.isFinite(hcMin) && rankNumber >= hcMin) return `${rankNumber} (HC)`;
  return String(rankNumber);
}

async function invalidRobloxUserWithSuggestions(interaction, settings, typedName, { apiKey = null, groupId = null } = {}) {
  const suggestions = await searchUsersByKeyword(typedName, 5).catch(() => []);
  if (suggestions.length === 0) {
    await handleInvalidAttempt(interaction, settings, 'Roblox kullanıcı bulunamadı.');
    return;
  }

  let lines = [];
  if (apiKey && groupId) {
    for (const s of suggestions) {
      const rankRes = s?.id ? await tryRoblox(() => getUserRankInGroup(apiKey, groupId, Number(s.id))) : { ok: true, value: null };
      const rank = rankRes.ok ? rankRes.value : null;
      const inGroup = Number.isFinite(rank) ? ` (grupta, rank: ${rank})` : '';
      lines.push(`- ${s.name}${inGroup}`);
    }
  } else {
    lines = suggestions.map((s) => `- ${s.name}`);
  }

  await handleInvalidAttempt(interaction, settings, `Roblox kullanıcı bulunamadı. Yakın eşleşmeler:\n${lines.join('\n')}`);
}

function buildBranchCodesText(s) {
  const branches = s.branches || {};
  const lines = ['Branş Kodları'];
  const entries = Object.entries(branches);
  if (entries.length === 0) {
    lines.push('(Henüz branş yok)');
    return lines.join('\n');
  }

  for (const [code, br] of entries) {
    const name = String(br?.name || code);
    const groupId = br?.groupId ? ` (groupId: ${br.groupId})` : '';
    lines.push(`- ${name}: ${code}${groupId}`);
  }

  return lines.join('\n');
}

async function upsertBranchCodesMessage() {
  const s = loadSettings();
  const channelId = s.activeChannelId;
  if (!channelId) return;

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || !ch.isTextBased()) return;

  const content = buildBranchCodesText(s);

  if (s.branchCodesMessageId) {
    const msg = await ch.messages.fetch(s.branchCodesMessageId).catch(() => null);
    if (msg) {
      await msg.edit({ content }).catch(() => null);
      return;
    }
  }

  const created = await ch.send({ content }).catch(() => null);
  if (!created) return;

  s.branchCodesMessageId = created.id;
  saveSettings(s);
}

const settings = loadSettings();
const problems = validateSettings(settings);
for (const p of problems) console.warn(p);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

async function autoRegisterCommands() {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID || settings.guildId;

  if (!token) {
    console.warn('[commands] DISCORD_TOKEN missing; auto-register skipped');
    return;
  }

  if (!guildId) {
    console.warn('[commands] DISCORD_GUILD_ID missing; auto-register skipped');
    return;
  }

  let clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    try {
      await client.application.fetch();
      clientId = client.application.id;
    } catch {
      clientId = null;
    }
  }

  if (!clientId) {
    console.warn('[commands] DISCORD_CLIENT_ID missing; auto-register skipped');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const body = buildCommands();

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`[commands] Registered ${body.length} commands to guild ${guildId}`);
  } catch (e) {
    console.error('[commands] Auto-register failed', e);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  autoRegisterCommands();
  upsertBranchCodesMessage();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const s = loadSettings();
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'brans') {
      const choices = isOwner(s, interaction.user.id)
        ? pickBransChoices(s, focused.value)
        : pickBransChoices(s, focused.value, await getAllowedBranchCodesFromInteraction(s, interaction).catch(() => []));
      await interaction.respond(choices).catch(() => null);
      return;
    }

    if (focused.name === 'rutbe') {
      const cmd = interaction.commandName;
      const brans = interaction.options.getString('brans');

      if (cmd === 'rutbe-degis') {
        const ranks = s.main?.ranks || [];
        await interaction.respond(pickRankChoices(ranks, focused.value)).catch(() => null);
        return;
      }

      if (cmd === 'brans-rutbe-degis' && brans && s.branches?.[brans]) {
        const ranks = s.branches[brans]?.ranks || [];
        await interaction.respond(pickRankChoices(ranks, focused.value)).catch(() => null);
        return;
      }

      await interaction.respond([]).catch(() => null);
      return;
    }

    await interaction.respond([]).catch(() => null);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (!interaction.inGuild()) return;
  if (settings.guildId && interaction.guildId !== settings.guildId) return;

  if (settings.activeChannelId && interaction.channelId !== settings.activeChannelId) {
    await handleInvalidAttempt(
      interaction,
      settings,
      `Bu komut sadece <#${settings.activeChannelId}> kanalında kullanılabilir.`
    );
    return;
  }

  const ownerBypass = isOwner(settings, interaction.user.id);

  const cmd = interaction.commandName;
  const kisiRaw = interaction.options.getString('kisi');
  const brans = interaction.options.getString('brans');
  const rutbeStr = interaction.options.getString('rutbe');

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: true }).catch(() => null);
    }

    {
      const s = loadSettings();
      const link = s.userLinks?.[interaction.user.id];
      const linked = Boolean(link?.robloxUserId || link?.userId);
      const allowedWithoutLink = new Set(['giris', 'player-bilgi']);
      if (!ownerBypass && !linked && !allowedWithoutLink.has(cmd)) {
        await handleInvalidAttempt(interaction, settings, 'Önce /giris yapmalısın.');
        return;
      }
    }

    const adminOnly = new Set(['brans-ekle', 'brans-sil', 'log-kanal-ayarla', 'brans-log-kanal-ayarla']);
    if (adminOnly.has(cmd)) {
      if (!ownerBypass) {
        await handleInvalidAttempt(interaction, settings, 'Sadece owner kullanabilir.');
        return;
      }

      const s = loadSettings();

      if (cmd === 'brans-ekle') {
        const isim = interaction.options.getString('isim');
        const gid = interaction.options.getInteger('groupid');
        const hcMin = interaction.options.getInteger('hcminrank');
        const hqMin = interaction.options.getInteger('hqminrank');
        const apikey = interaction.options.getString('apikey');

        const code = addBranch(s, { name: isim, groupId: gid, hcMinRank: hcMin, hqMinRank: hqMin, apiKey: apikey });
        saveSettings(s);

        const embed = buildLogEmbed({
          action: 'Branş Ekle',
          actorTag: interaction.user.tag,
          actorId: interaction.user.id,
          approverTag: interaction.user.tag,
          approverId: interaction.user.id,
          targetName: isim,
          groupLabel: 'Branş Yönetimi',
          oldRank: '-',
          newRank: code
        });
        await sendLog(client, s, { groupConfig: s.main, actionKey: 'eklemeSilme', embed, text: null });

        await sendPublicResult(interaction, `Branş eklendi: ${isim} (kod: ${code})`);
        return;
      }

      if (cmd === 'brans-sil') {
        const ok = removeBranch(s, brans);
        if (!ok) {
          await handleInvalidAttempt(interaction, settings, 'Branş bulunamadı.');
          return;
        }
        saveSettings(s);

        const embed = buildLogEmbed({
          action: 'Branş Sil',
          actorTag: interaction.user.tag,
          actorId: interaction.user.id,
          approverTag: interaction.user.tag,
          approverId: interaction.user.id,
          targetName: brans,
          groupLabel: 'Branş Yönetimi',
          oldRank: brans,
          newRank: 'DELETED'
        });
        await sendLog(client, s, { groupConfig: s.main, actionKey: 'eklemeSilme', embed, text: null });

        await sendPublicResult(interaction, 'Branş silindi.');
        return;
      }

      if (cmd === 'log-kanal-ayarla') {
        const kanal = interaction.options.getChannel('kanal');
        s.main.logChannelId = kanal.id;
        saveSettings(s);
        await sendPublicResult(interaction, `Ana grup log kanalı ayarlandı: <#${kanal.id}>`);
        return;
      }

      if (cmd === 'brans-log-kanal-ayarla') {
        const kanal = interaction.options.getChannel('kanal');
        const brObj = s.branches?.[brans];
        if (!brObj) {
          await handleInvalidAttempt(interaction, settings, 'Branş bulunamadı.');
          return;
        }
        brObj.logChannelId = kanal.id;
        saveSettings(s);
        await sendPublicResult(interaction, `Branş log kanalı ayarlandı: <#${kanal.id}>`);
        return;
      }
    }

    if (cmd === 'giris') {
      const s = loadSettings();
      const token = process.env.ROWIFI_TOKEN || '';
      const version = process.env.ROWIFI_API_VERSION || '3';
      const guildId = process.env.DISCORD_GUILD_ID || s.guildId || interaction.guildId;

      if (!token) {
        await handleInvalidAttempt(interaction, settings, 'ROWIFI_TOKEN ayarlı değil.');
        return;
      }

      const verified = await getVerifiedMember({ guildId, discordUserId: interaction.user.id, token, version }).catch(
        () => null
      );
      if (!verified?.robloxUserId) {
        await handleInvalidAttempt(
          interaction,
          settings,
          'RoWiFi doğrulaması bulunamadı. Önce RoWiFi botu ile /verify yapmalısın.'
        );
        return;
      }

      if (!s.userLinks) s.userLinks = {};
      s.userLinks[interaction.user.id] = {
        robloxUserId: verified.robloxUserId,
        robloxName: verified.robloxName || ''
      };
      saveSettings(s);
      clearCachesForDiscordUser(interaction.user.id);

      await sendPublicResult(
        interaction,
        `Giriş başarılı: ${interaction.user.tag} -> RobloxID ${verified.robloxUserId}${verified.robloxName ? ` (${verified.robloxName})` : ''}`
      );
      return;
    }

    if (cmd === 'player-bilgi') {
      const s = loadSettings();
      const link = s.userLinks?.[interaction.user.id];
      if (!link?.robloxUserId) {
        await handleInvalidAttempt(interaction, settings, 'Önce /giris yapmalısın.');
        return;
      }

      const profile = await getUserProfile(link.robloxUserId).catch(() => null);
      if (!profile) {
        await handleInvalidAttempt(interaction, settings, 'Roblox profil bilgisi alınamadı.');
        return;
      }

      const created = profile.created ? new Date(profile.created).toLocaleString('tr-TR') : '-';
      const pres = profile.presence
        ? `\nDurum: ${profile.presence.userPresenceType}${profile.presence.lastLocation ? `\nKonum: ${profile.presence.lastLocation}` : ''}`
        : '';

      const text = `Player Bilgi\n- Roblox: ${profile.name}${profile.displayName ? ` (${profile.displayName})` : ''}\n- ID: ${profile.id}\n- Created: ${created}\n- Banned: ${profile.isBanned}${pres}`;
      await sendPublicResult(interaction, text);
      return;
    }

    const robloxName = kisiRaw ? parseKisiToRobloxName(kisiRaw) : null;

    const needsConfirm = new Set(['terfi', 'tenzil', 'rutbe-degis', 'brans-terfi', 'brans-tenzil', 'brans-rutbe-degis', 'bransdan-at']);
    if (needsConfirm.has(cmd) && !ownerBypass) {
      const ok = await confirmOrCancel(interaction, {
        title: 'Onay',
        description: `İşlem: ${cmd}\nKişi: ${robloxName || '-'}\nBranş: ${brans || 'Ana'}\nRütbe: ${rutbeStr || '-'}`
      });

      if (!ok) {
        await interaction.editReply({ content: 'İptal edildi.' }).catch(() => null);
        return;
      }
    }

    if (!robloxName) {
      await handleInvalidAttempt(interaction, settings, 'Kişi bulunamadı.');
      return;
    }

    const s = loadSettings();

    const getGroupContext = () => {
      if (cmd.startsWith('brans-') || cmd === 'bransdan-at') {
        const brObj = s.branches?.[brans];
        if (!brObj) return null;
        return { kind: 'branch', code: brans, group: brObj, groupLabel: `Branş: ${brObj.name || brans}` };
      }
      return { kind: 'main', code: 'main', group: s.main, groupLabel: 'Ana Grup' };
    };

    const ctx = getGroupContext();
    if (!ctx) {
      await handleInvalidAttempt(interaction, settings, 'Geçersiz branş.');
      return;
    }

    const oauthToken = String(process.env.ROBLOX_OAUTH_TOKEN || '').trim();
    const oauthHeader = oauthToken ? (oauthToken.toLowerCase().startsWith('bearer ') ? oauthToken : `Bearer ${oauthToken}`) : '';

    const apiKeyFromSettings = String(ctx.group?.apiKey || '').trim();
    const apiKeyFromEnv = String(process.env.ROBLOX_API_KEY || '').trim();
    const apiKey = apiKeyFromSettings || oauthHeader || apiKeyFromEnv || '';
    const authSource = apiKeyFromSettings ? 'settings.apiKey' : oauthHeader ? 'ROBLOX_OAUTH_TOKEN' : apiKeyFromEnv ? 'ROBLOX_API_KEY' : 'NONE';
    const groupId = Number(ctx.group?.groupId || 0);
    if (!groupId) {
      await handleInvalidAttempt(interaction, settings, 'GroupId ayarlı değil.');
      return;
    }
    if (!apiKey && ctx.kind !== 'main') {
      await handleInvalidAttempt(interaction, settings, 'Bu branş için API key ayarlı değil.');
      return;
    }
    if (!apiKey && ctx.kind === 'main') {
      await handleInvalidAttempt(interaction, settings, 'Ana grup için ROBLOX_API_KEY veya settings.main.apiKey ayarlı değil.');
      return;
    }

    const targetUserId = await usernameToUserId(robloxName).catch(() => null);
    if (!targetUserId) {
      await invalidRobloxUserWithSuggestions(interaction, settings, robloxName, { apiKey, groupId });
      return;
    }

    const actorUserId = await getActorRobloxUserIdFromInteraction(s, interaction).catch(() => null);
    if (!actorUserId && !ownerBypass) {
      await handleInvalidAttempt(
        interaction,
        settings,
        'Senin Roblox hesabın bulunamadı. Çözüm: /giris komutu ile RoWiFi üzerinden giriş yap.'
      );
      return;
    }

    const actorRankRes = ownerBypass
      ? { ok: true, value: 999 }
      : await tryRoblox(() => getUserRankInGroup(apiKey, groupId, actorUserId));
    if (!actorRankRes.ok && !ownerBypass) {
      await handleInvalidAttempt(
        interaction,
        settings,
        `Roblox API hatası (actor rank) [auth=${authSource}]: ${formatRobloxError(actorRankRes.error)}`
      );
      return;
    }
    const actorRank = actorRankRes.value;

    const targetRankRes = await tryRoblox(() => getUserRankInGroup(apiKey, groupId, targetUserId));
    const targetRank = targetRankRes.ok ? targetRankRes.value : null;

    const ensureBransAuth = async () => {
      if (ownerBypass) return true;
      if (ctx.kind !== 'branch') return true;
      const allowed = await getAllowedBranchCodesFromInteraction(s, interaction).catch(() => []);
      return allowed.includes(ctx.code);
    };

    const hasBranchAuth = await ensureBransAuth();
    if (!hasBranchAuth) {
      await handleInvalidAttempt(interaction, settings, 'Bu branş için yetkin yok.');
      return;
    }

    const actorTag = interaction.user.tag;
    const actorId = interaction.user.id;
    const approverTag = interaction.user.tag;
    const approverId = interaction.user.id;

    const logBase = {
      actorTag,
      actorId,
      approverTag,
      approverId,
      targetName: robloxName,
      groupLabel: ctx.groupLabel
    };

    const doLog = async (actionLabel, actionKey, oldR, newR) => {
      const embed = buildLogEmbed({
        ...logBase,
        action: actionLabel,
        oldRank: oldR,
        newRank: newR
      });
      await sendLog(client, s, { groupConfig: ctx.group, actionKey, embed, text: null });
    };

    const doRankChange = async (actionLabel, actionKey, newRankNumber) => {
      const perm = canActOnTarget({
        settings: s,
        actorUserId: interaction.user.id,
        actorRank,
        targetRank,
        groupConfig: ctx.group,
        action: actionKey === 'tenzil' ? 'tenzil' : 'other'
      });

      if (!perm.ok) {
        await handleInvalidAttempt(interaction, settings, perm.reason);
        return;
      }

      if (!Number.isFinite(newRankNumber)) {
        await handleInvalidAttempt(interaction, settings, 'Geçersiz rütbe.');
        return;
      }

      const beforeRank = targetRank;
      const changeRes = await tryRoblox(() => updateMembershipRoleByRank(apiKey, groupId, targetUserId, newRankNumber));
      if (!changeRes.ok) {
        const st = changeRes.error?.status;
        const extra =
          st === 403
            ? ' 403 (Insufficient permissions). auth=settings.apiKey görüyorsan bot .env OAuth yerine settings.json apiKey kullanıyor olabilir; main.apiKey/branş apiKey alanlarını boş bırakıp ROBLOX_OAUTH_TOKEN ile dene. Ayrıca Open Cloud tarafında doğru groupId resource seçili olmalı ve group membership/rank yönetimi (write) yetkisi verilmeli.'
            : '';
        await handleInvalidAttempt(
          interaction,
          settings,
          `Roblox API hatası (rütbe değiştir) [auth=${authSource}]: ${formatRobloxError(changeRes.error)}${extra}`
        );
        return;
      }
      await doLog(actionLabel, actionKey, beforeRank, newRankNumber);
      const fromText = Number.isFinite(beforeRank) ? formatRankWithTier(ctx.group, beforeRank) : String(beforeRank);
      const toText = Number.isFinite(newRankNumber) ? formatRankWithTier(ctx.group, newRankNumber) : String(newRankNumber);
      await sendPublicResult(interaction, `Başarılı: ${robloxName} (${fromText} > ${toText})`);
    };

    switch (cmd) {
      case 'rutbe-sorgu': {
        if (!targetRankRes.ok) {
          await sendPublicResult(
            interaction,
            `Ana Grup: rütbe alınamadı [auth=${authSource}]. ${formatRobloxError(targetRankRes.error)}`
          );
          return;
        }
        if (!Number.isFinite(targetRank)) {
          const mRes = await tryRoblox(() => getMembershipForUser(apiKey, groupId, targetUserId));
          if (!mRes.ok) {
            await sendPublicResult(interaction, `Ana Grup: üyelik kontrolü başarısız. ${formatRobloxError(mRes.error)}`);
            return;
          }
          if (!mRes.value) {
            await sendPublicResult(interaction, `Ana Grup: ${robloxName} bu grupta değil.`);
            return;
          }
          await sendPublicResult(interaction, `Ana Grup: ${robloxName} için rütbe alınamadı (membership var ama rank çözülemedi).`);
          return;
        }

        await sendPublicResult(interaction, `Ana Grup rütbe: ${robloxName} = ${formatRankWithTier(ctx.group, targetRank)}`);
        return;
      }
      case 'brans-rutbe-sorgu': {
        if (!targetRankRes.ok) {
          await sendPublicResult(
            interaction,
            `${ctx.groupLabel}: rütbe alınamadı [auth=${authSource}]. ${formatRobloxError(targetRankRes.error)}`
          );
          return;
        }
        if (!Number.isFinite(targetRank)) {
          const mRes = await tryRoblox(() => getMembershipForUser(apiKey, groupId, targetUserId));
          if (!mRes.ok) {
            await sendPublicResult(interaction, `${ctx.groupLabel}: üyelik kontrolü başarısız. ${formatRobloxError(mRes.error)}`);
            return;
          }
          if (!mRes.value) {
            await sendPublicResult(interaction, `${ctx.groupLabel}: ${robloxName} bu grupta değil.`);
            return;
          }
          await sendPublicResult(interaction, `${ctx.groupLabel}: ${robloxName} için rütbe alınamadı (membership var ama rank çözülemedi).`);
          return;
        }

        await sendPublicResult(interaction, `${ctx.groupLabel} rütbe: ${robloxName} = ${formatRankWithTier(ctx.group, targetRank)}`);
        return;
      }
      case 'rutbe-degis': {
        const nr = normalizeRankNumber(rutbeStr);
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Rütbe zorunlu.');
          return;
        }
        await doRankChange('Rütbe Değiş', 'rutbeDegis', nr);
        return;
      }
      case 'brans-rutbe-degis': {
        const nr = normalizeRankNumber(rutbeStr);
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Rütbe zorunlu.');
          return;
        }
        await doRankChange('Branş Rütbe Değiş', 'rutbeDegis', nr);
        return;
      }
      case 'terfi': {
        const cfgRanks = s.main?.ranks || [];
        const nr = nextRank(cfgRanks, targetRank)?.rank;
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Sonraki rütbe bulunamadı (settings.main.ranks kontrol et).');
          return;
        }
        await doRankChange('Terfi', 'terfi', nr);
        return;
      }
      case 'tenzil': {
        const cfgRanks = s.main?.ranks || [];
        const nr = prevRank(cfgRanks, targetRank)?.rank;
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Önceki rütbe bulunamadı (settings.main.ranks kontrol et).');
          return;
        }
        await doRankChange('Tenzil', 'tenzil', nr);
        return;
      }
      case 'brans-terfi': {
        const cfgRanks = ctx.group?.ranks || [];
        const nr = nextRank(cfgRanks, targetRank)?.rank;
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Sonraki rütbe bulunamadı (branş ranks kontrol et).');
          return;
        }
        await doRankChange('Branş Terfi', 'terfi', nr);
        return;
      }
      case 'brans-tenzil': {
        const cfgRanks = ctx.group?.ranks || [];
        const nr = prevRank(cfgRanks, targetRank)?.rank;
        if (!nr) {
          await handleInvalidAttempt(interaction, settings, 'Önceki rütbe bulunamadı (branş ranks kontrol et).');
          return;
        }
        await doRankChange('Branş Tenzil', 'tenzil', nr);
        return;
      }
      case 'bransdan-at': {
        const perm = canActOnTarget({
          settings: s,
          actorUserId: interaction.user.id,
          actorRank,
          targetRank,
          groupConfig: ctx.group,
          action: 'other'
        });

        if (!perm.ok) {
          await handleInvalidAttempt(interaction, settings, perm.reason);
          return;
        }

        const removeRes = await tryRoblox(() => removeUserFromGroupOpenCloud(apiKey, groupId, targetUserId));
        if (!removeRes.ok) {
          const status = removeRes.error?.status;
          if (status === 403 || status === 401 || status === 404) {
            const cookie = process.env.ROBLOX_COOKIE || '';
            if (!cookie) {
              await handleInvalidAttempt(
                interaction,
                settings,
                `Roblox API hatası (branştan at) [auth=${authSource}]: ${formatRobloxError(removeRes.error)}. Bu işlem Open Cloud üzerinden "grup üye yönetimi / üyelik yönetimi (üye çıkarma)" yetkisi ister. auth=settings.apiKey görüyorsan bot OAuth yerine settings.json apiKey kullanıyor olabilir; settings.json içindeki main.apiKey/branş apiKey alanlarını boş bırakıp ROBLOX_OAUTH_TOKEN ile dene (veya ilgili anahtara gerekli izinleri ver).`
              );
              return;
            }
            await removeUserFromGroup({ groupId, userId: targetUserId, cookie });
          } else {
            await handleInvalidAttempt(
              interaction,
              settings,
              `Roblox API hatası (branştan at) [auth=${authSource}]: ${formatRobloxError(removeRes.error)}`
            );
            return;
          }
        }
        await doLog('Branştan At', 'rutbeDegis', targetRank, 'REMOVED');
        await sendPublicResult(interaction, `Çıkarıldı: ${robloxName}`);
        return;
      }
      default:
        await interaction.editReply({ content: 'Bilinmeyen komut.' }).catch(() => null);
        return;
    }
  } catch (e) {
    console.error(e);
    const msg = e?.message ? `Hata: ${e.message}` : 'Hata oluştu.';
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => null);
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }
    }
    return;
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN');
  process.exitCode = 1;
} else {
  client.login(process.env.DISCORD_TOKEN);
}
