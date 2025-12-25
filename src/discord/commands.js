const { SlashCommandBuilder } = require('discord.js');

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName('terfi')
      .setDescription('Ana grup terfi')
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('tenzil')
      .setDescription('Ana grup tenzil')
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('rutbe-degis')
      .setDescription('Ana grup rütbe değişimi')
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true))
      .addStringOption((o) => o.setName('rutbe').setDescription('Yeni rank ID').setRequired(true).setAutocomplete(true)),

    new SlashCommandBuilder()
      .setName('rutbe-sorgu')
      .setDescription('Ana gruptaki rütbeyi gösterir')
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('giris')
      .setDescription('Discord hesabını RoWiFi doğrulaması ile Roblox hesabına bağla'),

    new SlashCommandBuilder()
      .setName('player-bilgi')
      .setDescription('Giriş yapılan Roblox hesabının bilgilerini gösterir'),

    new SlashCommandBuilder()
      .setName('brans-terfi')
      .setDescription('Branş bazlı terfi')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('brans-tenzil')
      .setDescription('Branş bazlı tenzil')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('brans-rutbe-degis')
      .setDescription('Branş bazlı rütbe değişimi')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true))
      .addStringOption((o) => o.setName('rutbe').setDescription('Yeni rank ID').setRequired(true).setAutocomplete(true)),

    new SlashCommandBuilder()
      .setName('bransdan-at')
      .setDescription('Branştan çıkarma')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('brans-rutbe-sorgu')
      .setDescription('Branş bazlı rütbeyi gösterir')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('kisi').setDescription('Roblox kullanıcı adı').setRequired(true))

    ,
    new SlashCommandBuilder()
      .setName('brans-ekle')
      .setDescription('Branş ekle (Owner)')
      .addStringOption((o) => o.setName('isim').setDescription('Branş adı').setRequired(true))
      .addIntegerOption((o) => o.setName('groupid').setDescription('Roblox grup ID').setRequired(true))
      .addIntegerOption((o) => o.setName('hcminrank').setDescription('HC minimum rank').setRequired(true))
      .addIntegerOption((o) => o.setName('hqminrank').setDescription('HQ minimum rank').setRequired(true))
      .addStringOption((o) => o.setName('apikey').setDescription('Open Cloud API key (opsiyonel)').setRequired(false))

    ,
    new SlashCommandBuilder()
      .setName('brans-sil')
      .setDescription('Branş sil (Owner)')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))

    ,
    new SlashCommandBuilder()
      .setName('log-kanal-ayarla')
      .setDescription('Ana grup log kanalını ayarla (Owner)')
      .addChannelOption((o) => o.setName('kanal').setDescription('Log kanalı').setRequired(true))

    ,
    new SlashCommandBuilder()
      .setName('brans-log-kanal-ayarla')
      .setDescription('Branş log kanalını ayarla (Owner)')
      .addStringOption((o) => o.setName('brans').setDescription('Branş').setRequired(true).setAutocomplete(true))
      .addChannelOption((o) => o.setName('kanal').setDescription('Log kanalı').setRequired(true))
  ].map((c) => c.toJSON());
}

module.exports = {
  buildCommands
};
