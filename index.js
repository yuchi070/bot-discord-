const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

const PREFIX = '-';

const IDS = {
  SALON_REGLEMENT:     '1505541099484217434',
  SALON_ROLES:         '1505541083210322010',
  SALON_STATS:         '1506019680626675762',
  SALON_PLAINTE:       '1505541163258740796',
  SALON_PLAINTE_STAFF: '1505541146502500473',
  SALON_TOP_MSG:       '1505541388622762084',
  SALON_TOP_VOC:       '1505541364182683849',
  SALON_BIENVENUE:     '1505586853120839925',
  SALON_ACCES_JEUX:    '1505688303566065744',
  SALON_TICKET_REGLES: '1505541456234807316',
  SALON_TICKET_PANEL:  '1505541456419618856',
  STAT_EN_LIGNE:       '1505647390944792616',
  STAT_MEMBRES:        '1505647427749675028',
  STAT_VOC:            '1505647458565488690',
  ROLE_HOMME:          '1506025708827447537',
  ROLE_FEMME:          '1506025639432425562',
  ROLE_MINEUR:         '1506025570365079625',
  ROLE_MAJEUR:         '1506025535480926398',
  ROLE_MEMBRE:         '1506029843345703112',
  ROLE_TOP3_MSG:       '1506030189078118441',
  ROLE_TOP3_VOC:       '1505541364182683849',
  ROLE_COINS:          '1506032267506745435',
  ROLE_MUDAE:          '1506032360917827727',
  ROLE_OPW:            '1506032309080424531',
  ROLE_TICKET:         '1505609735036993659',
  CAT_TICKETS:         '1505541035479138434',
  LOG_MSG:             '1505541550203998330',
  LOG_TICKET:          '1505541540557361353',
  LOG_VOC:             '1505541558177497108',
  LOG_ROLE:            '1505541512837070979',
  LOG_MOD:             '1505541549335904266',
};

const messageCount = new Map();
const vocTime = new Map();
const vocJoin = new Map();
const warns = new Map();

client.once('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`);
  updateStats();
  setInterval(updateStats, 60000);
  setInterval(() => updateTopVoc(), 300000);
});

async function updateStats() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    await guild.members.fetch();
    const total = guild.memberCount;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const voc = guild.voiceStates.cache.filter(v => v.channelId).size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const chM = guild.channels.cache.get(IDS.STAT_MEMBRES);
    const chO = guild.channels.cache.get(IDS.STAT_EN_LIGNE);
    const chV = guild.channels.cache.get(IDS.STAT_VOC);
    if (chM) await chM.setName(`⚔️・membres : ${total}`).catch(() => {});
    if (chO) await chO.setName(`👑・en ligne : ${online}`).catch(() => {});
    if (chV) await chV.setName(`🎧・voc : ${voc}`).catch(() => {});
    const salon = guild.channels.cache.get(IDS.SALON_STATS);
    if (salon) {
      const embed = new EmbedBuilder().setTitle('📊 Statistiques').setColor('#ff69b4')
        .addFields(
          { name: '👥 Membres', value: `\`${total}\``, inline: true },
          { name: '🟢 En ligne', value: `\`${online}\``, inline: true },
          { name: '🎧 Vocal', value: `\`${voc}\``, inline: true },
          { name: '💎 Boosts', value: `\`${boosts}\``, inline: true }
        ).setTimestamp();
      const msgs = await salon.messages.fetch({ limit: 5 });
      const ex = msgs.find(m => m.author.id === client.user.id && m.embeds.length);
      if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
    }
  } catch (e) { console.error('Stats:', e.message); }
}

