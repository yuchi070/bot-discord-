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
  SALON_AUTO_REACT:    '1505541372436943101',
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

// ══ MESSAGES ROTATIFS ══
const messagesRotatifs = [
  { title: 'Le savais-tu ?', desc: 'Plus tu parles sur le serveur, plus tu montes dans le top messages !' },
  { title: 'Tip vocal', desc: 'Rejoins un salon vocal pour grimper dans le top vocal !' },
  { title: 'Rappel', desc: 'En cas de problème, ouvre un ticket ! Le staff est là pour toi.' },
  { title: 'Classement', desc: 'Le top 3 messages et vocal reçoit un rôle exclusif !' },
  { title: 'Jeux', desc: 'Active tes accès aux salons de jeux dans le salon accès rapides !' },
  { title: 'Bienvenue', desc: 'N\'oublie pas de choisir tes rôles dans le salon dédié !' },
];
let rotIndex = 0;
let lastRotMsg = null;

async function sendMessageRotatif() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    const salon = guild.channels.cache.get(IDS.SALON_STATS);
    if (!salon) return;
    if (lastRotMsg) await lastRotMsg.delete().catch(() => {});
    const data = messagesRotatifs[rotIndex % messagesRotatifs.length];
    rotIndex++;
    const membres = guild.memberCount;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(data.title)
      .setDescription(`${data.desc}\n\n**${membres}** membres  •  **${online}** en ligne  •  **${guild.premiumSubscriptionCount || 0}** boosts`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setTimestamp();
    lastRotMsg = await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Rotatif:', e.message); }
}

// ══ READY ══
client.once('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`);
  updateStats();
  setInterval(updateStats, 60000);
  setInterval(() => updateTopVoc(), 300000);
  sendMessageRotatif();
  setInterval(sendMessageRotatif, 10 * 60 * 1000);
});

// ══ AUTO REACTION ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Auto react coeur
  if (message.channel.id === IDS.SALON_AUTO_REACT) {
    await message.react('❤️').catch(() => {});
  }

  // Comptage messages
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 10 === 0) updateTopMessages(message.guild).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PING
  if (cmd === 'ping') {
    const m = await message.reply('Calcul...');
    await m.edit(`Pong ! \`${m.createdTimestamp - message.createdTimestamp}ms\``);
  }

  // HELP
  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Commandes — Naytawa Bot', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: 'Modération', value: '`-mute @user <min>` `-unmute @user`\n`-ban @user <raison>` `-kick @user`\n`-warn @user <raison>` `-clear <1-100>`' },
        { name: 'Info', value: '`-ping` `-avatar [@user]`' },
        { name: 'Panels (Admin)', value: '`-panel reglement` `-panel roles`\n`-panel tickets` `-panel jeux`\n`-panel top` `-panel plainte`' },
      )
      .setFooter({ text: `Préfixe : ${PREFIX}` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  }

  // CLEAR
  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('Permission refusée.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('Nombre entre 1 et 100.');
    await message.channel.bulkDelete(n + 1, true);
    const m = await message.channel.send(`${n} messages supprimés.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Clear').setDescription(`Par : ${message.author.tag}\nSalon : <#${message.channel.id}>\nQuantité : ${n}`).setTimestamp()] });
  }

  // BAN
  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.ban({ reason });
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Bannissement').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ban').setDescription(`Banni : ${target.user.tag}\nPar : ${message.author.tag}\nRaison : ${reason}`).setTimestamp()] });
  }

  // KICK
  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.kick(reason);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Expulsion').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Kick').setDescription(`Expulsé : ${target.user.tag}\nPar : ${message.author.tag}`).setTimestamp()] });
  }

  // WARN
  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ reason, by: message.author.tag });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}\nTotal : ${w.length} warn(s)`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Warn').setDescription(`Averti : ${target.user.tag}\nPar : ${message.author.tag}\nRaison : ${reason}\nTotal : ${w.length}`).setTimestamp()] });
  }

  // MUTE
  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    await target.timeout(duree * 60 * 1000);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`Membre : ${target.user.tag}\nDurée : ${duree} minutes`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`Muté : ${target.user.tag}\nPar : ${message.author.tag}\nDurée : ${duree} min`).setTimestamp()] });
  }

  // UNMUTE
  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`${target.user.tag} a été démuté.`).setTimestamp()] });
  }

  // AVATAR
  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }

  // PANEL
  if (cmd === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusée.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement') await sendPanelReglement(message.guild);
    else if (type === 'roles') await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'jeux') await sendPanelJeux(message.guild);
    else if (type === 'top') { await sendTopMessages(message.guild); await sendTopVoc(message.guild); }
    else if (type === 'plainte') await sendPanelPlainte(message.guild);
    else return message.reply('Types : `reglement` `roles` `tickets` `jeux` `top` `plainte`');
    const confirm = await message.reply(`Panel envoyé !`);
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }
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
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ BIENVENUE ══
client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: `Bienvenue sur Naytawa !`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`Bienvenue à toi ${member} ! Nous sommes ravis de t'accueillir 💖\n\nLis le règlement\nChoisis tes rôles\nProfite du serveur !`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: `Membre #${member.guild.memberCount} • Naytawa` });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Bienvenue:', e.message); }
});

