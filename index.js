const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  AttachmentBuilder
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
    GatewayIntentBits.GuildInvites,
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
  SALON_BIENVENUE:       '1506393454719144087',
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
  ROLE_WL:               '1506580974144720967',
  CAT_TICKETS:           '1505541035479138434',
  LOG_MSG:               '1505541550203998330',
  LOG_TICKET:            '1505541540557361353',
  LOG_VOC:               '1505541558177497108',
  LOG_ROLE:              '1505541512837070979',
  LOG_MOD:               '1505541549335904266',
};

const GIF_TOP = 'https://media.discordapp.net/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif?ex=6a0d839f&is=6a0c321f&hm=0f36d6b96fe74aac88965047d78578cfe090901a48f6d908f1831a95149492a3&width=398&height=225&';
const GIF_TICKET_REGLES = 'https://cdn.discordapp.com/attachments/1505541381198975036/1506291397123112980/c84fb740471d58ba9597ace28969d490.gif';

// ══ DONNÉES ══
const messageCount = new Map();
const vocTime = new Map();
const vocJoin = new Map();
const warns = new Map();
const rolesHistory = new Map();
const inviteTracker = new Map();
const whitelistSet = new Set();
let censureActif = true;
let botPingCooldown = null;
let botPingStage = 0;
const mutedUsers = new Map(); // userId -> { end: timestamp }

// ══ MOTS INTERDITS ══
const MOTS_INTERDITS = [
  'ntm','nique ta mère','nique ta mere','fdp','fils de pute','pute','salope',
  'connard','connasse','enculé','enculer','encule','batard','bâtard','tbm',
  'va te faire','ftg','ferme ta gueule','ta gueule','trdc','trbl','suce',
  'bite','baise','baiser','cul','abrutit','imbécile','imbecile','crétin',
  'cretin','débile','debile',
  'n1que','n!que','niq','nik','n-t-m','f.d.p','f-d-p','s4lope','s@lope',
  'c0nnard','enc*lé','enc*le','b1te','put1n','put@in','sa1ope','puta1n',
  'tue toi','tue-toi','suicide','suicider','ouvre toi les veines',
  'crève','crever','va mourir','meurs','fais toi du mal','coupe toi',
  'pendé toi','pends toi','jette toi','saute par',
  'porn','porno','pornographie','xxx','xvideos','xnxx','pornhub','redtube',
  'youporn','branlette','branler','masturber','ejaculer','éjaculer',
  'sodomie','sodomiser','fellation','partouze','gangbang','inceste',
  'pédophile','pedophile',
];

// Mots qui NE doivent PAS être détectés seuls (contexte)
const FAUX_POSITIFS = [
  'suicide watch','prévention','aide','psychologue','hopital','médecin',
  'santé','maladie','dépression','anxiété','thérapie',
];

function contientMotInterdit(texte) {
  if (!censureActif) return null;
  const t = texte.toLowerCase();

  // Vérifie si c'est un faux positif
  for (const fp of FAUX_POSITIFS) {
    if (t.includes(fp)) return null;
  }

  for (const mot of MOTS_INTERDITS) {
    const m = mot.toLowerCase();
    // Utilise word boundary pour les mots courts pour éviter les faux positifs
    if (m.length <= 4) {
      const regex = new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(t)) return mot;
    } else {
      if (t.includes(m)) return mot;
    }
  }
  return null;
}

// ══ READY ══
client.once('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`);
  for (const [, guild] of client.guilds.cache) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) inviteTracker.set(guild.id, new Map(invites.map(i => [i.code, { uses: i.uses, inviterId: i.inviter?.id }])));
  }
  updateStats();
  setInterval(updateStats, 60000);
  setInterval(() => updateTopVoc(), 300000);
  // Reset mutes expirés
  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of mutedUsers) {
      if (now >= data.end) {
        mutedUsers.delete(userId);
        // Reset stage si 30 min écoulées
        if (botPingStage >= 2) {
          botPingStage = 0;
          botPingCooldown = null;
        }
      }
    }
  }, 60000);
});

