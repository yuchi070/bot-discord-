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
  SALON_TOP_MSG:         '1505541388622762084',
  SALON_TOP_VOC:         '1505541364182683849',
  SALON_BIENVENUE:       '1505586853120839925',
  SALON_ACCES_JEUX:      '1505688303566065744',
  SALON_TICKET_REGLES:   '1505541456234807316',
  SALON_TICKET_PANEL:    '1505541456419618856',
  SALON_AUTO_REACT:      '1505541372436943101',
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
  ROLE_NAYTAWA:          '1506332594185437375',
  CAT_TICKETS:           '1505541035479138434',
  LOG_MSG:               '1505541550203998330',
  LOG_TICKET:            '1505541540557361353',
  LOG_VOC:               '1505541558177497108',
  LOG_ROLE:              '1505541512837070979',
  LOG_MOD:               '1505541549335904266',
};

const GIF_TOP = 'https://media.discordapp.net/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&width=398&height=225&';
const GIF_TICKET_REGLES = 'https://cdn.discordapp.com/attachments/1505541381198975036/1506291397123112980/c84fb740471d58ba9597ace28969d490.gif?ex=6a0dbaae&is=6a0c692e&hm=a64bffaab3e72cf9a6f0864ed5e7478f810410eae34f542976fec30352fb0980&';

// ══ DONNÉES ══
const messageCount = new Map();
const vocTime = new Map();
const vocJoin = new Map();
const warns = new Map();
const inviteTracker = new Map();
let censureActif = true;
let botPingCooldown = null;
let botPingStage = 0;

// ══ MOTS INTERDITS ══
const MOTS_INTERDITS = [
  // Insultes directes
  'ntm','nique ta mère','nique ta mere','ntm','fdp','fils de pute','pd','pute','salope',
  'connard','connasse','enculé','enculer','encule','batard','bâtard','tbm','ta mère','ta mere',
  'fils de','va te faire','ftg','tg','ferme ta gueule','ta gueule','casse toi','cassé toi',
  'trdc','trbl','bz','suce','sucer','bite','baise','baiser','cul','chier','merde','putain',
  'abrutit','idiot','imbécile','imbecile','crétin','cretin','débile','debile','con','conne',
  // Contournements courants
  'n1que','n!que','niq','nik','n-t-m','f.d.p','f-d-p','s4lope','s@lope','c0nnard',
  'enc*lé','enc*le','b1te','put1n','put@in','sa1ope','puta1n','putaiiin','ptain',
  // Violence et auto-mutilation
  'tue toi','tue-toi','suicide','suicider','ouvre toi les veines','ouvres tes veines',
  'crève','crever','va mourir','meurs','fais toi du mal','coupe toi','pendé toi',
  'pends toi','défenestre','défenestrer','jette toi','saute par','avale des cachets',
  'surdose','overdose','blesser toi','blesse toi',
  // Contenu porno/sexuel explicite
  'porn','porno','pornographie','xxx','xvideos','xnxx','pornhub','redtube','youporn',
  'branlette','branler','masturber','masturbation','ejaculer','éjaculer','ejaculation',
  'orgasme','penetrer','pénétrer','sodomie','sodomiser','fellation','cunnilingus',
  'partouze','gangbang','inceste','pédophile','pedophile',
];

function contientMotInterdit(texte) {
  if (!censureActif) return null;
  const t = texte.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const tOriginal = texte.toLowerCase();
  for (const mot of MOTS_INTERDITS) {
    const m = mot.toLowerCase();
    if (tOriginal.includes(m) || t.includes(m.replace(/[^a-z0-9\s]/g, ''))) {
      return mot;
    }
  }
  return null;
}

// ══ READY ══
client.once('ready', async () => {
  console.log(`Bot connecte : ${client.user.tag}`);
  // Tracker invitations
  for (const [, guild] of client.guilds.cache) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) inviteTracker.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
  }
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
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&')
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

