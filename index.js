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

// ══ READY ══
client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  updateStats();
  setInterval(updateStats, 60000);
  setInterval(() => updateTopVoc(), 300000);
});

// ══ STATS AUTO ══
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
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n📊  STATISTIQUES DU SERVEUR\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription('> Statistiques mises à jour en temps réel.')
      .addFields(
        { name: '👥 Membres', value: `\`\`\`${total}\`\`\``, inline: true },
        { name: '🟢 En ligne', value: `\`\`\`${online}\`\`\``, inline: true },
        { name: '🎧 En vocal', value: `\`\`\`${voc}\`\`\``, inline: true },
        { name: '💎 Boosts', value: `\`\`\`${boosts}\`\`\``, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: '• Mise à jour automatique toutes les minutes' });
    const msgs = await salon.messages.fetch({ limit: 5 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds.length);
    if (ex) await ex.edit({ embeds: [embed] });
    else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ BIENVENUE + AUTO ROLE ══
client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`✨ Bienvenue sur le serveur !`)
      .setDescription(`> Bienvenue à toi ${member} ! Nous sommes ravis de t'accueillir parmi nous 💖\n\n📜 Lis le règlement\n🎭 Choisis tes rôles\n🎮 Profite du serveur !`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp()
      .setFooter({ text: `Membre #${member.guild.memberCount}` });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Bienvenue:', e.message); }
});

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 10 === 0) updateTopMessages(message.guild).catch(() => {});
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PING
  if (cmd === 'ping') {
    const m = await message.reply('🏓 Calcul...');
    await m.edit(`🏓 **Pong !** Latence : \`${m.createdTimestamp - message.createdTimestamp}ms\``);
  }

  // HELP
  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n📋  COMMANDES DU BOT\n━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        { name: '🛡️ Modération', value: '`-mute @user <min>` `-unmute @user`\n`-ban @user <raison>` `-kick @user`\n`-warn @user <raison>` `-clear <1-100>`' },
        { name: '📊 Information', value: '`-ping` `-avatar [@user]`' },
        { name: '⚙️ Panels (Admin)', value: '`-panel reglement`\n`-panel roles`\n`-panel tickets`\n`-panel jeux`\n`-panel top`\n`-panel plainte`' },
      )
      .setFooter({ text: `Préfixe : ${PREFIX}` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  }

  // CLEAR
  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ Permission refusée.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('❌ Nombre entre 1 et 100.');
    await message.channel.bulkDelete(n + 1, true);
    const m = await message.channel.send(`✅ **${n}** messages supprimés.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('🗑️ Clear').setDescription(`**Modérateur :** ${message.author.tag}\n**Salon :** <#${message.channel.id}>\n**Quantité :** ${n} messages`).setTimestamp()] });
  }

  // BAN
  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    await target.ban({ reason });
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔨 Bannissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔨 Ban').setDescription(`**Banni :** ${target.user.tag}\n**Par :** ${message.author.tag}\n**Raison :** ${reason}`).setTimestamp()] });
  }

  // KICK
  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    await target.kick(reason);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('👢 Expulsion').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('👢 Kick').setDescription(`**Expulsé :** ${target.user.tag}\n**Par :** ${message.author.tag}\n**Raison :** ${reason}`).setTimestamp()] });
  }

  // WARN
  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    const w = warns.get(target.id) || [];
    w.push({ reason, by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('⚠️ Avertissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}\n**Total warns :** ${w.length}`).setTimestamp()] });
    try { await target.send(`⚠️ Tu as reçu un avertissement sur **${message.guild.name}**\n**Raison :** ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('⚠️ Warn').setDescription(`**Averti :** ${target.user.tag}\n**Par :** ${message.author.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}`).setTimestamp()] });
  }

  // MUTE
  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    await target.timeout(duree * 60 * 1000);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('🔇 Mute').setDescription(`**Membre :** ${target.user.tag}\n**Durée :** ${duree} minutes`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('🔇 Mute').setDescription(`**Muté :** ${target.user.tag}\n**Par :** ${message.author.tag}\n**Durée :** ${duree} min`).setTimestamp()] });
  }

  // UNMUTE
  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('🔊 Unmute').setDescription(`**Membre :** ${target.user.tag} a été démuté.`).setTimestamp()] });
  }

  // AVATAR
  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`🖼️ Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }

  // PANEL
  if (cmd === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ Permission refusée.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement') await sendPanelReglement(message.guild);
    else if (type === 'roles') await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'jeux') await sendPanelJeux(message.guild);
    else if (type === 'top') { await sendTopMessages(message.guild); await sendTopVoc(message.guild); }
    else if (type === 'plainte') await sendPanelPlainte(message.guild);
    else return message.reply('❌ Types dispo : `reglement` `roles` `tickets` `jeux` `top` `plainte`');
    await message.react('✅');
  }
});

// ══ PANEL RÈGLEMENT ══
async function sendPanelReglement(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
    if (!salon) { console.log('Salon reglement introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n📜  RÈGLEMENT DU SERVEUR\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription([
        '> Bienvenue sur notre serveur ! Merci de prendre le temps de lire ces règles.',
        '',
        '**` 01 `** 🤝  Respectez chaque membre sans exception.',
        '**` 02 `** 🚫  Toute forme de discrimination est interdite.',
        '**` 03 `** 💬  Le spam, flood et publicité non autorisée sont prohibés.',
        '**` 04 `** 🔞  Aucun contenu NSFW en dehors des salons dédiés.',
        '**` 05 `** 🎙️  Comportement correct obligatoire en vocal.',
        '**` 06 `** ⚖️  Les décisions du staff sont définitives.',
        '**` 07 `** 🔗  Aucun lien suspect ou malveillant.',
        '**` 08 `** 🎭  Une seule identité par personne.',
        '',
        '*En restant sur ce serveur, tu acceptes l\'ensemble de ces règles.*',
      ].join('\n'))
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
      .setFooter({ text: '• Tout manquement entraîne une sanction adaptée.' });
    await salon.send({ embeds: [embed] });
    console.log('Panel reglement envoyé !');
  } catch (e) { console.error('Erreur panel reglement:', e.message); }
}

