const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

async function confirmOrCancel(interaction, { title, description, timeoutMs = 60_000 }) {
  const confirmId = `confirm:${interaction.id}`;
  const cancelId = `cancel:${interaction.id}`;

  const embed = new EmbedBuilder().setTitle(title).setDescription(description);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(confirmId).setStyle(ButtonStyle.Success).setLabel('Onayla'),
    new ButtonBuilder().setCustomId(cancelId).setStyle(ButtonStyle.Danger).setLabel('İptal')
  );

  let msg;
  if (interaction.deferred || interaction.replied) {
    msg = await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });
  } else {
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    msg = await interaction.fetchReply();
  }

  try {
    const btn = await msg.awaitMessageComponent({
      time: timeoutMs,
      filter: (i) => i.user.id === interaction.user.id && (i.customId === confirmId || i.customId === cancelId)
    });

    await btn.update({ components: [] });
    return btn.customId === confirmId;
  } catch {
    try {
      if (interaction.deferred || interaction.replied) {
        await msg.edit({ components: [] });
      } else {
        await interaction.editReply({ components: [] });
      }
    } catch {}
    return false;
  }
}

module.exports = {
  confirmOrCancel
};