client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (salon) {
      const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('🌸 Bienvenue !')
        .setDescription(`Bienvenue à toi ${member} ! Amuse-toi bien avec nous 💖\nN'oublie pas de lire le règlement et de choisir tes rôles !`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp();
      await salon.send({ embeds: [embed] });
    }
  } catch (e) { console.error('Bienvenue:', e.message); }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 10 === 0) updateTopMessages(message.guild);
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'ping') {
    const m = await message.reply('🏓 Calcul...');
    await m.edit(`🏓 Pong ! **${m.createdTimestamp - message.createdTimestamp}ms**`);
  }

  if (cmd === 'help') {
    const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('📋 Commandes')
      .addFields(
        { name: '🛡️ Modération', value: '`-mute <@user> <minutes>`, `-unmute <@user>`, `-ban <@user> <raison>`, `-kick <@user>`, `-warn <@user> <raison>`, `-clear <nombre>`' },
        { name: '📊 Info', value: '`-ping`, `-avatar [@user]`' },
        { name: '⚙️ Panels (admin)', value: '`-panel reglement`, `-panel roles`, `-panel stats`, `-panel tickets`, `-panel jeux`, `-panel top`, `-panel plainte`' }
      ).setFooter({ text: `Préfixe : ${PREFIX}` });
    await message.reply({ embeds: [embed] });
  }

  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Permission refusée.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('❌ Nombre entre 1 et 100.');
    await message.channel.bulkDelete(n + 1, true);
    const m = await message.channel.send(`✅ **${n}** messages supprimés.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ff69b4').setTitle('🗑️ Clear').setDescription(`**${message.author.tag}** a supprimé **${n}** messages dans <#${message.channel.id}>`).setTimestamp()] });
  }

  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.ban({ reason });
    message.reply(`✅ **${target.user.tag}** banni. Raison : ${reason}`);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔨 Ban').setDescription(`**${target.user.tag}** banni par **${message.author.tag}**\nRaison : ${reason}`).setTimestamp()] });
  }

  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.kick(reason);
    message.reply(`✅ **${target.user.tag}** expulsé.`);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('👢 Kick').setDescription(`**${target.user.tag}** expulsé par **${message.author.tag}**`).setTimestamp()] });
  }

  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ reason, by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply(`⚠️ **${target.user.tag}** averti (${w.length} warn(s)).`);
    try { await target.send(`⚠️ Avertissement sur **${message.guild.name}** : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('⚠️ Warn').setDescription(`**${target.user.tag}** averti par **${message.author.tag}**\nRaison : ${reason} | Total : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    await target.timeout(duree * 60 * 1000);
    message.reply(`🔇 **${target.user.tag}** muté **${duree} minutes**.`);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('🔇 Mute').setDescription(`**${target.user.tag}** muté par **${message.author.tag}** — ${duree} min`).setTimestamp()] });
  }

  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    await target.timeout(null);
    message.reply(`🔊 **${target.user.tag}** démuté.`);
  }

  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    message.reply({ embeds: [new EmbedBuilder().setTitle(`Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 512 })).setColor('#ff69b4')] });
  }

  if (cmd === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ Permission refusée.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement') await sendPanelReglement(message.guild);
    else if (type === 'roles') await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'jeux') await sendPanelJeux(message.guild);
    else if (type === 'top') { await sendTopMessages(message.guild); await sendTopVoc(message.guild); }
    else if (type === 'plainte') await sendPanelPlainte(message.guild);
    else return message.reply('Types : `reglement`, `roles`, `tickets`, `jeux`, `top`, `plainte`');
    message.react('✅');
  }
});

async function sendPanelReglement(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
  if (!salon) return;
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('📜 Règlement du serveur')
    .setDescription('> Bienvenue sur notre serveur ! Merci de lire et respecter ces règles.\n\n**1.** 🤝 Respectez tous les membres.\n**2.** 🚫 Zéro discrimination.\n**3.** 💬 Pas de spam ou pub non autorisée.\n**4.** 🔞 Contenu NSFW interdit sauf dans les salons dédiés.\n**5.** 🎙️ Comportement correct en vocal.\n**6.** ⚖️ Décisions du staff définitives.\n**7.** 🔗 Pas de liens suspects.\n**8.** 🎭 Une seule identité.\n\n*Le non-respect entraîne des sanctions.*')
    .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
    .setFooter({ text: 'En restant sur ce serveur, tu acceptes ces règles.' });
  await salon.send({ embeds: [embed] });
}

async function sendPanelRoles(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_ROLES);
  if (!salon) return;
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('🎭 Choisis tes rôles')
    .setDescription('Clique sur les boutons pour obtenir tes rôles !')
    .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('role_homme').setLabel('👨 Homme').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('role_femme').setLabel('👩 Femme').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('role_mineur').setLabel('🧒 Mineur').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('role_majeur').setLabel('🔞 Majeur').setStyle(ButtonStyle.Success),
  );
  await salon.send({ embeds: [embed], components: [row] });
}

async function sendPanelJeux(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_ACCES_JEUX);
  if (!salon) return;
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('🎮 Accès aux jeux')
    .setDescription('Clique pour activer/désactiver un accès !')
    .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('jeux_coins').setLabel('🪙 Accès Coins').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('jeux_mudae').setLabel('🎴 Accès Mudae').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('jeux_opw').setLabel('⚔️ Accès OPW').setStyle(ButtonStyle.Success),
  );
  await salon.send({ embeds: [embed], components: [row] });
}

async function sendPanelTickets(guild) {
  const salonRegles = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
  if (salonRegles) {
    await salonRegles.send({ embeds: [new EmbedBuilder().setColor('#ff69b4').setTitle('📋 Règles des tickets')
      .setDescription('**Avant d\'ouvrir un ticket :**\n\n❌ Pas de troll ou faux tickets\n❌ Pas d\'insultes envers le staff\n✅ Sois poli et respectueux\n✅ Explique clairement ton problème\n✅ Un ticket par problème\n\n*Tout abus = sanction.*')] });
  }
  const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
  if (salonPanel) {
    const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('🎫 Ouvrir un ticket')
      .setDescription('Choisis le type de ticket ci-dessous !')
      .setImage('https://cdn.discordapp.com/attachments/1505586853120839925/1506023355558531082/4852aeedde73d6eac84f075c6b9c4ce6.gif?ex=6a0cc10c&is=6a0b6f8c&hm=946656d43cb7fe32da993915734a39f5fbd9e9c45c42c4abcfb590d4847f7205&');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_question').setLabel('❓ Question').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_abus').setLabel('⚠️ Abus/Problème').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_modo').setLabel('🛡️ Devenir Modérateur').setStyle(ButtonStyle.Success),
    );
    await salonPanel.send({ embeds: [embed], components: [row] });
  }
}

async function sendPanelPlainte(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_PLAINTE);
  if (!salon) return;
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('⚖️ Plainte anonyme')
    .setDescription('Clique ci-dessous pour déposer une plainte anonyme contre un membre du staff.\n\n**Ta plainte sera totalement anonyme.**');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('plainte_ouvrir').setLabel('📝 Déposer une plainte').setStyle(ButtonStyle.Danger),
  );
  await salon.send({ embeds: [embed], components: [row] });
}

async function updateTopMessages(guild) {
  if (!guild) return;
  const sorted = [...messageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const role = guild.roles.cache.get(IDS.ROLE_TOP3_MSG);
  if (role) {
    guild.members.cache.forEach(async m => {
      if (m.roles.cache.has(IDS.ROLE_TOP3_MSG) && !sorted.find(e => e[0] === m.id)) await m.roles.remove(role).catch(() => {});
    });
    for (const [id] of sorted) {
      const m = guild.members.cache.get(id);
      if (m && !m.roles.cache.has(IDS.ROLE_TOP3_MSG)) await m.roles.add(role).catch(() => {});
    }
  }
  await sendTopMessages(guild);
}

async function sendTopMessages(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_TOP_MSG);
  if (!salon) return;
  const sorted = [...messageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];
  const lines = sorted.map((e, i) => {
    const member = guild.members.cache.get(e[0]);
    return `${medals[i] || `**${i + 1}.**`} ${member?.displayName || 'Inconnu'} — **${e[1]}** messages`;
  });
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('💬 Top 10 Messages')
    .setDescription(lines.length ? lines.join('\n') : 'Aucune donnée.')
    .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
    .setTimestamp();
  const msgs = await salon.messages.fetch({ limit: 5 });
  const ex = msgs.find(m => m.author.id === client.user.id);
  if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
}

async function updateTopVoc() {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  vocJoin.forEach((joinTime, userId) => {
    const curr = vocTime.get(userId) || 0;
    vocTime.set(userId, curr + (Date.now() - joinTime));
    vocJoin.set(userId, Date.now());
  });
  const sorted = [...vocTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const role = guild.roles.cache.get(IDS.ROLE_TOP3_VOC);
  if (role) {
    guild.members.cache.forEach(async m => {
      if (m.roles.cache.has(IDS.ROLE_TOP3_VOC) && !sorted.find(e => e[0] === m.id)) await m.roles.remove(role).catch(() => {});
    });
    for (const [id] of sorted) {
      const m = guild.members.cache.get(id);
      if (m && !m.roles.cache.has(IDS.ROLE_TOP3_VOC)) await m.roles.add(role).catch(() => {});
    }
  }
  await sendTopVoc(guild);
}

async function sendTopVoc(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_TOP_VOC);
  if (!salon) return;
  const sorted = [...vocTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];
  const lines = sorted.map((e, i) => {
    const member = guild.members.cache.get(e[0]);
    const h = Math.floor(e[1] / 3600000);
    const m = Math.floor((e[1] % 3600000) / 60000);
    return `${medals[i] || `**${i + 1}.**`} ${member?.displayName || 'Inconnu'} — **${h}h ${m}m**`;
  });
  const embed = new EmbedBuilder().setColor('#ff69b4').setTitle('🎧 Top 10 Vocal')
    .setDescription(lines.length ? lines.join('\n') : 'Aucune donnée.')
    .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
    .setTimestamp();
  const msgs = await salon.messages.fetch({ limit: 5 });
  const ex = msgs.find(m => m.author.id === client.user.id);
  if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
}

client.on('voiceStateUpdate', async (oldState, newState) => {
  const logCh = newState.guild.channels.cache.get(IDS.LOG_VOC);
  const member = newState.member;
  if (!oldState.channelId && newState.channelId) {
    vocJoin.set(member.id, Date.now());
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`🎙️ **${member.displayName}** a rejoint <#${newState.channelId}>`).setTimestamp()] });
  } else if (oldState.channelId && !newState.channelId) {
    const join = vocJoin.get(member.id);
    if (join) { vocTime.set(member.id, (vocTime.get(member.id) || 0) + (Date.now() - join)); vocJoin.delete(member.id); }
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`🚪 **${member.displayName}** a quitté <#${oldState.channelId}>`).setTimestamp()] });
  } else if (oldState.channelId !== newState.channelId) {
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setDescription(`🔄 **${member.displayName}** passé de <#${oldState.channelId}> à <#${newState.channelId}>`).setTimestamp()] });
  }
  if (!oldState.serverMute && newState.serverMute) {
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`🔇 **${member.displayName}** mute voc`).setTimestamp()] });
  }
});

