const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');

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
const COLOR = '#e91e8c';

const IDS = {
  SALON_REGLEMENT:       '1505541099484217434',
  SALON_ROLES:           '1505541083210322010',
  SALON_STATS:           '1506019680626675762',
  SALON_PLAINTE:         '1505541163258740796',
  SALON_PLAINTE_STAFF:   '1505541146502500473',
  SALON_TOP_MSG:         '1505541388622762084',
  SALON_TOP_VOC:         '1505541364182683849',
  SALON_BIENVENUE:       '1505586853120839925',
  SALON_ACCES_JEUX:      '1505688303566065744',
  SALON_TICKET_REGLES:   '1505541456234807316',
  SALON_TICKET_PANEL:    '1505541456419618856',
  SALON_AUTO_REACT:      '1506255806184685637',
  SALON_PARTENARIAT:     '1506232546252423291',
  STAT_EN_LIGNE:         '1505647390944792616',
  STAT_MEMBRES:          '1505647427749675028',
  STAT_VOC:              '1505647458565488690',
  ROLE_MEMBRE:           '1506029843345703112',
  ROLE_TOP3_MSG:         '1506030189078118441',
  ROLE_TOP3_VOC:         '1505541364182683849',
  ROLE_NOTIF_PARTNER:    '1506250258924179526',
  ROLE_NOTIF_SONDAGE:    '1506257883074003075',
  ROLE_NOTIF_ANIM:       '1506257971263311984',
  ROLE_NOTIF_GIVEAWAY:   '1506250141777268797',
  ROLE_TICKET:           '1505609735036993659',
  CAT_TICKETS:           '1505541035479138434',
  LOG_MSG:               '1505541550203998330',
  LOG_TICKET:            '1505541540557361353',
  LOG_VOC:               '1505541558177497108',
  LOG_ROLE:              '1505541512837070979',
  LOG_MOD:               '1505541549335904266',
};

const messageCount = new Map();
const vocTime = new Map();
const vocJoin = new Map();
const warns = new Map();
// stocke l'id du panel top pour le réactualiser
let topMsgPanelId = null;
let topVocPanelId = null;

// ══ READY ══
client.once('ready', async () => {
  console.log(`Bot connecte : ${client.user.tag}`);
  updateStats();
  setInterval(updateStats, 60000);
  setInterval(() => updateTopVoc(), 300000);
});