// ══ PANEL RÈGLEMENT ══
async function sendPanelReglement(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
    if (!salon) { console.log('Salon reglement introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Règlement du serveur')
      .setDescription([
        '> Bienvenue ! Merci de lire et respecter ces règles.',
        '',
        '**` 01 `** Respectez chaque membre.',
        '**` 02 `** Zéro discrimination de toute forme.',
        '**` 03 `** Pas de spam, flood ou pub non autorisée.',
        '**` 04 `** Contenu NSFW interdit hors salons dédiés.',
        '**` 05 `** Bonne conduite obligatoire en vocal.',
        '**` 06 `** Les décisions du staff sont définitives.',
        '**` 07 `** Aucun lien suspect ou malveillant.',
        '**` 08 `** Une seule identité par personne.',
        '',
        '*En restant sur ce serveur, tu acceptes ces règles.*',
      ].join('\n'))
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
      .setFooter({ text: 'Naytawa • Tout manquement entraîne une sanction.' });
    const ping = await salon.send({ content: `<@&${IDS.ROLE_MEMBRE}>` });
    setTimeout(() => ping.delete().catch(() => {}), 5000);
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Panel reglement:', e.message); }
}

// ══ PANEL RÔLES ══
async function sendPanelRoles(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ROLES);
    if (!salon) { console.log('Salon roles introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Choisis tes rôles')
      .setDescription([
        '> Sélectionne tes rôles en cliquant sur les boutons.',
        '> Reclique pour retirer un rôle.',
        '',
        '**Genre**',
        '`Homme`  `Femme`',
        '',
        '**Age**',
        '`Mineur`  `Majeur`',
      ].join('\n'))
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa • Un seul rôle par catégorie recommandé.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('role_homme').setLabel('Homme').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('role_femme').setLabel('Femme').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('role_mineur').setLabel('Mineur').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('role_majeur').setLabel('Majeur').setStyle(ButtonStyle.Success),
    );
    const ping = await salon.send({ content: `<@&${IDS.ROLE_MEMBRE}>` });
    setTimeout(() => ping.delete().catch(() => {}), 5000);
    await salon.send({ embeds: [embed], components: [row] });
  } catch (e) { console.error('Panel roles:', e.message); }
}