// ══ INVITE TRACKER ══
client.on('inviteCreate', invite => {
  const map = inviteTracker.get(invite.guild.id) || new Map();
  map.set(invite.code, { uses: invite.uses, inviterId: invite.inviter?.id });
  inviteTracker.set(invite.guild.id, map);
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
      .setFooter({ text: 'Naytawa • Mise à jour automatique' });
    const msgs = await salon.messages.fetch({ limit: 20 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Statistiques'));
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ BIENVENUE + TRACKER ══
client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (!salon) return;

    // Détection de l'inviteur
    const newInvites = await member.guild.invites.fetch().catch(() => null);
    const oldInvites = inviteTracker.get(member.guild.id) || new Map();
    let inviterId = null;

    if (newInvites) {
      for (const [code, invite] of newInvites) {
        const old = oldInvites.get(code);
        if (old && invite.uses > old.uses) {
          inviterId = invite.inviter?.id;
          break;
        }
      }
      inviteTracker.set(member.guild.id, new Map(newInvites.map(i => [i.code, { uses: i.uses, inviterId: i.inviter?.id }])));
    }

    if (inviterId && inviterId !== member.id) {
      await salon.send(`Bienvenue ${member}, amuse-toi bien avec nous ! 🎉\nMerci <@${inviterId}> d'avoir invité ${member}, fais-lui profiter du serveur ! 💖`);
    } else {
      await salon.send(`Bienvenue ${member}, amuse-toi bien avec nous ! 💖`);
    }
  } catch (e) { console.error('Bienvenue:', e.message); }
});

// ══ LOGS RÔLES + BOOST ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
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
      const hist = rolesHistory.get(newMember.id) || [];
      hist.unshift({ type: 'ajouté', name: role?.name, id: role?.id, date: new Date().toLocaleDateString('fr-FR') });
      if (hist.length > 20) hist.pop();
      rolesHistory.set(newMember.id, hist);
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Rôle ajouté')
        .setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Rôle ajouté :** ${role?.name} (${role?.id})\n**Rôles actuels :** ${newMember.roles.cache.filter(r => r.id !== newMember.guild.id).map(r => r.name).join(', ') || 'Aucun'}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    }
    if (removed.size > 0) {
      const role = removed.first();
      const hist = rolesHistory.get(newMember.id) || [];
      hist.unshift({ type: 'retiré', name: role?.name, id: role?.id, date: new Date().toLocaleDateString('fr-FR') });
      if (hist.length > 20) hist.pop();
      rolesHistory.set(newMember.id, hist);
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
        .setTitle('Rôle retiré')
        .setDescription(`**Membre :** ${newMember.user.tag} (${newMember.id})\n**Rôle retiré :** ${role?.name} (${role?.id})\n**Rôles restants :** ${newMember.roles.cache.filter(r => r.id !== newMember.guild.id).map(r => r.name).join(', ') || 'Aucun'}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    }
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Mention du bot
  if (message.mentions.has(client.user) && !message.content.startsWith(PREFIX)) {
    const now = Date.now();
    if (botPingCooldown && (now - botPingCooldown) < 2 * 60 * 60 * 1000) return;
    if (botPingStage === 0) {
      await message.reply('Ntm fdp');
      botPingStage = 1;
    } else if (botPingStage === 1) {
      await message.reply('Ftg frr cplc');
      botPingStage = 2;
    } else {
      await message.reply('Sayez je parle plus, t\'es moche + t\'as pas d\'avenir, tu clc à un bot fdp ntm va bz ton père sah trdc trbl enfant de merde suce ma bite sale pute j\'espère tu te réveilles pas enculé');
      try { await message.member.timeout(60 * 1000, 'A pingé le bot trop de fois'); } catch {}
      try { await message.author.send('Prends-le pas personnellement, on me clc à me ping h24, désolé de t\'avoir insulté et mute'); } catch {}
      botPingStage = 0;
      botPingCooldown = now;
    }
    return;
  }

  // Auto react coeur
  if (message.channel.id === IDS.SALON_AUTO_REACT) {
    await message.react('❤️').catch(() => {});
  }

  // ══ ANTI-INSULTES ══
  const isWL = message.member?.roles.cache.has(IDS.ROLE_WL) || whitelistSet.has(message.author.id);
  if (!isWL) {
    const motTrouve = contientMotInterdit(message.content);
    if (motTrouve) {
      try {
        await message.delete();
        const userId = message.author.id;
        const w = warns.get(userId) || [];
        const infractions = w.filter(x => x.type === 'insulte').length;

        let duree, raison;
        if (infractions === 0) { duree = 15; raison = '1ère infraction — langage inapproprié'; }
        else if (infractions === 1) { duree = 25; raison = '2ème infraction — récidive'; }
        else { duree = 30; raison = '3ème infraction ou plus — récidive grave'; }

        w.push({ type: 'insulte', mot: motTrouve, raison, date: new Date().toLocaleDateString('fr-FR'), duree, by: 'Auto-modération' });
        warns.set(userId, w);

        await message.member.timeout(duree * 60 * 1000, raison).catch(() => {});
        const muteEnd = Math.floor((Date.now() + duree * 60 * 1000) / 1000);
        mutedUsers.set(userId, { end: Date.now() + duree * 60 * 1000 });

        // Reset après les 30 min si 3ème infraction
        if (infractions >= 2) {
          setTimeout(() => {
            const currentW = warns.get(userId) || [];
            // On garde les warns mais on remet le compteur insultes à 0
            const filteredW = currentW.filter(x => x.type !== 'insulte');
            warns.set(userId, filteredW);
            mutedUsers.delete(userId);
          }, 60 * 60 * 1000); // Reset après 1h
        }

        try {
          await message.author.send([
            `Tu as été mute sur **Naytawa** pour **${duree} minutes**.`,
            ``,
            `**Raison :** Langage inapproprié`,
            `**Mot détecté :** ||${motTrouve}||`,
            `**Durée :** ${duree} minutes`,
            `**Fin du mute :** <t:${muteEnd}:F>`,
            `**Infraction n°:** ${infractions + 1}`,
            ``,
            `Merci de respecter les règles du serveur.`,
          ].join('\n'));
        } catch {}

        const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
          .setTitle('Auto-modération — Mute')
          .setDescription(`**Membre :** ${message.author.tag} (${message.author.id})\n**Salon :** <#${message.channel.id}>\n**Mot détecté :** ||${motTrouve}||\n**Message supprimé :** ||${message.content.slice(0, 500)}||\n**Durée :** ${duree} min\n**Fin :** <t:${muteEnd}:F>\n**Infraction n° :** ${infractions + 1}`)
          .setTimestamp()] });

        const warn = await message.channel.send(`${message.author} ton message a été supprimé pour langage inapproprié. Tu es mute **${duree} minutes**.`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
      } catch (e) { console.error('Anti-insulte:', e.message); }
      return;
    }
  }

  // Comptage messages
  const count = (messageCount.get(message.author.id) || 0) + 1;
  messageCount.set(message.author.id, count);
  if (count % 5 === 0) updateTopMessages(message.guild).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ══ COMMANDES ══

  if (cmd === 'ping') {
    await message.reply(`ftg laisse-moi tranquille.....ahhh mon préfixe c'est \`${PREFIX}\` !`);
  }

  if (cmd === 'naytawa') {
    const role = message.guild.roles.cache.get(IDS.ROLE_NAYTAWA);
    if (!role) return message.reply('Rôle introuvable.');
    if (message.member.roles.cache.has(IDS.ROLE_NAYTAWA)) return message.reply('Tu as déjà ce rôle !');
    await message.member.roles.add(role);
    const m = await message.reply('Rôle Naytawa ajouté !');
    setTimeout(() => m.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }

  if (cmd === 'test') {
    const guild = message.guild;
    await guild.members.fetch();
    const total = guild.memberCount;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const voc = guild.voiceStates.cache.filter(v => v.channelId).size;
    const embed = new EmbedBuilder()
      .setColor('#3ba55c')
      .setTitle('Diagnostic complet — Naytawa Bot')
      .setDescription('Vérification de tous les systèmes en cours...')
      .addFields(
        { name: '🤖 Bot', value: `Connecté en tant que **${client.user.tag}**\nPing WebSocket : **${client.ws.ping}ms**\nUptime : **${Math.floor(client.uptime / 1000)}s**`, inline: false },
        { name: '🛡️ Anti-insultes', value: censureActif ? '✅ Actif' : '❌ Désactivé', inline: true },
        { name: '📊 Serveur', value: `${total} membres • ${online} en ligne • ${voc} en vocal`, inline: true },
        { name: '💾 Données en mémoire', value: `Messages trackés : **${messageCount.size}**\nVocal trackés : **${vocTime.size}**\nWarns actifs : **${warns.size}**\nWhitelist : **${whitelistSet.size}**`, inline: false },
        { name: '📡 Salons configurés', value: [
          `Bienvenue : ${guild.channels.cache.get(IDS.SALON_BIENVENUE) ? '✅' : '❌'}`,
          `Stats : ${guild.channels.cache.get(IDS.SALON_STATS) ? '✅' : '❌'}`,
          `Top MSG : ${guild.channels.cache.get(IDS.SALON_TOP_MSG) ? '✅' : '❌'}`,
          `Top VOC : ${guild.channels.cache.get(IDS.SALON_TOP_VOC) ? '✅' : '❌'}`,
          `Tickets : ${guild.channels.cache.get(IDS.SALON_TICKET_PANEL) ? '✅' : '❌'}`,
          `Logs MOD : ${guild.channels.cache.get(IDS.LOG_MOD) ? '✅' : '❌'}`,
          `Logs VOC : ${guild.channels.cache.get(IDS.LOG_VOC) ? '✅' : '❌'}`,
          `Logs MSG : ${guild.channels.cache.get(IDS.LOG_MSG) ? '✅' : '❌'}`,
        ].join('\n'), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Diagnostic' });
    await message.reply({ embeds: [embed] });
  }

  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa Bot — Commandes', iconURL: client.user.displayAvatarURL() })
      .addFields(
        {
          name: '🛡️ Modération',
          value: [
            '`-ban @user <raison>` — Bannir un membre',
            '`-kick @user <raison>` — Expulser un membre',
            '`-mute @user <min> <raison>` — Muter un membre',
            '`-unmute @user` — Démuter un membre',
            '`-warn @user <raison>` — Avertir un membre',
            '`-unwarn @user <numéro>` — Supprimer un warn',
            '`-warns @user` — Voir les warns',
            '`-clear <1-100>` — Supprimer des messages',
          ].join('\n'),
        },
        {
          name: '⚪ Whitelist censure',
          value: [
            '`-wl @user` — Ajouter à la whitelist',
            '`-unwl @user` — Retirer de la whitelist',
            '`-wllist` — Voir la whitelist',
          ].join('\n'),
        },
        {
          name: '📊 Information',
          value: [
            '`-profil [@user]` — Voir le profil d\'un membre',
            '`-avatar [@user]` — Voir l\'avatar',
            '`-test` — Diagnostic du bot',
          ].join('\n'),
        },
        {
          name: '⚙️ Panels (Admin)',
          value: [
            '`-panel reglement` — Panel règlement',
            '`-panel roles` — Panel notifications',
            '`-panel tickets` — Panel tickets',
            '`-panel jeux` — Panel accès jeux',
            '`-panel top` — Panel top messages/vocal',
            '`-panel partenariat` — Panel partenariat',
            '`-make panel <titre> <desc>` — Panel personnalisé',
          ].join('\n'),
        },
        {
          name: '🔧 Configuration',
          value: [
            '`-censure on/off` — Activer/désactiver l\'anti-insultes',
            '`-backup` — Sauvegarder le serveur',
            '`-naytawa` — Obtenir le rôle Naytawa',
          ].join('\n'),
        },
      )
      .setFooter({ text: `Préfixe : ${PREFIX} • Naytawa Bot` })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  }

  if (cmd === 'censure') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusée.');
    const etat = args[0]?.toLowerCase();
    if (etat === 'on') { censureActif = true; message.reply('Anti-insultes activé.'); }
    else if (etat === 'off') { censureActif = false; message.reply('Anti-insultes désactivé.'); }
    else message.reply(`Anti-insultes : **${censureActif ? 'Actif' : 'Désactivé'}**. Usage : \`-censure on/off\``);
  }

  // WHITELIST
  if (cmd === 'wl') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.add(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.add(role).catch(() => {});
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Whitelist').setDescription(`${target.user.tag} ajouté à la whitelist.\nIl ne sera plus affecté par la censure.`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Whitelist — Ajout').setDescription(`**Membre :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'unwl') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.delete(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.remove(role).catch(() => {});
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Whitelist').setDescription(`${target.user.tag} retiré de la whitelist.`).setTimestamp()] });
  }

  if (cmd === 'wllist') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    if (whitelistSet.size === 0) return message.reply('La whitelist est vide.');
    const lines = [...whitelistSet].map(id => `<@${id}>`).join('\n');
    message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Whitelist censure').setDescription(lines).setTimestamp()] });
  }

  // PROFIL
  if (cmd === 'profil') {
    const target = message.mentions.members.first() || message.member;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: `Profil de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setDescription('Que veux-tu voir ?')
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: 'Naytawa • Profil' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`profil_${target.id}`)
      .setPlaceholder('Choisis ce que tu veux voir')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Arrivée sur le serveur').setDescription('Date d\'arrivée et ancienneté').setValue('arrivee').setEmoji('📅'),
        new StringSelectMenuOptionBuilder().setLabel('Photo de profil & bannière').setDescription('PP et bannière du membre').setValue('avatar').setEmoji('🖼️'),
        new StringSelectMenuOptionBuilder().setLabel('Messagerie & Vocal').setDescription('Stats messages et temps vocal').setValue('stats').setEmoji('📊'),
        new StringSelectMenuOptionBuilder().setLabel('Derniers rôles').setDescription('Les 10 derniers rôles ajoutés/retirés').setValue('roles').setEmoji('🎭'),
        new StringSelectMenuOptionBuilder().setLabel('Avertissements').setDescription('Les 10 derniers warns').setValue('warns').setEmoji('⚠️'),
      );

    const row = new ActionRowBuilder().addComponents(menu);
    await message.reply({ embeds: [embed], components: [row] });
  }

  // WARN
  if (cmd === 'warn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ type: 'manuel', raison: reason, by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Warn').setDescription(`**Averti :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Raison :** ${reason}\n**Total :** ${w.length}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'unwarn') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const num = parseInt(args[1]);
    const w = warns.get(target.id) || [];
    if (!num || num < 1 || num > w.length) return message.reply(`Numéro invalide. Ce membre a **${w.length}** warn(s). Utilise \`-warns @user\` pour voir les numéros.`);
    const removed = w.splice(num - 1, 1)[0];
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Warn supprimé').setDescription(`Warn n°${num} de **${target.user.tag}** supprimé.\nRaison était : ${removed.raison}\nWarns restants : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'warns') {
    const target = message.mentions.members.first() || message.member;
    const w = warns.get(target.id) || [];
    if (w.length === 0) return message.reply(`${target.user.tag} n'a aucun warn.`);
    const lines = w.map((x, i) => `**${i + 1}.** ${x.raison || x.type} — ${x.date} par ${x.by || 'Auto'}`).join('\n');
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle(`Warns de ${target.user.tag}`).setDescription(lines).setFooter({ text: `Total : ${w.length} warn(s)` }).setTimestamp()] });
  }

  if (cmd === 'clear') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('Permission refusée.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('Nombre entre 1 et 100.');
    const deleted = await message.channel.bulkDelete(n + 1, true);
    const m = await message.channel.send(`${deleted.size - 1} messages supprimés.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Clear').setDescription(`**Par :** ${message.author.tag} (${message.author.id})\n**Salon :** <#${message.channel.id}>\n**Quantité :** ${deleted.size - 1} messages\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.ban({ reason });
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Bannissement').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ban').setDescription(`**Banni :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Raison :** ${reason}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.kick(reason);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Expulsion').setDescription(`**Membre :** ${target.user.tag}\n**Raison :** ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Kick').setDescription(`**Expulsé :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Raison :** ${reason}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'mute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'Aucune raison';
    await target.timeout(duree * 60 * 1000, reason);
    const muteEnd = Math.floor((Date.now() + duree * 60 * 1000) / 1000);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`**Membre :** ${target.user.tag}\n**Durée :** ${duree} min\n**Fin :** <t:${muteEnd}:R>\n**Raison :** ${reason}`).setTimestamp()] });
    try { await target.send(`Tu as été mute **${duree} minutes** sur Naytawa.\nRaison : ${reason}\nFin : <t:${muteEnd}:F>`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute manuel').setDescription(`**Muté :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag} (${message.author.id})\n**Durée :** ${duree} min\n**Fin :** <t:${muteEnd}:F>\n**Raison :** ${reason}\n**Statut :** Actuellement muté jusqu'à <t:${muteEnd}:R>`).setTimestamp()] });
  }

  if (cmd === 'unmute') {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Permission refusée.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`${target.user.tag} a été démuté.`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`**Démuté :** ${target.user.tag} (${target.id})\n**Par :** ${message.author.tag}\n**Statut :** N'est plus muté\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
  }

  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }

  if (cmd === 'make' && args[0] === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusée.');
    const titre = args[1] || 'Panel';
    const description = args.slice(2).join(' ') || 'Description.';
    await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: message.guild.iconURL({ dynamic: true }) }).setTitle(titre).setDescription(description).setTimestamp().setFooter({ text: 'Naytawa' })] });
    await message.delete().catch(() => {});
  }

  if (cmd === 'backup') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('Permission refusée.');
    const guild = message.guild;
    const channels = guild.channels.cache.map(c => ({ name: c.name, type: c.type, position: c.position, parentId: c.parentId }));
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => ({ name: r.name, color: r.color, permissions: r.permissions.bitfield.toString(), position: r.position }));
    const backup = JSON.stringify({ channels, roles, memberCount: guild.memberCount, name: guild.name, date: new Date().toISOString() }, null, 2);
    const attachment = new AttachmentBuilder(Buffer.from(backup), { name: `backup-${guild.name}-${Date.now()}.json` });
    await message.reply({ content: 'Backup généré !', files: [attachment] });
  }

  if (cmd === 'panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('Permission refusée.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement') await sendPanelReglement(message.guild);
    else if (type === 'roles') await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'jeux') await sendPanelJeux(message.guild);
    else if (type === 'top') { await sendTopMessages(message.guild); await sendTopVoc(message.guild); }
    else if (type === 'partenariat') await sendPanelPartenariat(message.guild);
    else return message.reply('Types : `reglement` `roles` `tickets` `jeux` `top` `partenariat`');
    const confirm = await message.reply('Panel envoyé !');
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }
});