// ══ STATS ══
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
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('Statistiques du serveur')
      .setDescription(`**Membres :** ${total}\n**En ligne :** ${online}\n**En vocal :** ${voc}\n**Boosts :** ${boosts}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mise a jour automatique' });

    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Statistiques'));
    if (ex) await ex.edit({ embeds: [embed] });
    else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ BIENVENUE ══
client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (!salon) return;
    await salon.send(`Salut ${member} amuse toi bien avec nous ! 💖`);
  } catch (e) { console.error('Bienvenue:', e.message); }
});

// ══ BOOST MESSAGE ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const salon = newMember.guild.channels.cache.get(IDS.SALON_BIENVENUE);
      if (salon) await salon.send(`Merci ${newMember} pour ton boost ! Tu supportes le serveur 💎`);
    }
    const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
    if (!logCh) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) {
      const role = added.first();
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Role ajoute')
        .setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Role ajoute :** ${role?.name} (${role?.id})\n**Roles actuels :** ${newMember.roles.cache.filter(r => r.id !== newMember.guild.id).map(r => r.name).join(', ')}`)
        .setTimestamp()] });
    }
    if (removed.size > 0) {
      const role = removed.first();
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
        .setTitle('Role retire')
        .setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Role retire :** ${role?.name} (${role?.id})\n**Roles restants :** ${newMember.roles.cache.filter(r => r.id !== newMember.guild.id).map(r => r.name).join(', ')}`)
        .setTimestamp()] });
    }
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Auto react coeur
  if (message.channel.id === IDS.SALON_AUTO_REACT) {
    await message.react('❤️').catch(() => {});
  }

  // Comptage messages
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 5 === 0) updateTopMessages(message.guild).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PING
  if (cmd === 'ping') {
    const m = await message.reply('...');
    await m.edit(`Pong ! \`${m.createdTimestamp - message.createdTimestamp}ms\``);
  }

  // HELP
  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Commandes Naytawa', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: 'Moderation', value: '`-mute @user <min>` `-unmute @user`\n`-ban @user <raison>` `-kick @user`\n`-warn @user <raison>` `-clear <1-100>`' },
        { name: 'Info', value: '`-ping` `-avatar [@user]`' },
        { name: 'Panels', value: '`-panel reglement` `-panel roles`\n`-panel tickets` `-panel jeux`\n`-panel top` `-panel partenariat`\n`-make panel <titre> <description>`' },
        { name: 'Utilitaire', value: '`-backup`' },
      )
      .setFooter({ text: `Prefixe : ${PREFIX}` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  }

  // CLEAR
  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('Permission refusee.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('Nombre entre 1 et 100.');
    await message.channel.bulkDelete(n + 1, true);
    const m = await message.channel.send(`${n} messages supprimes.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(COLOR)
      .setTitle('Clear')
      .setDescription(`**Par :** ${message.author.tag} (${message.author.id})\n**Salon :** <#${message.channel.id}>\n**Quantite :** ${n} messages\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
      .setTimestamp()] });
  }

  // BAN
  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.ban({ reason });
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Bannissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
      .setTitle('Ban')
      .setDescription(`**Banni :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Raison :** ${reason}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
      .setTimestamp()] });
  }

  // KICK
  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.kick(reason);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Expulsion').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
      .setTitle('Kick')
      .setDescription(`**Expulse :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Raison :** ${reason}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
      .setTimestamp()] });
  }

  // WARN
  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ reason, by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
      .setTitle('Warn')
      .setDescription(`**Averti :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Raison :** ${reason}\n**Total warns :** ${w.length}\n**Historique :**\n${w.map((x,i)=>`${i+1}. ${x.reason} (${x.date} par ${x.by})`).join('\n')}`)
      .setTimestamp()] });
  }

  // MUTE
  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'Aucune raison';
    await target.timeout(duree * 60 * 1000, reason);
    const muteEnd = Math.floor((Date.now() + duree * 60 * 1000) / 1000);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`**Membre :** ${target.user.tag}\n**Duree :** ${duree} minutes\n**Fin :** <t:${muteEnd}:R>\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
      .setTitle('Mute')
      .setDescription(`**Mute :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Duree :** ${duree} minutes\n**Fin du mute :** <t:${muteEnd}:F>\n**Raison :** ${reason}\n**Statut :** Actuellement mute`)
      .setTimestamp()] });
  }

  // UNMUTE
  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`${target.user.tag} a ete demute.`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
      .setTitle('Unmute')
      .setDescription(`**Demute :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Statut :** N'est plus mute`)
      .setTimestamp()] });
  }

  // AVATAR
  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }

  // MAKE PANEL
  if (cmd === 'make' && args[0] === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusee.');
    const titre = args[1] || 'Panel';
    const description = args.slice(2).join(' ') || 'Description du panel.';
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle(titre)
      .setDescription(description)
      .setTimestamp()
      .setFooter({ text: 'Naytawa' });
    await message.channel.send({ embeds: [embed] });
    await message.delete().catch(() => {});
  }

  // BACKUP
  if (cmd === 'backup') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('Permission refusee.');
    const guild = message.guild;
    const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type, position: c.position, parentId: c.parentId }));
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ name: r.name, color: r.color, permissions: r.permissions.bitfield.toString(), position: r.position }));
    const backup = JSON.stringify({ channels, roles, memberCount: guild.memberCount, name: guild.name, date: new Date().toISOString() }, null, 2);
    const { AttachmentBuilder } = require('discord.js');
    const attachment = new AttachmentBuilder(Buffer.from(backup), { name: `backup-${guild.name}-${Date.now()}.json` });
    await message.reply({ content: 'Backup genere ! Garde ce fichier en securite.', files: [attachment] });
  }

  // PANEL
  if (cmd === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusee.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement') await sendPanelReglement(message.guild);
    else if (type === 'roles') await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'jeux') await sendPanelJeux(message.guild);
    else if (type === 'top') { await sendTopMessages(message.guild); await sendTopVoc(message.guild); }
    else if (type === 'partenariat') await sendPanelPartenariat(message.guild);
    else return message.reply('Types : `reglement` `roles` `tickets` `jeux` `top` `partenariat`');
    const confirm = await message.reply('Panel envoye !');
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }
});