// ══ NOTE /naytawa ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Détection note Discord contenant /naytawa ou /Naytawa
    const oldNote = oldMember.nickname || '';
    const newNote = newMember.nickname || '';
    if (!oldNote.toLowerCase().includes('/naytawa') && newNote.toLowerCase().includes('/naytawa')) {
      const role = newMember.guild.roles.cache.get(IDS.ROLE_NAYTAWA);
      if (role && !newMember.roles.cache.has(IDS.ROLE_NAYTAWA)) {
        await newMember.roles.add(role);
        await newMember.send(`Role Naytawa ajoute automatiquement !`).catch(() => {});
      }
    }

    if (!oldMember.premiumSince && newMember.premiumSince) {
      const salon = newMember.guild.channels.cache.get(IDS.SALON_BIENVENUE);
      if (salon) await salon.send(`Merci ${newMember} pour ton boost ! 💎`);
    }

    const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
    if (!logCh) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) {
      const role = added.first();
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Role ajoute').setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Role :** ${role?.name}\n**Roles actuels :** ${newMember.roles.cache.filter(r => r.id !== newMember.guild.id).map(r => r.name).join(', ')}`).setTimestamp()] });
    }
    if (removed.size > 0) {
      const role = removed.first();
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Role retire').setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Role :** ${role?.name}`).setTimestamp()] });
    }
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Réponse quand on parle au bot (mention)
  if (message.mentions.has(client.user) && !message.content.startsWith(PREFIX)) {
    const now = Date.now();
    // Cooldown 2h
    if (botPingCooldown && (now - botPingCooldown) < 2 * 60 * 60 * 1000) {
      return; // Dans le cooldown, ignore
    }

    if (botPingStage === 0) {
      await message.reply('Ntm fdp');
      botPingStage = 1;
    } else if (botPingStage === 1) {
      await message.reply('Ftg frr cplc');
      botPingStage = 2;
    } else {
      await message.reply('sayez je parle plus t\'es moche + ta pas d\'avenir tu clc a un bot fdp ntm va bz ton père sah trdc trbl enfant de merde suce ma bite sale pute j\'espère tu te réveille pas enculer');
      // Mute 1 min
      try {
        await message.member.timeout(60 * 1000, 'A ping le bot trop de fois');
      } catch {}
      // MP
      try {
        await message.author.send('prend le pas personnellement on me clc a me ping h24 désolé de t\'avoir insulté et mute');
      } catch {}
      botPingStage = 0;
      botPingCooldown = now; // Reset cooldown
    }
    return;
  }

  // Auto react coeur
  if (message.channel.id === IDS.SALON_AUTO_REACT) {
    await message.react('❤️').catch(() => {});
  }

  // ══ ANTI-INSULTES ══
  const motTrouve = contientMotInterdit(message.content);
  if (motTrouve) {
    try {
      await message.delete();
      const userId = message.author.id;
      const w = warns.get(userId) || [];

      let duree, raison;
      if (w.filter(x => x.type === 'insulte').length === 0) {
        duree = 15; raison = '1ere infraction — langage inapproprie';
      } else if (w.filter(x => x.type === 'insulte').length === 1) {
        duree = 25; raison = '2eme infraction — recidive';
      } else {
        duree = 30; raison = '3eme infraction ou plus — recidive grave';
      }

      w.push({ type: 'insulte', mot: motTrouve, date: new Date().toLocaleDateString('fr-FR'), duree });
      warns.set(userId, w);

      await message.member.timeout(duree * 60 * 1000, raison).catch(() => {});

      const muteEnd = Math.floor((Date.now() + duree * 60 * 1000) / 1000);

      try {
        await message.author.send([
          `Tu as ete mute sur **Naytawa** pour ${duree} minutes.`,
          ``,
          `**Raison :** Langage inapproprie (${motTrouve})`,
          `**Duree :** ${duree} minutes`,
          `**Fin du mute :** <t:${muteEnd}:F>`,
          `**Infraction numero :** ${w.filter(x => x.type === 'insulte').length}`,
          ``,
          `Merci de respecter les regles du serveur.`,
        ].join('\n'));
      } catch {}

      const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
        .setTitle('Anti-insultes — Mute automatique')
        .setDescription(`**Membre :** ${message.author.tag} (${message.author.id})\n**Salon :** <#${message.channel.id}>\n**Mot detecte :** ||${motTrouve}||\n**Message supprime :** ||${message.content.slice(0, 500)}||\n**Duree :** ${duree} minutes\n**Fin :** <t:${muteEnd}:F>\n**Infraction :** ${w.filter(x => x.type === 'insulte').length}`)
        .setTimestamp()] });

      // Avertissement visible dans le salon (s'efface après 5s)
      const warn = await message.channel.send(`${message.author} ton message a ete supprime pour langage inapproprie. Tu es mute ${duree} minutes.`);
      setTimeout(() => warn.delete().catch(() => {}), 5000);

    } catch (e) { console.error('Anti-insulte:', e.message); }
    return;
  }

  // Comptage messages
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 5 === 0) updateTopMessages(message.guild).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PING — réponse ftg
  if (cmd === 'ping') {
    const m = await message.reply(`ftg laisse moi tranquille.....ahhh mon prefixe c'est \`${PREFIX}\` !`);
  }

  // TEST
  if (cmd === 'test') {
    await message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Bot operationnel').setDescription(`Tous les systemes sont actifs.\n**Anti-insultes :** ${censureActif ? 'Actif' : 'Desactive'}\n**Uptime :** ${Math.floor(client.uptime / 1000)}s`).setTimestamp()] });
  }

  // HELP
  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Commandes Naytawa', iconURL: client.user.displayAvatarURL() })
      .addFields(
        { name: 'Moderation', value: '`-mute @user <min>` `-unmute @user`\n`-ban @user <raison>` `-kick @user`\n`-warn @user <raison>` `-clear <1-100>`' },
        { name: 'Info', value: '`-ping` `-avatar [@user]` `-profil [@user]`' },
        { name: 'Panels', value: '`-panel reglement` `-panel roles`\n`-panel tickets` `-panel jeux`\n`-panel top` `-panel partenariat`\n`-make panel <titre> <desc>`' },
        { name: 'Config', value: '`-censure on/off` `-backup` `-test`' },
      )
      .setFooter({ text: `Prefixe : ${PREFIX}` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  }

  // CENSURE ON/OFF
  if (cmd === 'censure') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusee.');
    const etat = args[0]?.toLowerCase();
    if (etat === 'on') { censureActif = true; message.reply('Anti-insultes active.'); }
    else if (etat === 'off') { censureActif = false; message.reply('Anti-insultes desactive.'); }
    else message.reply(`Anti-insultes : **${censureActif ? 'Actif' : 'Desactive'}**. Usage : \`-censure on/off\``);
  }

  // PROFIL / STATS
  if (cmd === 'profil') {
    const target = message.mentions.members.first() || message.member;
    const msgs = messageCount.get(target.id) || 0;
    const voc = vocTime.get(target.id) || 0;
    const h = Math.floor(voc / 3600000);
    const m2 = Math.floor((voc % 3600000) / 60000);
    const w = warns.get(target.id) || [];
    const invites = 0; // tracker simplifié

    // Position top messages
    const sortedMsg = [...messageCount.entries()].sort((a, b) => b[1] - a[1]);
    const posMsg = sortedMsg.findIndex(e => e[0] === target.id) + 1;

    // Position top vocal
    const sortedVoc = [...vocTime.entries()].sort((a, b) => b[1] - a[1]);
    const posVoc = sortedVoc.findIndex(e => e[0] === target.id) + 1;

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: `Profil de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Messages', value: `**${msgs.toLocaleString()}**\nClassement : #${posMsg || '?'}`, inline: true },
        { name: 'Temps vocal', value: `**${h}h ${m2}m**\nClassement : #${posVoc || '?'}`, inline: true },
        { name: 'Avertissements', value: `**${w.length}** warn(s)`, inline: true },
        { name: 'Invitations', value: `**${invites}** invites`, inline: true },
        { name: 'Sur le serveur depuis', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Roles', value: target.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(', ').slice(0, 500) || 'Aucun', inline: false },
      )
      .setFooter({ text: 'Naytawa • Casier du membre' })
      .setTimestamp();

    if (w.length > 0) {
      embed.addFields({ name: 'Historique warns', value: w.slice(-5).map((x, i) => `${i + 1}. ${x.reason || x.type} (${x.date})`).join('\n') });
    }

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
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Clear').setDescription(`**Par :** ${message.author.tag}\n**Salon :** <#${message.channel.id}>\n**Quantite :** ${n}`).setTimestamp()] });
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
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ban').setDescription(`**Banni :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Raison :** ${reason}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
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
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Kick').setDescription(`**Expulse :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Raison :** ${reason}`).setTimestamp()] });
  }

  // WARN
  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ reason, type: 'manuel', by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Warn').setDescription(`**Averti :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}`).setTimestamp()] });
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
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`**Membre :** ${target.user.tag}\n**Duree :** ${duree} min\n**Fin :** <t:${muteEnd}:R>`).setTimestamp()] });
    try { await target.send(`Tu as ete mute ${duree} minutes sur Naytawa.\nRaison : ${reason}\nFin : <t:${muteEnd}:F>`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`**Mute :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Duree :** ${duree} min\n**Fin :** <t:${muteEnd}:F>\n**Raison :** ${reason}`).setTimestamp()] });
  }

  // UNMUTE
  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`${target.user.tag} a ete demute.`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`**Demute :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}`).setTimestamp()] });
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
    const description = args.slice(2).join(' ') || 'Description.';
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: message.guild.iconURL({ dynamic: true }) }).setTitle(titre).setDescription(description).setTimestamp().setFooter({ text: 'Naytawa' });
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
    await message.reply({ content: 'Backup genere !', files: [attachment] });
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