// ══ PANEL JEUX ══
async function sendPanelJeux(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ACCES_JEUX);
    if (!salon) { console.log('Salon jeux introuvable : ' + IDS.SALON_ACCES_JEUX); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Acces rapides')
      .setDescription([
        '> Active ou desactive l\'acces a un jeu.',
        '> Reclique pour retirer l\'acces.',
        '',
        '`Coins` — Acces au salon Coins',
        '`Mudae` — Acces au salon Mudae',
        '`OPW` — Acces au salon One Piece World',
      ].join('\n'))
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa • Acces instantane.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('jeux_coins').setLabel('Coins').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('jeux_mudae').setLabel('Mudae').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('jeux_opw').setLabel('OPW').setStyle(ButtonStyle.Success),
    );
    await salon.send({ embeds: [embed], components: [row] });
    console.log('Panel jeux envoye dans ' + salon.name);
  } catch (e) { console.error('Panel jeux:', e.message); }
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
          '> Merci de respecter ces regles avant d\'ouvrir un ticket.',
          '',
          'Pas de faux tickets ou trolls',
          'Pas d\'insultes envers le staff',
          'Un seul ticket par probleme',
          'Sois poli et respectueux',
          'Explique clairement ta situation',
          '',
          '*Tout abus entraine une sanction immediate.*',
        ].join('\n'))
        .setFooter({ text: 'Naytawa • Le staff est la pour toi.' })] });
    }
    const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
    if (salonPanel) {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Ouvrir un ticket')
        .setDescription([
          '> Choisis la categorie correspondant a ta demande.',
          '> Un membre du staff te repondra rapidement.',
          '',
          '**Question** — Une question generale',
          '**Abus / Probleme** — Signaler un abus de perm',
          '**Staff** — Candidature moderateur',
        ].join('\n'))
        .setImage('https://cdn.discordapp.com/attachments/1505586853120839925/1506023355558531082/4852aeedde73d6eac84f075c6b9c4ce6.gif?ex=6a0cc10c&is=6a0b6f8c&hm=946656d43cb7fe32da993915734a39f5fbd9e9c45c42c4abcfb590d4847f7205&')
        .setFooter({ text: 'Naytawa • Respecte les regles des tickets.' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_question').setLabel('Question').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_abus').setLabel('Abus / Probleme').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_modo').setLabel('Devenir Moderateur').setStyle(ButtonStyle.Success),
      );
      await salonPanel.send({ embeds: [embed], components: [row] });
    }
  } catch (e) { console.error('Panel tickets:', e.message); }
}

// ══ PANEL PLAINTE ══
async function sendPanelPlainte(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_PLAINTE);
    if (!salon) { console.log('Salon plainte introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Plainte anonyme')
      .setDescription([
        '> Tu souhaites signaler un comportement inapproprie du staff ?',
        '',
        'Clique sur le bouton ci-dessous',
        'Remplis le formulaire',
        'Ta plainte est transmise anonymement aux hauts grades',
        '',
        '*Ton identite ne sera jamais revelee.*',
      ].join('\n'))
      .setFooter({ text: 'Naytawa • Confidentialite garantie.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('plainte_ouvrir').setLabel('Deposer une plainte').setStyle(ButtonStyle.Danger),
    );
    await salon.send({ embeds: [embed], components: [row] });
  } catch (e) { console.error('Panel plainte:', e.message); }
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
    const medals = ['🥇', '🥈', '🥉'];
    const lines = sorted.map((e, i) => {
      const member = guild.members.cache.get(e[0]);
      return `${medals[i] || `\`${String(i + 1).padStart(2, '0')}\``}  **${member?.displayName || 'Inconnu'}**  —  ${e[1].toLocaleString()} messages`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Top 10 Messages')
      .setDescription(lines.length ? lines.join('\n') : '> Aucune donnee.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Messages'));
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
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
    const medals = ['🥇', '🥈', '🥉'];
    const lines = sorted.map((e, i) => {
      const member = guild.members.cache.get(e[0]);
      const h = Math.floor(e[1] / 3600000);
      const m = Math.floor((e[1] % 3600000) / 60000);
      return `${medals[i] || `\`${String(i + 1).padStart(2, '0')}\``}  **${member?.displayName || 'Inconnu'}**  —  ${h}h ${m}m`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Top 10 Vocal')
      .setDescription(lines.length ? lines.join('\n') : '> Aucune donnee.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Vocal'));
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Top vocal:', e.message); }
}

// ══ LOGS VOC ══
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const logCh = newState.guild.channels.cache.get(IDS.LOG_VOC);
    const member = newState.member;
    if (!oldState.channelId && newState.channelId) {
      vocJoin.set(member.id, Date.now());
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`${member.displayName} a rejoint <#${newState.channelId}>`).setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) { vocTime.set(member.id, (vocTime.get(member.id) || 0) + (Date.now() - join)); vocJoin.delete(member.id); }
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${member.displayName} a quitte <#${oldState.channelId}>`).setTimestamp()] });
    } else if (oldState.channelId !== newState.channelId) {
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setDescription(`${member.displayName} : <#${oldState.channelId}> → <#${newState.channelId}>`).setTimestamp()] });
    }
    if (!oldState.serverMute && newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${member.displayName} a ete mute vocal`).setTimestamp()] });
    }
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ LOGS MSG SUPPRIME ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (logCh && message.content) {
    logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Message supprime').setDescription(`Auteur : ${message.author?.tag}\nSalon : <#${message.channel.id}>\nContenu : ${message.content.slice(0, 1000)}`).setTimestamp()] });
  }
});