// ══ PANEL RÈGLEMENT ══
async function sendPanelReglement(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
    if (!salon) return console.log('Salon reglement introuvable');
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Reglement du serveur')
      .setDescription([
        '> Bienvenue ! Merci de lire et respecter ces regles.',
        '',
        '**` 01 `** Respectez chaque membre.',
        '**` 02 `** Zero discrimination de toute forme.',
        '**` 03 `** Pas de spam, flood ou pub non autorisee.',
        '**` 04 `** Contenu NSFW interdit hors salons dedies.',
        '**` 05 `** Bonne conduite obligatoire en vocal.',
        '**` 06 `** Les decisions du staff sont definitives.',
        '**` 07 `** Aucun lien suspect ou malveillant.',
        '**` 08 `** Une seule identite par personne.',
        '',
        'Conditions d\'utilisation Discord : https://discord.com/terms',
        'Regles de la communaute : https://discord.com/guidelines',
        '',
        '*En restant sur ce serveur, tu acceptes ces regles.*',
      ].join('\n'))
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
      .setFooter({ text: 'Naytawa • Tout manquement entraine une sanction.' });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Panel reglement:', e.message); }
}

// ══ PANEL RÔLES NOTIFICATIONS ══
async function sendPanelRoles(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ROLES);
    if (!salon) return console.log('Salon roles introuvable');
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Notifications')
      .setDescription([
        '> Choisis les notifications que tu souhaites recevoir.',
        '> Reclique pour desactiver une notification.',
        '',
        '**Partenariat** — Annonces partenariat',
        '**Sondage** — Sondages du serveur',
        '**Animation** — Evenements et animations',
        '**Giveaway** — Concours et cadeaux',
      ].join('\n'))
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa • Clique pour activer ou desactiver.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('notif_partner').setLabel('Partenariat').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('notif_sondage').setLabel('Sondage').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('notif_anim').setLabel('Animation').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('notif_giveaway').setLabel('Giveaway').setStyle(ButtonStyle.Danger),
    );
    await salon.send({ embeds: [embed], components: [row] });
  } catch (e) { console.error('Panel roles:', e.message); }
}

// ══ PANEL TICKETS ══
async function sendPanelTickets(guild) {
  try {
    const salonRegles = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
    if (salonRegles) {
      await salonRegles.send({ embeds: [new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Regles des tickets')
        .setDescription([
          '> Avant d\'ouvrir un ticket, lis ces regles.',
          '',
          'Pas de faux tickets ou trolls',
          'Pas d\'insultes envers le staff',
          'Un seul ticket par probleme',
          'Sois poli et respectueux',
          'Explique clairement ta situation',
          '',
          `Pour creer un ticket : <#${IDS.SALON_TICKET_PANEL}>`,
          '',
          '*Tout abus entraine une sanction.*',
        ].join('\n'))
        .setFooter({ text: 'Naytawa' })] });
       .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&=&width=398&height=225')
    }
    const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
    if (salonPanel) {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Ouvrir un ticket')
        .setDescription([
          '> Choisis la categorie correspondant a ta demande.',
          '',
          '**Question** — Une question generale',
          '**Abus / Probleme** — Signaler un abus de perm',
          '**Staff** — Candidature moderateur',
          '**Partenariat** — Demande de partenariat',
        ].join('\n'))
        .setImage('https://cdn.discordapp.com/attachments/1505586853120839925/1506023355558531082/4852aeedde73d6eac84f075c6b9c4ce6.gif?ex=6a0cc10c&is=6a0b6f8c&hm=946656d43cb7fe32da993915734a39f5fbd9e9c45c42c4abcfb590d4847f7205&')
        .setFooter({ text: 'Naytawa' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_question').setLabel('Question').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_abus').setLabel('Abus / Probleme').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_modo').setLabel('Devenir Moderateur').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_partner').setLabel('Partenariat').setStyle(ButtonStyle.Secondary),
      );
      await salonPanel.send({ embeds: [embed], components: [row] });
    }
  } catch (e) { console.error('Panel tickets:', e.message); }
}