// ══ PANELS ══
async function sendPanelReglement(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Reglement du serveur')
      .setDescription([
        '> Bienvenue ! Merci de lire et respecter ces regles.',
        '',
        '**` 01 `** Respectez chaque membre.',
        '**` 02 `** Zero discrimination.',
        '**` 03 `** Pas de spam, flood ou pub.',
        '**` 04 `** Contenu NSFW interdit hors salons dedies.',
        '**` 05 `** Bonne conduite en vocal.',
        '**` 06 `** Decisions du staff definitives.',
        '**` 07 `** Aucun lien suspect.',
        '**` 08 `** Une seule identite par personne.',
        '',
        'Conditions : https://discord.com/terms',
        'Regles : https://discord.com/guidelines',
        '',
        '*En restant sur ce serveur, tu acceptes ces regles.*',
      ].join('\n'))
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
      .setFooter({ text: 'Naytawa • Tout manquement entraine une sanction.' });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Panel reglement:', e.message); }
}

async function sendPanelRoles(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ROLES);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Notifications')
      .setDescription([
        '> Choisis les notifications que tu souhaites recevoir.',
        '> Reclique pour desactiver.',
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

async function sendPanelJeux(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ACCES_JEUX);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Acces rapides')
      .setDescription('> Active ou desactive l\'acces a un jeu.\n\n**Coins** — Salon Coins\n**Mudae** — Salon Mudae\n**OPW** — Salon OPW')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('jeux_coins').setLabel('Coins').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('jeux_mudae').setLabel('Mudae').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('jeux_opw').setLabel('OPW').setStyle(ButtonStyle.Success),
    );
    await salon.send({ embeds: [embed], components: [row] });
  } catch (e) { console.error('Panel jeux:', e.message); }
}

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
          '',
          `Creer un ticket : <#${IDS.SALON_TICKET_PANEL}>`,
          '',
          '*Tout abus entraine une sanction.*',
        ].join('\n'))
        .setImage(GIF_TICKET_REGLES)
        .setFooter({ text: 'Naytawa' })] });
    }
    const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
    if (salonPanel) {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Ouvrir un ticket')
        .setDescription([
          '> Choisis la categorie de ta demande.',
          '',
          '**Question** — Question generale',
          '**Abus / Probleme** — Signaler un abus',
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

async function sendPanelPartenariat(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_PARTENARIAT);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Partenariat')
      .setDescription([
        '> Tu souhaites devenir partenaire de Naytawa ?',
        '',
        '**` 01 `** Minimum 100 membres',
        '**` 02 `** Serveur actif',
        '**` 03 `** Pas de contenu illicite',
        '**` 04 `** Avoir un salon partenariat',
        '',
        `Ouvre un ticket dans <#${IDS.SALON_TICKET_PANEL}>`,
      ].join('\n'))
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506232948930908170/1a13c8300696a51f0f7e45d726cce0b3_1.gif?ex=6a0d843f&is=6a0c32bf&hm=1997c636b1907355274fd7dff57e14db10af02cedd35916a902bde86df43a557&')
      .setFooter({ text: 'Naytawa' });
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
    const lines = sorted.map((e, i) => `Top ${i + 1} <@${e[0]}> — ${e[1].toLocaleString()} messages`);
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Top 10 Messages')
      .setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.')
      .setImage(GIF_TOP)
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Messages');
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
      .setImage(GIF_TOP)
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis a jour automatiquement' });
    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Vocal');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
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
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Rejoint vocal').setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${newState.channelId}>\n**Mute :** ${newState.selfMute || newState.serverMute ? 'Oui' : 'Non'}`).setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) {
        const elapsed = Date.now() - join;
        vocTime.set(member.id, (vocTime.get(member.id) || 0) + elapsed);
        vocJoin.delete(member.id);
        const h = Math.floor(elapsed / 3600000);
        const m2 = Math.floor((elapsed % 3600000) / 60000);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Quitte vocal').setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${oldState.channelId}>\n**Temps :** ${h}h ${m2}m`).setTimestamp()] });
      }
    } else if (oldState.channelId !== newState.channelId) {
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Changement vocal').setDescription(`**Membre :** ${member.user.tag}\n**De :** <#${oldState.channelId}>\n**Vers :** <#${newState.channelId}>`).setTimestamp()] });
    }
    if (!oldState.serverMute && newState.serverMute && logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Mute vocal').setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Statut :** Mute par le serveur`).setTimestamp()] });
    if (oldState.serverMute && !newState.serverMute && logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Demute vocal').setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Statut :** N'est plus mute`).setTimestamp()] });
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ LOGS MSG SUPPRIME ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (logCh && message.content) {
    logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Message supprime').setDescription(`**Auteur :** ${message.author?.tag} (${message.author?.id})\n**Salon :** <#${message.channel.id}>\n**Date :** <t:${Math.floor(message.createdTimestamp/1000)}:F>\n**Contenu :**\n${message.content.slice(0, 1000)}`).setTimestamp()] });
  }
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild = interaction.guild;

    if (interaction.isButton()) {
      const notifMap = { notif_partner: IDS.ROLE_NOTIF_PARTNER, notif_sondage: IDS.ROLE_NOTIF_SONDAGE, notif_anim: IDS.ROLE_NOTIF_ANIM, notif_giveaway: IDS.ROLE_NOTIF_GIVEAWAY };
      if (notifMap[interaction.customId]) {
        const roleId = notifMap[interaction.customId];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Notification **${role.name}** desactivee !`, ephemeral: true }); }
        else { await member.roles.add(role); return interaction.reply({ content: `Notification **${role.name}** activee !`, ephemeral: true }); }
      }

      const jeuxMap = { jeux_coins: '1506032267506745435', jeux_mudae: '1506032360917827727', jeux_opw: '1506032309080424531' };
      if (jeuxMap[interaction.customId]) {
        const roleId = jeuxMap[interaction.customId];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Acces **${role.name}** desactive !`, ephemeral: true }); }
        else { await member.roles.add(role); return interaction.reply({ content: `Acces **${role.name}** active !`, ephemeral: true }); }
      }

      const ticketTypes = { ticket_question: 'Question', ticket_abus: 'Abus / Probleme', ticket_modo: 'Devenir Moderateur', ticket_partner: 'Partenariat' };
      if (ticketTypes[interaction.customId]) {
        const type = ticketTypes[interaction.customId];
        const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
        const existing = guild.channels.cache.find(c => c.name === `ticket-${safeName}` && c.parentId === IDS.CAT_TICKETS);
        if (existing) return interaction.reply({ content: 'Tu as deja un ticket ouvert !', ephemeral: true });
        const ticketChannel = await guild.channels.create({
          name: `ticket-${safeName}`, type: ChannelType.GuildText, parent: IDS.CAT_TICKETS,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: IDS.ROLE_TICKET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });
        let extra = interaction.customId === 'ticket_partner' ? '\n\nMerci de fournir :\n- Nom du serveur\n- Lien invitation\n- Nombre membres\n- Raison partenariat' : '';
        const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa — Support', iconURL: guild.iconURL({ dynamic: true }) }).setTitle(`Ticket — ${type}`).setDescription(`Bonjour ${member} !\n\n**Type :** ${type}\n**Cree le :** <t:${Math.floor(Date.now()/1000)}:F>${extra}`).setFooter({ text: 'Naytawa' }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel('Je le prends en charge').setStyle(ButtonStyle.Success),
        );
        await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket cree : ${ticketChannel}`, ephemeral: true });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Nouveau ticket').setDescription(`**Par :** ${member.user.tag} (${member.id})\n**Type :** ${type}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        return;
      }

      if (interaction.customId === 'ticket_prendre') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel(`Pris en charge par ${member.displayName}`).setStyle(ButtonStyle.Success).setDisabled(true),
        );
        await interaction.update({ components: [row] });
        await interaction.channel.send(`Ce ticket est pris en charge par ${member} !`);
        return;
      }

      if (interaction.customId === 'ticket_fermer') {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par ${member}\nSuppression dans 5s...`).setTimestamp()] });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`**Par :** ${member.user.tag} (${member.id})\n**Salon :** ${interaction.channel.name}`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      if (interaction.customId === 'plainte_ouvrir') {
        const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('Plainte anonyme');
        const input = new TextInputBuilder().setCustomId('plainte_texte').setLabel('Decris ta plainte').setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(20).setMaxLength(1000).setPlaceholder('Explique la situation...');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'plainte_modal') {
      await interaction.deferReply({ ephemeral: true });
      const texte = interaction.fields.getTextInputValue('plainte_texte');
      const salonStaff = guild.channels.cache.get('1505541146502500473');
      if (salonStaff) {
        const embed = new EmbedBuilder().setColor('#ed4245').setTitle('Nouvelle plainte anonyme').setDescription(`> Contenu :\n\n${texte}`).setTimestamp().setFooter({ text: 'Identite confidentielle.' });
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