// ══ PANEL RÔLES ══
async function sendPanelRoles(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ROLES);
    if (!salon) { console.log('Salon roles introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n🎭  CHOISIS TES RÔLES\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription('> Sélectionne tes rôles en cliquant sur les boutons ci-dessous.\n> Clique une seconde fois pour retirer un rôle.')
      .addFields(
        { name: '⚧️ Genre', value: '`👨 Homme` `👩 Femme`', inline: true },
        { name: '🔞 Âge', value: '`🧒 Mineur` `🔞 Majeur`', inline: true },
      )
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: '• Un seul rôle par catégorie recommandé.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('role_homme').setLabel('👨 Homme').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('role_femme').setLabel('👩 Femme').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('role_mineur').setLabel('🧒 Mineur').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('role_majeur').setLabel('🔞 Majeur').setStyle(ButtonStyle.Success),
    );
    await salon.send({ embeds: [embed], components: [row] });
    console.log('Panel roles envoyé !');
  } catch (e) { console.error('Erreur panel roles:', e.message); }
}

// ══ PANEL JEUX ══
async function sendPanelJeux(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ACCES_JEUX);
    if (!salon) { console.log('Salon jeux introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n🎮  ACCÈS RAPIDES\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription('> Clique sur un bouton pour activer ou désactiver l\'accès à un environnement de jeu.')
      .addFields(
        { name: '🪙 Coins', value: 'Accès au salon Coins', inline: true },
        { name: '🎴 Mudae', value: 'Accès au salon Mudae', inline: true },
        { name: '⚔️ OPW', value: 'Accès au salon OPW', inline: true },
      )
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: '• Clique une seconde fois pour retirer l\'accès.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('jeux_coins').setLabel('🪙 Accès Coins').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('jeux_mudae').setLabel('🎴 Accès Mudae').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('jeux_opw').setLabel('⚔️ Accès OPW').setStyle(ButtonStyle.Success),
    );
    await salon.send({ embeds: [embed], components: [row] });
    console.log('Panel jeux envoyé !');
  } catch (e) { console.error('Erreur panel jeux:', e.message); }
}

// ══ PANEL TICKETS ══
async function sendPanelTickets(guild) {
  try {
    const salonRegles = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
    if (salonRegles) {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n📋  RÈGLES DES TICKETS\n━━━━━━━━━━━━━━━━━━━━━━')
        .setDescription([
          '> Avant d\'ouvrir un ticket, merci de respecter ces règles.',
          '',
          '**` ✗ `**  Pas de faux tickets ou trolls',
          '**` ✗ `**  Pas d\'insultes envers le staff',
          '**` ✗ `**  Un seul ticket par problème',
          '**` ✓ `**  Sois poli et respectueux',
          '**` ✓ `**  Explique clairement ta situation',
          '**` ✓ `**  Patiente, le staff répond dès que possible',
          '',
          '*Tout abus entraînera une sanction immédiate.*',
        ].join('\n'))
        .setFooter({ text: '• Le staff est là pour t\'aider.' });
      await salonRegles.send({ embeds: [embed] });
    }
    const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
    if (salonPanel) {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n🎫  OUVRIR UN TICKET\n━━━━━━━━━━━━━━━━━━━━━━')
        .setDescription('> Sélectionne la catégorie correspondant à ta demande.\n> Un membre du staff prendra en charge ton ticket rapidement.')
        .addFields(
          { name: '❓ Question', value: 'Une question générale', inline: true },
          { name: '⚠️ Abus / Problème', value: 'Signaler un abus', inline: true },
          { name: '🛡️ Devenir Modérateur', value: 'Candidature staff', inline: true },
        )
        .setImage('https://cdn.discordapp.com/attachments/1505586853120839925/1506023355558531082/4852aeedde73d6eac84f075c6b9c4ce6.gif?ex=6a0cc10c&is=6a0b6f8c&hm=946656d43cb7fe32da993915734a39f5fbd9e9c45c42c4abcfb590d4847f7205&')
        .setFooter({ text: '• Respectez les règles des tickets.' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_question').setLabel('❓ Question').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_abus').setLabel('⚠️ Abus / Problème').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_modo').setLabel('🛡️ Devenir Modérateur').setStyle(ButtonStyle.Success),
      );
      await salonPanel.send({ embeds: [embed], components: [row] });
    }
    console.log('Panel tickets envoyé !');
  } catch (e) { console.error('Erreur panel tickets:', e.message); }
}