// ══ PANELS ══
async function sendPanelReglement(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
    if (!salon) return;
    await salon.send({ embeds: [new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Règlement du serveur')
      .setDescription([
        '> Bienvenue ! Merci de lire et respecter ces règles.',
        '',
        '**` 01 `** Respectez chaque membre.',
        '**` 02 `** Zéro discrimination.',
        '**` 03 `** Pas de spam, flood ou pub.',
        '**` 04 `** Contenu NSFW interdit hors salons dédiés.',
        '**` 05 `** Bonne conduite en vocal.',
        '**` 06 `** Décisions du staff définitives.',
        '**` 07 `** Aucun lien suspect.',
        '**` 08 `** Une seule identité par personne.',
        '',
        'Conditions : https://discord.com/terms',
        'Règles : https://discord.com/guidelines',
        '',
        '*En restant sur ce serveur, tu acceptes ces règles.*',
      ].join('\n'))
      .setImage('https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif?ex=6a0cc23c&is=6a0b70bc&hm=30de254d883c12be4f4c1cb87ee090ded8a47427503361798de23916ef3dc15a&width=432&height=243&')
      .setFooter({ text: 'Naytawa • Tout manquement entraîne une sanction.' })] });
  } catch (e) { console.error('Panel reglement:', e.message); }
}