// ══ PANEL PARTENARIAT ══
async function sendPanelPartenariat(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_PARTENARIAT);
    if (!salon) return console.log('Salon partenariat introuvable');
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Partenariat')
      .setDescription([
        '> Tu souhaites devenir partenaire de Naytawa ?',
        '',
        '**Conditions :**',
        '**` 01 `** Minimum 100 membres sur ton serveur',
        '**` 02 `** Serveur actif et organise',
        '**` 03 `** Pas de contenu illicite ou inapproprie',
        '**` 04 `** Avoir un salon partenariat visible',
        '**` 05 `** Accepter nos conditions de partenariat',
        '',
        '**Pour faire une demande :**',
        `Ouvre un ticket dans <#${IDS.SALON_TICKET_PANEL}>`,
        '',
        '*Nous etudions chaque demande avec attention.*',
      ].join('\n'))
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506232948930908170/1a13c8300696a51f0f7e45d726cce0b3_1.gif?ex=6a0d843f&is=6a0c32bf&hm=1997c636b1907355274fd7dff57e14db10af02cedd35916a902bde86df43a557&')
      .setFooter({ text: 'Naytawa • Partenariat' });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Panel partenariat:', e.message); }
}

// ══ TOP MESSAGES ══
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
  try {
    const salon = guild.channels.cache.get(IDS.SALON_TOP_MSG);
    if (!salon) return;
    const sorted = [...messageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lines = sorted.map((e, i) => {
      const member = guild.members.cache.get(e[0]);
      return `Top ${i + 1} <@${e[0]}> — ${e[1].toLocaleString()} messages`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Top 10 Messages')
      .setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.')
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&=&width=398&height=225')
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });

    // Cherche le panel existant et le modifie sinon le crée une seule fois
    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Messages');
    if (ex) {
      await ex.edit({ embeds: [embed] });
    } else {
      const sent = await salon.send({ embeds: [embed] });
      topMsgPanelId = sent.id;
    }
  } catch (e) { console.error('Top messages:', e.message); }
}