// ══ PANEL PLAINTE ══
async function sendPanelPlainte(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_PLAINTE);
    if (!salon) { console.log('Salon plainte introuvable'); return; }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n⚖️  PLAINTE ANONYME\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription([
        '> Tu souhaites signaler un comportement inapproprié de la part d\'un membre du staff ?',
        '',
        '**Comment ça fonctionne ?**',
        '**` 1 `**  Clique sur le bouton ci-dessous',
        '**` 2 `**  Écris ta plainte dans le formulaire',
        '**` 3 `**  Ta plainte est transmise **anonymement** aux hauts grades',
        '',
        '*Ton identité ne sera jamais révélée.*',
      ].join('\n'))
      .setFooter({ text: '• Confidentialité garantie.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('plainte_ouvrir').setLabel('📝 Déposer une plainte').setStyle(ButtonStyle.Danger),
    );
    await salon.send({ embeds: [embed], components: [row] });
    console.log('Panel plainte envoyé !');
  } catch (e) { console.error('Erreur panel plainte:', e.message); }
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
      return `${medals[i] || `**\`${String(i + 1).padStart(2, '0')}\`**`}  ${member?.displayName || 'Inconnu'}  —  **${e[1].toLocaleString()}** messages`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n💬  TOP 10 MESSAGES\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription(lines.length ? lines.join('\n') : '> Aucune donnée pour le moment.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
      .setTimestamp()
      .setFooter({ text: '• Mis à jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 5 });
    const ex = msgs.find(m => m.author.id === client.user.id);
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
      return `${medals[i] || `**\`${String(i + 1).padStart(2, '0')}\`**`}  ${member?.displayName || 'Inconnu'}  —  **${h}h ${m}m**`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n🎧  TOP 10 VOCAL\n━━━━━━━━━━━━━━━━━━━━━━')
      .setDescription(lines.length ? lines.join('\n') : '> Aucune donnée pour le moment.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506026866476322966/4c37ad1ea38200cbda5c29fa12a86cfd.gif?ex=6a0cc451&is=6a0b72d1&hm=687256104ad7485ff027cee108268299c2e17a7ff406277a9c96072d2371e257&')
      .setTimestamp()
      .setFooter({ text: '• Mis à jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 5 });
    const ex = msgs.find(m => m.author.id === client.user.id);
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
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`🎙️ **${member.displayName}** a rejoint <#${newState.channelId}>`).setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) { vocTime.set(member.id, (vocTime.get(member.id) || 0) + (Date.now() - join)); vocJoin.delete(member.id); }
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`🚪 **${member.displayName}** a quitté <#${oldState.channelId}>`).setTimestamp()] });
    } else if (oldState.channelId !== newState.channelId) {
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setDescription(`🔄 **${member.displayName}** : <#${oldState.channelId}> → <#${newState.channelId}>`).setTimestamp()] });
    }
    if (!oldState.serverMute && newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`🔇 **${member.displayName}** a été mute en vocal`).setTimestamp()] });
    }
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ LOGS MSG SUPPRIMÉ ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (logCh && message.content) {
    logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🗑️ Message supprimé').setDescription(`**Auteur :** ${message.author?.tag}\n**Salon :** <#${message.channel.id}>\n**Contenu :** ${message.content.slice(0, 1000)}`).setTimestamp()] });
  }
});