async function sendPanelRoles(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ROLES);
    if (!salon) return;
    const menu = new StringSelectMenuBuilder()
      .setCustomId('notif_select')
      .setPlaceholder('Choisis tes notifications')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Annonces partenariat').setValue('notif_partner').setEmoji('🤝'),
        new StringSelectMenuOptionBuilder().setLabel('Sondage').setDescription('Sondages du serveur').setValue('notif_sondage').setEmoji('📊'),
        new StringSelectMenuOptionBuilder().setLabel('Animation').setDescription('Événements et animations').setValue('notif_anim').setEmoji('🎉'),
        new StringSelectMenuOptionBuilder().setLabel('Giveaway').setDescription('Concours et cadeaux').setValue('notif_giveaway').setEmoji('🎁'),
      );
    const row = new ActionRowBuilder().addComponents(menu);
    await salon.send({ embeds: [new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Notifications')
      .setDescription('> Choisis les notifications que tu souhaites recevoir.\n> Sélectionne et resélectionne pour désactiver.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa' })], components: [row] });
  } catch (e) { console.error('Panel roles:', e.message); }
}

async function sendPanelJeux(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_ACCES_JEUX);
    if (!salon) return;
    const menu = new StringSelectMenuBuilder()
      .setCustomId('jeux_select')
      .setPlaceholder('Choisis un accès')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Coins').setDescription('Accès au salon Coins').setValue('jeux_coins').setEmoji('🪙'),
        new StringSelectMenuOptionBuilder().setLabel('Mudae').setDescription('Accès au salon Mudae').setValue('jeux_mudae').setEmoji('🎴'),
        new StringSelectMenuOptionBuilder().setLabel('OPW').setDescription('Accès au salon One Piece World').setValue('jeux_opw').setEmoji('⚔️'),
      );
    const row = new ActionRowBuilder().addComponents(menu);
    await salon.send({ embeds: [new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
      .setTitle('Accès rapides')
      .setDescription('> Sélectionne un jeu pour activer ou désactiver l\'accès.')
      .setImage('https://cdn.discordapp.com/attachments/1505541381198975036/1506024573177692350/dd1d77397d99e16c07a910c8d9799356.gif?ex=6a0cc22e&is=6a0b70ae&hm=7bdbeb1517299458900d400fb33cb778af3c5d4c00ccf76a00852d8f449196a9&')
      .setFooter({ text: 'Naytawa' })], components: [row] });
  } catch (e) { console.error('Panel jeux:', e.message); }
}