// ══ LOGS ROLES ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
    if (!logCh) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`${newMember.displayName} a recu **${added.first()?.name}**`).setTimestamp()] });
    if (removed.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`${newMember.displayName} a perdu **${removed.first()?.name}**`).setTimestamp()] });
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild = interaction.guild;

    // BOUTONS
    if (interaction.isButton()) {
      // Roles
      const roleMap = { role_homme: IDS.ROLE_HOMME, role_femme: IDS.ROLE_FEMME, role_mineur: IDS.ROLE_MINEUR, role_majeur: IDS.ROLE_MAJEUR };
      if (roleMap[interaction.customId]) {
        const roleId = roleMap[interaction.customId];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role);
          return interaction.reply({ content: `Role **${role.name}** retire !`, ephemeral: true });
        } else {
          await member.roles.add(role);
          return interaction.reply({ content: `Role **${role.name}** ajoute !`, ephemeral: true });
        }
      }

      // Jeux
      const jeuxMap = { jeux_coins: IDS.ROLE_COINS, jeux_mudae: IDS.ROLE_MUDAE, jeux_opw: IDS.ROLE_OPW };
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
      const ticketTypes = { ticket_question: 'Question', ticket_abus: 'Abus / Probleme', ticket_modo: 'Devenir Moderateur' };
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
        const embed = new EmbedBuilder()
          .setColor(COLOR)
          .setAuthor({ name: 'Naytawa — Support', iconURL: guild.iconURL({ dynamic: true }) })
          .setTitle(`Ticket — ${type}`)
          .setDescription(`Bonjour ${member} !\nUn membre du staff va prendre en charge ta demande.\n\nType : ${type}\nCree le : <t:${Math.floor(Date.now() / 1000)}:F>`)
          .setFooter({ text: 'Naytawa • Clique sur Fermer quand c\'est resolu.' })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
        );
        await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket cree : ${ticketChannel}`, ephemeral: true });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Nouveau ticket').setDescription(`Par : ${member.user.tag}\nType : ${type}`).setTimestamp()] });
        return;
      }

      // Fermer ticket
      if (interaction.customId === 'ticket_fermer') {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par ${member}\nSuppression dans 5 secondes...`).setTimestamp()] });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par : ${member.user.tag}`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      // Plainte ouvrir
      if (interaction.customId === 'plainte_ouvrir') {
        const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('Plainte anonyme');
        const input = new TextInputBuilder()
          .setCustomId('plainte_texte')
          .setLabel('Decris ta plainte en detail')
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
      await interaction.editReply({ content: 'Plainte transmise anonymement aux hauts grades !' });
      return;
    }

  } catch (e) { console.error('Interaction:', e.message); }
});

client.login(process.env.DISCORD_TOKEN);