client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (logCh && message.content) {
    logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🗑️ Message supprimé')
      .setDescription(`**Auteur :** ${message.author?.tag}\n**Salon :** <#${message.channel.id}>\n**Message :** ${message.content.slice(0, 1000)}`).setTimestamp()] });
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
  if (!logCh) return;
  const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
  if (added.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`➕ **${newMember.displayName}** a reçu le rôle **${added.first()?.name}**`).setTimestamp()] });
  if (removed.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`➖ **${newMember.displayName}** a perdu le rôle **${removed.first()?.name}**`).setTimestamp()] });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;
  const member = interaction.member;
  const guild = interaction.guild;

  const roleMap = { role_homme: IDS.ROLE_HOMME, role_femme: IDS.ROLE_FEMME, role_mineur: IDS.ROLE_MINEUR, role_majeur: IDS.ROLE_MAJEUR };
  if (roleMap[interaction.customId]) {
    const roleId = roleMap[interaction.customId];
    const role = guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Rôle introuvable.', ephemeral: true });
    if (member.roles.cache.has(roleId)) { await member.roles.remove(role); await interaction.reply({ content: `✅ Rôle **${role.name}** retiré !`, ephemeral: true }); }
    else { await member.roles.add(role); await interaction.reply({ content: `✅ Rôle **${role.name}** ajouté !`, ephemeral: true }); }
    return;
  }

  const jeuxMap = { jeux_coins: IDS.ROLE_COINS, jeux_mudae: IDS.ROLE_MUDAE, jeux_opw: IDS.ROLE_OPW };
  if (jeuxMap[interaction.customId]) {
    const roleId = jeuxMap[interaction.customId];
    const role = guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Rôle introuvable.', ephemeral: true });
    if (member.roles.cache.has(roleId)) { await member.roles.remove(role); await interaction.reply({ content: `✅ Accès **${role.name}** désactivé !`, ephemeral: true }); }
    else { await member.roles.add(role); await interaction.reply({ content: `✅ Accès **${role.name}** activé !`, ephemeral: true }); }
    return;
  }

  const ticketTypes = { ticket_question: '❓ Question', ticket_abus: '⚠️ Abus/Problème', ticket_modo: '🛡️ Devenir Modérateur' };
  if (ticketTypes[interaction.customId]) {
    const type = ticketTypes[interaction.customId];
    const existing = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` && c.parentId === IDS.CAT_TICKETS);
    if (existing) return interaction.reply({ content: '❌ Tu as déjà un ticket ouvert !', ephemeral: true });
    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      type: ChannelType.GuildText,
      parent: IDS.CAT_TICKETS,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: IDS.ROLE_TICKET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });
    const embed = new EmbedBuilder().setColor('#ff69b4').setTitle(`🎫 Ticket — ${type}`)
      .setDescription(`Bonjour ${member} ! Un membre du staff va te répondre rapidement.\n\n**Type :** ${type}`).setTimestamp();
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_fermer').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger));
    await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket créé : ${ticketChannel}`, ephemeral: true });
    const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('🎫 Nouveau ticket').setDescription(`**Créé par :** ${member.user.tag}\n**Type :** ${type}`).setTimestamp()] });
    return;
  }

  if (interaction.customId === 'ticket_fermer') {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔒 Ticket fermé').setDescription(`Fermé par ${member}`).setTimestamp()] });
    const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔒 Ticket fermé').setDescription(`Fermé par **${member.user.tag}**`).setTimestamp()] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    return;
  }

  if (interaction.customId === 'plainte_ouvrir') {
    const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('📝 Plainte anonyme');
    const input = new TextInputBuilder().setCustomId('plainte_texte').setLabel('Décris ta plainte').setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(20).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'plainte_modal') {
    const texte = interaction.fields.getTextInputValue('plainte_texte');
    const salonStaff = guild.channels.cache.get(IDS.SALON_PLAINTE_STAFF);
    if (salonStaff) {
      const embed = new EmbedBuilder().setColor('#ed4245').setTitle('⚖️ Nouvelle plainte anonyme').setDescription(texte).setTimestamp().setFooter({ text: 'Plainte anonyme' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('plainte_voc').setLabel('📞 Appeler en vocal').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('plainte_derank').setLabel('⬇️ Dérank').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('plainte_blacklist').setLabel('🚫 Blacklist').setStyle(ButtonStyle.Danger),
      );
      await salonStaff.send({ embeds: [embed], components: [row] });
    }
    await interaction.reply({ content: '✅ Plainte envoyée anonymement !', ephemeral: true });
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