async function sendPanelTickets(guild) {
  try {
    const salonRegles = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
    if (salonRegles) {
      await salonRegles.send({ embeds: [new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Règles des tickets')
        .setDescription([
          '> Avant d\'ouvrir un ticket, lis ces règles.',
          '',
          'Pas de faux tickets ou trolls',
          'Pas d\'insultes envers le staff',
          'Un seul ticket par problème',
          'Sois poli et respectueux',
          '',
          `Créer un ticket : <#${IDS.SALON_TICKET_PANEL}>`,
          '',
          '*Tout abus entraîne une sanction.*',
        ].join('\n'))
        .setImage(GIF_TICKET_REGLES)
        .setFooter({ text: 'Naytawa' })] });
    }
    const salonPanel = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
    if (salonPanel) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Choisis une catégorie de ticket')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question générale').setValue('ticket_question').setEmoji('❓'),
          new StringSelectMenuOptionBuilder().setLabel('Abus / Problème').setDescription('Signaler un abus de perm').setValue('ticket_abus').setEmoji('⚠️'),
          new StringSelectMenuOptionBuilder().setLabel('Devenir Modérateur').setDescription('Candidature staff').setValue('ticket_modo').setEmoji('🛡️'),
          new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Demande de partenariat').setValue('ticket_partner').setEmoji('🤝'),
        );
      const row = new ActionRowBuilder().addComponents(menu);
      await salonPanel.send({ embeds: [new EmbedBuilder()
        .setColor(COLOR)
        .setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) })
        .setTitle('Ouvrir un ticket')
        .setDescription('> Choisis la catégorie de ta demande.\n> Un membre du staff te répondra rapidement.')
        .setImage('https://cdn.discordapp.com/attachments/1505586853120839925/1506023355558531082/4852aeedde73d6eac84f075c6b9c4ce6.gif?ex=6a0cc10c&is=6a0b6f8c&hm=946656d43cb7fe32da993915734a39f5fbd9e9c45c42c4abcfb590d4847f7205&')
        .setFooter({ text: 'Naytawa' })], components: [row] });
    }
  } catch (e) { console.error('Panel tickets:', e.message); }
}

