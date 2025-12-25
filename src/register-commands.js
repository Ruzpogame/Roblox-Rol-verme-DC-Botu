require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { buildCommands } = require('./discord/commands');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId || !guildId) {
    throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID or DISCORD_GUILD_ID');
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const body = buildCommands();

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  console.log(`Registered ${body.length} commands.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