// ══ TOP VOCAL ══
async function updateTopVoc() {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  vocJoin.forEach((joinTime, userId) => {
    vocTime.set(userId, (vocTime.get(userId) || 0) + (Date.now() - joinTime));
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
  try {
    const salon = guild.channels.cache.get(IDS.SALON_TOP_VOC);
    if (!salon) return;
    const sorted = [...vocTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lines = sorted.map((e, i) => {
      const h = Math.floor(e[1] / 3600000);
      const m = Math.floor((e[1] % 3600000) / 60000);
      return `Top ${i + 1} <@${e[0]}> — ${h}h ${m}m`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Top 10 Vocal')
      .setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.')
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&=&width=398&height=225')
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });

    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Vocal');
    if (ex) {
      await ex.edit({ embeds: [embed] });
    } else {
      await salon.send({ embeds: [embed] });
    }
  } catch (e) { console.error('Top vocal:', e.message); }
}

// ══ LOGS VOC ══
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const logCh = newState.guild.channels.cache.get(IDS.LOG_VOC);
    const member = newState.member;
    if (!member) return;

    if (!oldState.channelId && newState.channelId) {
      vocJoin.set(member.id, Date.now());
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Rejoins vocal')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon rejoint :** <#${newState.channelId}>\n**Statut mute :** ${newState.selfMute || newState.serverMute ? 'Mute' : 'Non mute'}\n**Statut sourd :** ${newState.selfDeaf || newState.serverDeaf ? 'Sourd' : 'Non sourd'}`)
        .setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) {
        const elapsed = Date.now() - join;
        vocTime.set(member.id, (vocTime.get(member.id) || 0) + elapsed);
        vocJoin.delete(member.id);
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
          .setTitle('Quitte vocal')
          .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon quitte :** <#${oldState.channelId}>\n**Temps passe :** ${h}h ${m}m`)
          .setTimestamp()] });
      }
    } else if (oldState.channelId !== newState.channelId) {
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
        .setTitle('Changement de vocal')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**De :** <#${oldState.channelId}>\n**Vers :** <#${newState.channelId}>`)
        .setTimestamp()] });
    }

    if (!oldState.serverMute && newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
        .setTitle('Mute vocal serveur')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${newState.channelId}>\n**Statut :** Mute par le serveur`)
        .setTimestamp()] });
    }
    if (oldState.serverMute && !newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Demute vocal serveur')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${newState.channelId}>\n**Statut :** N'est plus mute`)
        .setTimestamp()] });
    }
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ LOGS MSG SUPPRIME ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (logCh && message.content) {
    logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
      .setTitle('Message supprime')
      .setDescription(`**Auteur :** ${message.author?.tag} (${message.author?.id})\n**Salon :** <#${message.channel.id}>\n**Date du message :** <t:${Math.floor(message.createdTimestamp/1000)}:F>\n**Contenu :**\n${message.content.slice(0, 1000)}`)
      .setTimestamp()] });
  }
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild = interaction.guild;

    if (interaction.isButton()) {

      // Notifications
      const notifMap = {
        notif_partner:  IDS.ROLE_NOTIF_PARTNER,
        notif_sondage:  IDS.ROLE_NOTIF_SONDAGE,
        notif_anim:     IDS.ROLE_NOTIF_ANIM,
        notif_giveaway: IDS.ROLE_NOTIF_GIVEAWAY,
      };
      if (notifMap[interaction.customId]) {
        const roleId = notifMap[interaction.customId];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role);
          return interaction.reply({ content: `Notification **${role.name}** desactivee !`, ephemeral: true });
        } else {
          await member.roles.add(role);
          return interaction.reply({ content: `Notification **${role.name}** activee !`, ephemeral: true });
        }
      }

      // Jeux
      const jeuxMap = {
        jeux_coins: '1506032267506745435',
        jeux_mudae: '1506032360917827727',
        jeux_opw:   '1506032309080424531',
      };
      if (jeuxMap[interaction.customId]) {
        const roleId = jeuxMap[interaction.customId];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role);
          return interaction.reply({ content: `Acces **${role.name}** desactive !`, ephemeral: true });
        } else {
          await member.roles.add(role);
          return interaction.reply({ content: `Acces **${role.name}** active !`, ephemeral: true });
        }
      }

      // Tickets
      const ticketTypes = {
        ticket_question: 'Question',
        ticket_abus:     'Abus / Probleme',
        ticket_modo:     'Devenir Moderateur',
        ticket_partner:  'Partenariat',
      };
      if (ticketTypes[interaction.customId]) {
        const type = ticketTypes[interaction.customId];
        const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
        const existing = guild.channels.cache.find(c => c.name === `ticket-${safeName}` && c.parentId === IDS.CAT_TICKETS);
        if (existing) return interaction.reply({ content: 'Tu as deja un ticket ouvert !', ephemeral: true });

        const ticketChannel = await guild.channels.create({
          name: `ticket-${safeName}`,
          type: ChannelType.GuildText,
          parent: IDS.CAT_TICKETS,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: IDS.ROLE_TICKET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });

        // Si partenariat : demander la raison
        let partnerInfo = '';
        if (interaction.customId === 'ticket_partner') {
          partnerInfo = '\n\nMerci de donner :\n- Le nom de ton serveur\n- Le lien d\'invitation\n- Le nombre de membres\n- La raison du partenariat';
        }

        const embed = new EmbedBuilder()
          .setColor(COLOR)
          .setAuthor({ name: 'Naytawa — Support', iconURL: guild.iconURL({ dynamic: true }) })
          .setTitle(`Ticket — ${type}`)
          .setDescription(`Bonjour ${member} !\nUn membre du staff va prendre en charge ta demande.\n\n**Type :** ${type}\n**Cree le :** <t:${Math.floor(Date.now() / 1000)}:F>${partnerInfo}`)
          .setFooter({ text: 'Naytawa' })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel('Je le prends en charge').setStyle(ButtonStyle.Success),
        );

        await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket cree : ${ticketChannel}`, ephemeral: true });

        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
          .setTitle('Nouveau ticket')
          .setDescription(`**Cree par :** ${member.user.tag} (${member.id})\n**Type :** ${type}\n**Salon :** ${ticketChannel}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
          .setTimestamp()] });
        return;
      }

      // Prendre en charge ticket
      if (interaction.customId === 'ticket_prendre') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel(`Pris en charge par ${member.displayName}`).setStyle(ButtonStyle.Success).setDisabled(true),
        );
        await interaction.update({ components: [row] });
        await interaction.channel.send(`Ce ticket est pris en charge par ${member} !`);
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
          .setTitle('Ticket pris en charge')
          .setDescription(`**Par :** ${member.user.tag} (${member.id})\n**Salon :** ${interaction.channel.name}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
          .setTimestamp()] });
        return;
      }

      // Fermer ticket
      if (interaction.customId === 'ticket_fermer') {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par ${member}\nSuppression dans 5 secondes...`).setTimestamp()] });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
          .setTitle('Ticket ferme')
          .setDescription(`**Ferme par :** ${member.user.tag} (${member.id})\n**Salon :** ${interaction.channel.name}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
          .setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      // Plainte ouvrir
      if (interaction.customId === 'plainte_ouvrir') {
        const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('Plainte anonyme');
        const input = new TextInputBuilder()
          .setCustomId('plainte_texte')
          .setLabel('Decris ta plainte')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(20)
          .setMaxLength(1000)
          .setPlaceholder('Explique la situation, qui est concerne, quand...');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
    }

    // MODAL PLAINTE
    if (interaction.isModalSubmit() && interaction.customId === 'plainte_modal') {
      await interaction.deferReply({ ephemeral: true });
      const texte = interaction.fields.getTextInputValue('plainte_texte');
      const salonStaff = guild.channels.cache.get(IDS.SALON_PLAINTE_STAFF);
      if (salonStaff) {
        const embed = new EmbedBuilder()
          .setColor('#ed4245')
          .setAuthor({ name: 'Naytawa — Plainte anonyme' })
          .setTitle('Nouvelle plainte recue')
          .setDescription(`> Contenu :\n\n${texte}`)
          .setTimestamp()
          .setFooter({ text: 'Naytawa • Identite confidentielle.' });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('plainte_voc').setLabel('Convoquer en vocal').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('plainte_derank').setLabel('Derank').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('plainte_blacklist').setLabel('Blacklist staff').setStyle(ButtonStyle.Danger),
        );
        await salonStaff.send({ embeds: [embed], components: [row] });
      }
      await interaction.editReply({ content: 'Plainte transmise anonymement !' });
      return;
    }

  } catch (e) { console.error('Interaction:', e.message); }
});

client.login(process.env.DISCORD_TOKEN);