async function sendPanelPartenariat(guild) {
  try {
    const salon = guild.channels.cache.get(IDS.SALON_PARTENARIAT);
    if (!salon) return;
    await salon.send({ embeds: [new EmbedBuilder()
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
      .setFooter({ text: 'Naytawa' })] });
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
      .setDescription(lines.length ? lines.join('\n') : 'Aucune donnée.')
      .setImage(GIF_TOP)
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis à jour automatiquement' });
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
  // Top 3 (index 0, 1, 2)
  const sorted = [...vocTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const role = guild.roles.cache.get(IDS.ROLE_TOP3_VOC);
  if (role) {
    guild.members.cache.forEach(async m => {
      if (m.roles.cache.has(IDS.ROLE_TOP3_VOC) && !sorted.find(e => e[0] === m.id)) await m.roles.remove(role).catch(() => {});
    });
    for (const [id] of sorted) { // donne le rôle aux 3 premiers
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
      .setDescription(lines.length ? lines.join('\n') : 'Aucune donnée.')
      .setImage(GIF_TOP)
      .setTimestamp()
      .setFooter({ text: 'Naytawa • Mis à jour automatiquement' });
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
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Rejoint un salon vocal')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon rejoint :** <#${newState.channelId}>\n**Micro :** ${newState.selfMute ? 'Coupé' : 'Actif'}\n**Son :** ${newState.selfDeaf ? 'Coupé' : 'Actif'}\n**Muté par serveur :** ${newState.serverMute ? 'Oui' : 'Non'}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) {
        const elapsed = Date.now() - join;
        vocTime.set(member.id, (vocTime.get(member.id) || 0) + elapsed);
        vocJoin.delete(member.id);
        const h = Math.floor(elapsed / 3600000);
        const m2 = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
          .setTitle('Quitté un salon vocal')
          .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon quitté :** <#${oldState.channelId}>\n**Temps passé :** ${h}h ${m2}m ${s}s\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
          .setTimestamp()] });
      }
    } else if (oldState.channelId !== newState.channelId) {
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
        .setTitle('Changement de salon vocal')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**De :** <#${oldState.channelId}>\n**Vers :** <#${newState.channelId}>\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    }

    // Mute/démute vocal
    if (!oldState.serverMute && newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245')
        .setTitle('Muté en vocal par le serveur')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${newState.channelId || 'Inconnu'}>\n**Statut :** Muté par le serveur\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    }
    if (oldState.serverMute && !newState.serverMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setTitle('Démuté en vocal')
        .setDescription(`**Membre :** ${member.user.tag} (${member.id})\n**Salon :** <#${newState.channelId || 'Inconnu'}>\n**Statut :** N'est plus muté\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
        .setTimestamp()] });
    }

    // Micro coupé/ouvert
    if (!oldState.selfMute && newState.selfMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
        .setDescription(`🎤 **${member.displayName}** a coupé son micro dans <#${newState.channelId}>`)
        .setTimestamp()] });
    }
    if (oldState.selfMute && !newState.selfMute && logCh) {
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c')
        .setDescription(`🎤 **${member.displayName}** a réactivé son micro dans <#${newState.channelId}>`)
        .setTimestamp()] });
    }
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ LOGS MSG SUPPRIMÉ + MODIFIÉ ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (!logCh) return;

  // Détecte si supprimé par un mod (approximatif)
  const embed = new EmbedBuilder().setColor('#ed4245')
    .setTitle('Message supprimé')
    .setDescription(`**Auteur :** ${message.author?.tag} (${message.author?.id})\n**Salon :** <#${message.channel.id}>\n**Envoyé le :** <t:${Math.floor(message.createdTimestamp/1000)}:F>\n**Supprimé le :** <t:${Math.floor(Date.now()/1000)}:F>\n**Contenu :**\n${message.content ? message.content.slice(0, 1000) : '*Contenu non disponible*'}`)
    .setTimestamp();
  if (message.attachments.size > 0) embed.addFields({ name: 'Pièces jointes', value: message.attachments.map(a => a.url).join('\n') });
  logCh.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const logCh = newMessage.guild?.channels.cache.get(IDS.LOG_MSG);
  if (!logCh) return;
  logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a')
    .setTitle('Message modifié')
    .setDescription(`**Auteur :** ${newMessage.author?.tag} (${newMessage.author?.id})\n**Salon :** <#${newMessage.channel.id}>\n**Avant :**\n${oldMessage.content?.slice(0, 500) || '*Non disponible*'}\n**Après :**\n${newMessage.content?.slice(0, 500)}\n**[Aller au message](${newMessage.url})**`)
    .setTimestamp()] });
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild = interaction.guild;

    // ── SELECT MENUS ──
    if (interaction.isStringSelectMenu()) {

      // Notifications
      if (interaction.customId === 'notif_select') {
        const val = interaction.values[0];
        const notifMap = { notif_partner: IDS.ROLE_NOTIF_PARTNER, notif_sondage: IDS.ROLE_NOTIF_SONDAGE, notif_anim: IDS.ROLE_NOTIF_ANIM, notif_giveaway: IDS.ROLE_NOTIF_GIVEAWAY };
        const roleId = notifMap[val];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Rôle introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Notification **${role.name}** désactivée !`, ephemeral: true }); }
        else { await member.roles.add(role); return interaction.reply({ content: `Notification **${role.name}** activée !`, ephemeral: true }); }
      }

      // Jeux
      if (interaction.customId === 'jeux_select') {
        const val = interaction.values[0];
        const jeuxMap = { jeux_coins: '1506032267506745435', jeux_mudae: '1506032360917827727', jeux_opw: '1506032309080424531' };
        const roleId = jeuxMap[val];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Rôle introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Accès **${role.name}** désactivé !`, ephemeral: true }); }
        else { await member.roles.add(role); return interaction.reply({ content: `Accès **${role.name}** activé !`, ephemeral: true }); }
      }

      // Tickets
      if (interaction.customId === 'ticket_select') {
        const typeMap = { ticket_question: 'Question', ticket_abus: 'Abus / Problème', ticket_modo: 'Devenir Modérateur', ticket_partner: 'Partenariat' };
        const type = typeMap[interaction.values[0]];
        const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
        const existing = guild.channels.cache.find(c => c.name === `ticket-${safeName}` && c.parentId === IDS.CAT_TICKETS);
        if (existing) return interaction.reply({ content: 'Tu as déjà un ticket ouvert !', ephemeral: true });
        const ticketChannel = await guild.channels.create({
          name: `ticket-${safeName}`, type: ChannelType.GuildText, parent: IDS.CAT_TICKETS,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: IDS.ROLE_TICKET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });
        let extra = interaction.values[0] === 'ticket_partner' ? '\n\nMerci de fournir :\n- Nom du serveur\n- Lien d\'invitation\n- Nombre de membres\n- Raison du partenariat' : '';
        const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa — Support', iconURL: guild.iconURL({ dynamic: true }) }).setTitle(`Ticket — ${type}`).setDescription(`Bonjour ${member} !\n\n**Type :** ${type}\n**Créé le :** <t:${Math.floor(Date.now()/1000)}:F>${extra}`).setFooter({ text: 'Naytawa' }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel('Je le prends en charge').setStyle(ButtonStyle.Success),
        );
        await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket créé : ${ticketChannel}`, ephemeral: true });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Nouveau ticket').setDescription(`**Par :** ${member.user.tag} (${member.id})\n**Type :** ${type}\n**Salon :** ${ticketChannel}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        return;
      }

      // Profil select
      if (interaction.customId.startsWith('profil_')) {
        const targetId = interaction.customId.split('_')[1];
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0];
        let embed;

        if (val === 'arrivee') {
          embed = new EmbedBuilder().setColor(COLOR)
            .setTitle(`Arrivée de ${target.displayName}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: 'Arrivé sur le serveur', value: `<t:${Math.floor(target.joinedTimestamp/1000)}:F>\n(<t:${Math.floor(target.joinedTimestamp/1000)}:R>)`, inline: true },
              { name: 'Compte créé le', value: `<t:${Math.floor(target.user.createdTimestamp/1000)}:F>\n(<t:${Math.floor(target.user.createdTimestamp/1000)}:R>)`, inline: true },
            ).setTimestamp();
        }

        if (val === 'avatar') {
          embed = new EmbedBuilder().setColor(COLOR)
            .setTitle(`Photo de profil de ${target.displayName}`)
            .setImage(target.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setTimestamp();
          const banner = await target.user.fetch().then(u => u.bannerURL({ size: 1024 })).catch(() => null);
          if (banner) embed.addFields({ name: 'Bannière', value: `[Voir la bannière](${banner})` });
        }

        if (val === 'stats') {
          const msgs = messageCount.get(target.id) || 0;
          const voc = vocTime.get(target.id) || 0;
          const h = Math.floor(voc / 3600000);
          const m2 = Math.floor((voc % 3600000) / 60000);
          const sortedMsg = [...messageCount.entries()].sort((a, b) => b[1] - a[1]);
          const posMsg = sortedMsg.findIndex(e => e[0] === target.id) + 1;
          const sortedVoc = [...vocTime.entries()].sort((a, b) => b[1] - a[1]);
          const posVoc = sortedVoc.findIndex(e => e[0] === target.id) + 1;
          embed = new EmbedBuilder().setColor(COLOR)
            .setTitle(`Stats de ${target.displayName}`)
            .addFields(
              { name: 'Messages envoyés', value: `**${msgs.toLocaleString()}** messages\nClassement : **#${posMsg || '?'}**`, inline: true },
              { name: 'Temps en vocal', value: `**${h}h ${m2}m**\nClassement : **#${posVoc || '?'}**`, inline: true },
            ).setTimestamp();
        }

        if (val === 'roles') {
          const hist = rolesHistory.get(target.id) || [];
          const current = target.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).join(', ') || 'Aucun';
          embed = new EmbedBuilder().setColor(COLOR)
            .setTitle(`Rôles de ${target.displayName}`)
            .addFields(
              { name: 'Rôles actuels', value: current.slice(0, 1000) },
              { name: 'Derniers changements', value: hist.length ? hist.slice(0, 10).map((h, i) => `**${i+1}.** ${h.type === 'ajouté' ? '➕' : '➖'} ${h.name} — ${h.date}`).join('\n') : 'Aucun historique' },
            ).setTimestamp();
        }

        if (val === 'warns') {
          const w = warns.get(target.id) || [];
          embed = new EmbedBuilder().setColor(COLOR)
            .setTitle(`Avertissements de ${target.displayName}`)
            .setDescription(w.length ? w.slice(-10).map((x, i) => `**${i+1}.** ${x.raison || x.type} — ${x.date} par ${x.by || 'Auto'}`).join('\n') : 'Aucun avertissement.')
            .setFooter({ text: `Total : ${w.length} warn(s)` })
            .setTimestamp();
        }

        if (embed) await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    // ── BOUTONS ──
    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_prendre') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel(`Pris en charge par ${member.displayName}`).setStyle(ButtonStyle.Success).setDisabled(true),
        );
        await interaction.update({ components: [row] });
        await interaction.channel.send(`Ce ticket est pris en charge par ${member} !`);
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Ticket pris en charge').setDescription(`**Par :** ${member.user.tag} (${member.id})\n**Salon :** ${interaction.channel.name}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        return;
      }

      if (interaction.customId === 'ticket_fermer') {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket fermé').setDescription(`Fermé par ${member}\nSuppression dans 5 secondes...`).setTimestamp()] });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket fermé').setDescription(`**Fermé par :** ${member.user.tag} (${member.id})\n**Salon :** ${interaction.channel.name}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }

      if (interaction.customId === 'plainte_ouvrir') {
        const modal = new ModalBuilder().setCustomId('plainte_modal').setTitle('Plainte anonyme');
        const input = new TextInputBuilder().setCustomId('plainte_texte').setLabel('Décris ta plainte').setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(20).setMaxLength(1000).setPlaceholder('Explique la situation...');
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }
    }

    // ── MODAL PLAINTE ──
    if (interaction.isModalSubmit() && interaction.customId === 'plainte_modal') {
      await interaction.deferReply({ ephemeral: true });
      const texte = interaction.fields.getTextInputValue('plainte_texte');
      const salonStaff = guild.channels.cache.get('1505541146502500473');
      if (salonStaff) {
        const embed = new EmbedBuilder().setColor('#ed4245').setTitle('Nouvelle plainte anonyme').setDescription(`> Contenu :\n\n${texte}`).setTimestamp().setFooter({ text: 'Identité confidentielle.' });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('plainte_voc').setLabel('Convoquer en vocal').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('plainte_derank').setLabel('Dérank').setStyle(ButtonStyle.Danger),
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