// ══ LOGS RÔLES ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
    if (!logCh) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setDescription(`➕ **${newMember.displayName}** a reçu le rôle **${added.first()?.name}**`).setTimestamp()] });
    if (removed.size > 0) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setDescription(`➖ **${newMember.displayName}** a perdu le rôle **${removed.first()?.name}**`).setTimestamp()] });
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    const member = interaction.member;
    const guild = interaction.guild;

    // Rôles genre/âge
    const roleMap = { role_homme: IDS.ROLE_HOMME, role_femme: IDS.ROLE_FEMME, role_mineur: IDS.ROLE_MINEUR, role_majeur: IDS.ROLE_MAJEUR };
    if (roleMap[interaction.customId]) {
      const roleId = roleMap[interaction.customId];
      const role = guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: '❌ Rôle introuvable.', ephemeral: true });
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        return interaction.reply({ content: `✅ Rôle **${role.name}** retiré !`, ephemeral: true });
      } else {
        await member.roles.add(role);
        return interaction.reply({ content: `✅ Rôle **${role.name}** ajouté !`, ephemeral: true });
      }
    }

    // Accès jeux
    const jeuxMap = { jeux_coins: IDS.ROLE_COINS, jeux_mudae: IDS.ROLE_MUDAE, jeux_opw: IDS.ROLE_OPW };
    if (jeuxMap[interaction.customId]) {
      const roleId = jeuxMap[interaction.customId];
      const role = guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: '❌ Rôle introuvable.', ephemeral: true });
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role);
        return interaction.reply({ content: `✅ Accès **${role.name}** désactivé !`, ephemeral: true });
      } else {
        await member.roles.add(role);
        return interaction.reply({ content: `✅ Accès **${role.name}** activé !`, ephemeral: true });
      }
    }

    // Tickets
    const ticketTypes = { ticket_question: '❓ Question', ticket_abus: '⚠️ Abus / Problème', ticket_modo: '🛡️ Devenir Modérateur' };
    if (ticketTypes[interaction.customId]) {
      const type = ticketTypes[interaction.customId];
      const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      const existing = guild.channels.cache.find(c => c.name === `ticket-${safeName}` && c.parentId === IDS.CAT_TICKETS);
      if (existing) return interaction.reply({ content: '❌ Tu as déjà un ticket ouvert !', ephemeral: true });
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
        .setTitle(`━━━━━━━━━━━━━━━━━━━━━━\n🎫  TICKET — ${type}\n━━━━━━━━━━━━━━━━━━━━━━`)
        .setDescription(`> Bonjour ${member} !\n> Un membre du staff va prendre en charge ton ticket rapidement.\n\n**Type :** ${type}\n**Créé le :** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setFooter({ text: '• Clique sur Fermer quand ton problème est résolu.' })
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_fermer').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger),
      );
      await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ton ticket a été créé : ${ticketChannel}`, ephemeral: true });
      const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('🎫 Nouveau ticket').setDescription(`**Créé par :** ${member.user.tag}\n**Type :** ${type}\n**Salon :** ${ticketChannel}`).setTimestamp()] });
      return;
    }

    // Fermer ticket
    if (interaction.customId === 'ticket_fermer') {
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔒 Ticket fermé').setDescription(`> Fermé par ${member}\n> Suppression dans 5 secondes...`).setTimestamp()] });
      const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('🔒 Ticket fermé').setDescription(`**Fermé par :** ${member.user.tag}\n**Salon :** ${interaction.channel.name}`).setTimestamp()] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }

    // Plainte - ouvrir modal
    if (interaction.customId === 'plainte_ouvrir') {
      const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('📝 Plainte anonyme');
      const input = new TextInputBuilder()
        .setCustomId('plainte_texte')
        .setLabel('Décris ta plainte en détail')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(1000)
        .setPlaceholder('Explique clairement la situation, qui est concerné et quand c\'est arrivé...');
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    // Plainte - soumission
    if (interaction.isModalSubmit() && interaction.customId === 'plainte_modal') {
      const texte = interaction.fields.getTextInputValue('plainte_texte');
      const salonStaff = guild.channels.cache.get(IDS.SALON_PLAINTE_STAFF);
      if (salonStaff) {
        const embed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('━━━━━━━━━━━━━━━━━━━━━━\n⚖️  NOUVELLE PLAINTE ANONYME\n━━━━━━━━━━━━━━━━━━━━━━')
          .setDescription(`> **Contenu de la plainte :**\n\n${texte}`)
          .setTimestamp()
          .setFooter({ text: '• Identité de l\'auteur confidentielle.' });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('plainte_voc').setLabel('📞 Convoquer en vocal').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('plainte_derank').setLabel('⬇️ Dérank').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('plainte_blacklist').setLabel('🚫 Blacklist staff').setStyle(ButtonStyle.Danger),
        );
        await salonStaff.send({ embeds: [embed], components: [row] });
      }
      await interaction.reply({ content: '✅ Ta plainte a été transmise anonymement aux hauts grades !', ephemeral: true });
      return;
    }

  } catch (e) { console.error('Interaction:', e.message); }
});

client.login(process.env.DISCORD_TOKEN);
