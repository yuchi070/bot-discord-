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
const COLOR  = '#C8A951';
const OWNER_ID = '1208368116942241813';

const IDS = {
  SALON_REGLEMENT:     '1505541099484217434',
  SALON_ROLES:         '1505541083210322010',
  SALON_STATS:         '1506019680626675762',
  SALON_TOP_MSG:       '1505541388622762084',
  SALON_TOP_VOC:       '1505541364182683849',
  SALON_TOP_INVITES:   '1507705900595413102',
  SALON_BIENVENUE:     '1506393454719144087',
  SALON_PRISON:        '1505541512971419781',
  SALON_TICKET_REGLES: '1505541456234807316',
  SALON_TICKET_PANEL:  '1505541456419618856',
  SALON_AUTO_REACT:    '1505541372436943101',
  SALON_SELFIE:        '1507460304144171171',
  SALON_PARTENARIAT:   '1506232546252423291',
  STAT_EN_LIGNE:       '1505647390944792616',
  STAT_MEMBRES:        '1505647427749675028',
  STAT_VOC:            '1505647458565488690',
  ROLE_MEMBRE:         '1506029843345703112',
  ROLE_TOP3_MSG:       '1506030189078118441',
  ROLE_TOP3_VOC:       '1506030128973615114',
  ROLE_TOP3_INVITES:   '1507704235377033246',
  ROLE_NOTIF_PARTNER:  '1506250258924179526',
  ROLE_NOTIF_SONDAGE:  '1506257883074003075',
  ROLE_NOTIF_ANIM:     '1506257971263311984',
  ROLE_NOTIF_GIVEAWAY: '1506250141777268797',
  ROLE_TICKET:         '1505609735036993659',
  ROLE_NAYTAWA:        '1506332594185437375',
  ROLE_WL:             '1506580974144720967',
  ROLE_WL_PERM:        '1508223353683574845',
  CAT_TICKETS:         '1505541035479138434',
  LOG_MSG:             '1505541550203998330',
  LOG_TICKET:          '1505541540557361353',
  LOG_VOC:             '1505541558177497108',
  LOG_ROLE:            '1505541512837070979',
  LOG_MOD:             '1505541549335904266',
};

const GIF = {
  TOP:          'https://cdn.discordapp.com/attachments/1505541381198975036/1506664608612483122/InShot_20260519_234951472.gif',
  TICKET_PANEL: 'https://cdn.discordapp.com/attachments/1505541381198975036/1506650888176140499/4852aeedde73d6eac84f075c6b9c4ce6.gif',
  TICKET_REGLES:'https://cdn.discordapp.com/attachments/1505541381198975036/1506650895348400278/c84fb740471d58ba9597ace28969d490.gif',
  ROLES:        'https://cdn.discordapp.com/attachments/1505541381198975036/1506650955934863461/dd1d77397d99e16c07a910c8d9799356.gif',
  REGLEMENT:    'https://media.discordapp.net/attachments/1505541381198975036/1506024629431435314/dc0441577ed4e4af0a57adcbe419b019.gif',
  STATS:        'https://cdn.discordapp.com/attachments/1505541381198975036/1506232278517420104/d99d4ab19c4d867a9a9a8b91ef775db6.gif',
  PARTENARIAT:  'https://cdn.discordapp.com/attachments/1505541381198975036/1506232948930908170/1a13c8300696a51f0f7e45d726cce0b3_1.gif',
};

const VIDEO_LOVE = 'https://media.discordapp.net/attachments/1462161276187836487/1506763751502778449/fan2javel_TikTokDownloader.com_71fe3.mp4';

// ══ DONNÉES ══
const messageCount   = new Map();
const vocTime        = new Map();
const vocJoin        = new Map();
const warns          = new Map();
const rolesHistory   = new Map();
const inviteTracker  = new Map();
const inviteCount    = new Map();
const whitelistSet   = new Set();
const antiSpamExclus = new Set();
const spamTracker    = new Map();
const giveaways      = new Map();
const autoreponseCD  = new Map();
const ownerSet       = new Set(); // -owner liste invisible

// Voc temporaires : channelId -> { ownerId, timeout }
const tempVocs       = new Map();
// userId -> channelId (pour limiter à 1 voc par personne)
const userTempVoc    = new Map();

let censureActif     = true;
let botPingCooldown  = null;
let botPingStage     = 0;
let VOC_GENERATOR_CHANNEL_ID = null;
let VOC_CATEGORY_ID  = null;

// ══ PERMISSIONS ══
function isRealOwner(member) {
  return member.id === OWNER_ID;
}
function isOwner(member) {
  return isRealOwner(member) || ownerSet.has(member.id);
}
function isAdmin(member) {
  return isOwner(member) ||
         member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild);
}
function canWL(member) {
  return isAdmin(member) || member.roles.cache.has(IDS.ROLE_WL_PERM);
}
function canWarn(member) {
  return isAdmin(member) || member.roles.cache.has(IDS.ROLE_WL_PERM);
}

// ══ ANTI-INSULTES ══
const MOTS_INTERDITS = [
  'nique ta mère','nique ta mere','fils de pute','tue toi','tue-toi',
  'ouvre toi les veines','crève','va mourir','fais toi du mal','coupe toi',
  'pends toi','jette toi par','porn','porno','xxx','xvideos','xnxx',
  'pornhub','redtube','youporn','branlette','branler','masturber',
  'ejaculer','sodomie','sodomiser','fellation','partouze','gangbang',
  'inceste','pédophile','pedophile','ntm','fdp','salope','connard',
  'connasse','enculé','enculer','batard','bâtard','n1que','n!que',
  'niq','nik','n-t-m','f.d.p','s4lope','s@lope','c0nnard','enc*lé','b1te',
];
const FAUX_POSITIFS = ['prévention','psychologue','hopital','médecin','santé','thérapie'];

function contientMotInterdit(texte) {
  if (!censureActif) return null;
  const t = texte.toLowerCase();
  for (const fp of FAUX_POSITIFS) { if (t.includes(fp)) return null; }
  for (const mot of MOTS_INTERDITS) {
    const m = mot.toLowerCase();
    if (m.length <= 4) {
      if (new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(t)) return mot;
    } else if (t.includes(m)) return mot;
  }
  return null;
}

function checkSpam(message) {
  if (antiSpamExclus.has(message.channel.id)) return false;
  const now = Date.now();
  const data = spamTracker.get(message.author.id) || { msgs: [] };
  data.msgs = data.msgs.filter(t => now - t < 5000);
  data.msgs.push(now);
  spamTracker.set(message.author.id, data);
  return data.msgs.length > 5;
}

function peutRepondre(userId, type) {
  const key = `${userId}_${type}`;
  const last = autoreponseCD.get(key) || 0;
  if (Date.now() - last < 3 * 60 * 60 * 1000) return false;
  autoreponseCD.set(key, Date.now());
  return true;
}

// ══ READY ══
client.once('ready', async () => {
  console.log(`Bot connecte : ${client.user.tag}`);
  for (const [, guild] of client.guilds.cache) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (invites) inviteTracker.set(guild.id, new Map(invites.map(i => [i.code, { uses: i.uses||0, inviterId: i.inviter?.id }])));
  }
  setInterval(sendStats, 120000);
  setInterval(updateTopVoc, 300000);
  setInterval(checkGiveaways, 15000);
});

client.on('inviteCreate', invite => {
  const map = inviteTracker.get(invite.guild.id) || new Map();
  map.set(invite.code, { uses: invite.uses||0, inviterId: invite.inviter?.id });
  inviteTracker.set(invite.guild.id, map);
});

// ══ STATS ══
async function sendStats() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    await guild.members.fetch();
    const total  = guild.memberCount;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const voc    = guild.voiceStates.cache.filter(v => v.channelId).size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const chM = guild.channels.cache.get(IDS.STAT_MEMBRES);
    const chO = guild.channels.cache.get(IDS.STAT_EN_LIGNE);
    const chV = guild.channels.cache.get(IDS.STAT_VOC);
    if (chM) await chM.setName(`membres : ${total}`).catch(() => {});
    if (chO) await chO.setName(`en ligne : ${online}`).catch(() => {});
    if (chV) await chV.setName(`voc : ${voc}`).catch(() => {});
    const salon = guild.channels.cache.get(IDS.SALON_STATS);
    if (!salon) return;
    const embed = new EmbedBuilder()
      .setColor(COLOR).setTitle('Statistiques du serveur')
      .setDescription(`Membres : ${total}\nEn ligne : ${online}\nEn vocal : ${voc}\nBoosts : ${boosts}`)
      .setThumbnail(guild.iconURL({ dynamic: true })).setTimestamp().setFooter({ text: 'Naytawa' });
    await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ TOP MESSAGES ══
async function updateTopMessages(guild) {
  if (!guild) return;
  try {
    await guild.members.fetch();
    const sorted  = [...messageCount.entries()].sort((a,b) => b[1]-a[1]);
    const top3Ids = sorted.slice(0,3).map(e => e[0]);
    const role    = guild.roles.cache.get(IDS.ROLE_TOP3_MSG);
    if (role) {
      for (const [,m] of guild.members.cache) {
        if (m.roles.cache.has(IDS.ROLE_TOP3_MSG) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(IDS.ROLE_TOP3_MSG) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_MSG);
    if (!salon) return;
    const lines = sorted.slice(0,10).map((e,i) => `Top ${i+1} <@${e[0]}> — ${e[1].toLocaleString()} messages`);
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Messages').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Messages');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('TopMsg:', e.message); }
}

// ══ TOP VOCAL ══
async function updateTopVoc() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    await guild.members.fetch();
    for (const [userId, joinTime] of vocJoin) {
      vocTime.set(userId, (vocTime.get(userId)||0) + (Date.now()-joinTime));
      vocJoin.set(userId, Date.now());
    }
    const sorted  = [...vocTime.entries()].sort((a,b) => b[1]-a[1]);
    const top3Ids = sorted.slice(0,3).map(e => e[0]);
    const role    = guild.roles.cache.get(IDS.ROLE_TOP3_VOC);
    if (role) {
      for (const [,m] of guild.members.cache) {
        if (m.roles.cache.has(IDS.ROLE_TOP3_VOC) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(IDS.ROLE_TOP3_VOC) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_VOC);
    if (!salon) return;
    const lines = sorted.slice(0,10).map((e,i) => {
      const h = Math.floor(e[1]/3600000); const mn = Math.floor((e[1]%3600000)/60000);
      return `Top ${i+1} <@${e[0]}> — ${h}h ${mn}m`;
    });
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Vocal').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Vocal');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('TopVoc:', e.message); }
}

// ══ TOP INVITATIONS ══
async function updateTopInvites(guild) {
  try {
    await guild.members.fetch();
    const sorted  = [...inviteCount.entries()].sort((a,b) => b[1]-a[1]);
    const top3Ids = sorted.slice(0,3).map(e => e[0]);
    const role    = guild.roles.cache.get(IDS.ROLE_TOP3_INVITES);
    if (role) {
      for (const [,m] of guild.members.cache) {
        if (m.roles.cache.has(IDS.ROLE_TOP3_INVITES) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(IDS.ROLE_TOP3_INVITES) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_INVITES);
    if (!salon) return;
    const lines = sorted.slice(0,10).map((e,i) => `Top ${i+1} <@${e[0]}> — ${e[1]} invitation${e[1]>1?'s':''}`);
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Invitations').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Invitations');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('TopInvites:', e.message); }
}

// ══ GIVEAWAY ══
async function checkGiveaways() {
  const now = Date.now();
  for (const [id, gw] of giveaways) {
    if (!gw.ended && now >= gw.endTime) {
      gw.ended = true; giveaways.set(id, gw);
      finishGiveaway(gw).catch(e => console.error('FinishGW:', e.message));
    }
  }
}

async function finishGiveaway(gw) {
  const guild   = client.guilds.cache.get(gw.guildId); if (!guild) return;
  const channel = guild.channels.cache.get(gw.channelId); if (!channel) return;
  const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
  const eligibles = [];
  for (const userId of gw.participants) {
    const vocH = (vocTime.get(userId)||0)/3600000;
    const msgs = messageCount.get(userId)||0;
    const inv  = inviteCount.get(userId)||0;
    if (gw.conditions.vocMin>0 && vocH<gw.conditions.vocMin) continue;
    if (gw.conditions.msgMin>0 && msgs<gw.conditions.msgMin) continue;
    if (gw.conditions.invMin>0 && inv<gw.conditions.invMin) continue;
    eligibles.push(userId);
  }
  const pool = [...eligibles]; const gagnants = [];
  for (let i=0;i<Math.min(gw.nbGagnants,pool.length);i++) {
    const idx = Math.floor(Math.random()*pool.length);
    gagnants.push(pool.splice(idx,1)[0]);
  }
  const embed = new EmbedBuilder().setColor('#f1c40f').setTitle(`Giveaway termine — ${gw.prix}`)
    .setDescription(gagnants.length>0 ? `Gagnant${gagnants.length>1?'s':''} : ${gagnants.map(id=>`<@${id}>`).join(', ')}\nEligibles : ${eligibles.length}/${gw.participants.length}` : 'Aucun participant eligible !')
    .setTimestamp().setFooter({ text: 'Naytawa • Giveaway termine' });
  if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
  if (gagnants.length>0) await channel.send(`Felicitations ${gagnants.map(id=>`<@${id}>`).join(', ')} ! Vous avez gagne **${gw.prix}** !`);
  else await channel.send(`Aucun participant eligible pour **${gw.prix}**.`);
}

function parseDuree(str) {
  const s = str.toLowerCase().trim(); const val = parseInt(s);
  if (s.endsWith('j')) return val*86400000;
  if (s.endsWith('h')) return val*3600000;
  return val*60000;
}
function parseDureeLabel(ms) {
  if (ms>=86400000) return `${ms/86400000}j`;
  if (ms>=3600000)  return `${ms/3600000}h`;
  return `${ms/60000}min`;
}
function parseConditions(str) {
  const cond = { vocMin:0, msgMin:0, invMin:0 };
  if (!str) return cond;
  const v = str.match(/voc:(\d+)h?/i); const m = str.match(/msg:(\d+)/i); const i = str.match(/inv:(\d+)/i);
  if (v) cond.vocMin=parseInt(v[1]); if (m) cond.msgMin=parseInt(m[1]); if (i) cond.invMin=parseInt(i[1]);
  return cond;
}

// ══ STALK — Système complet ══
async function buildStalkEmbed(target, guild) {
  const user = await target.user.fetch({ force: true }).catch(() => target.user);

  // Données de base
  const msgs       = messageCount.get(target.id) || 0;
  const voc        = vocTime.get(target.id) || 0;
  const h          = Math.floor(voc/3600000);
  const mn         = Math.floor((voc%3600000)/60000);
  const inv        = inviteCount.get(target.id) || 0;
  const w          = warns.get(target.id) || [];
  const inVoc      = vocJoin.has(target.id);
  const vocChannel = inVoc ? guild.voiceStates.cache.get(target.id)?.channel : null;
  const hist       = rolesHistory.get(target.id) || [];

  // Classements
  const posMsg = [...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
  const posVoc = [...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
  const posInv = [...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;

  // Badges Discord
  const flags = user.flags?.toArray() || [];
  const badgeMap = {
    Staff:                    '👮 Staff Discord',
    Partner:                  '🤝 Partenaire Discord',
    Hypesquad:                '🏠 HypeSquad Events',
    HypeSquadOnlineHouse1:    '🦅 Bravery',
    HypeSquadOnlineHouse2:    '💛 Brilliance',
    HypeSquadOnlineHouse3:    '💜 Balance',
    BugHunterLevel1:          '🐛 Bug Hunter',
    BugHunterLevel2:          '🐛 Bug Hunter Gold',
    ActiveDeveloper:          '👨‍💻 Developpeur Actif',
    VerifiedDeveloper:        '🤖 Dev Verifie',
    PremiumEarlySupporter:    '💎 Early Supporter',
  };
  const badges = flags.map(f => badgeMap[f]).filter(Boolean);

  // Boosting
  const boostSince = target.premiumSince;

  // Statut/activite
  const presence = target.presence;
  const status   = presence?.status || 'offline';
  const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };
  const activities = presence?.activities || [];
  const playingGame = activities.find(a => a.type === 0);
  const listeningSpotify = activities.find(a => a.type === 2 && a.name === 'Spotify');
  const customStatus = activities.find(a => a.type === 4);
  const streaming = activities.find(a => a.type === 1);

  // Compte ancienneté
  const accountAge = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
  const serverAge  = Math.floor((Date.now() - target.joinedTimestamp) / 86400000);

  // Rôles importants (pas @everyone, pas top 20)
  const roles = target.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a,b) => b.position - a.position)
    .map(r => r.toString())
    .slice(0,15)
    .join(' ') || 'Aucun';

  // Build embed principal
  const embed = new EmbedBuilder()
    .setColor(target.displayHexColor !== '#000000' ? target.displayHexColor : COLOR)
    .setAuthor({ name: `Stalk — ${target.displayName}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      // Infos compte
      { name: 'Compte Discord', value: [
        `**Tag :** ${user.tag}`,
        `**ID :** \`${user.id}\``,
        `**Cree le :** <t:${Math.floor(user.createdTimestamp/1000)}:F> (<t:${Math.floor(user.createdTimestamp/1000)}:R>)`,
        `**Age du compte :** ${accountAge} jour${accountAge>1?'s':''}`,
        `**Bot :** ${user.bot ? 'Oui' : 'Non'}`,
        badges.length ? `**Badges :** ${badges.join(', ')}` : null,
      ].filter(Boolean).join('\n'), inline: false },

      // Infos serveur
      { name: 'Sur le serveur', value: [
        `**Arrive le :** <t:${Math.floor(target.joinedTimestamp/1000)}:F> (<t:${Math.floor(target.joinedTimestamp/1000)}:R>)`,
        `**Anciennete :** ${serverAge} jour${serverAge>1?'s':''}`,
        boostSince ? `**Boost depuis :** <t:${Math.floor(boostSince.getTime()/1000)}:R>` : null,
        `**Surnom :** ${target.nickname || 'Aucun'}`,
      ].filter(Boolean).join('\n'), inline: false },

      // Statut
      { name: 'Statut & Activite', value: [
        `**Statut :** ${statusEmoji[status] || '⚫'} ${status}`,
        customStatus ? `**Status perso :** ${customStatus.state || customStatus.name}` : null,
        listeningSpotify ? `**Spotify :** ${listeningSpotify.details} — ${listeningSpotify.state}` : null,
        playingGame ? `**Joue a :** ${playingGame.name}` : null,
        streaming ? `**En stream :** ${streaming.name}` : null,
      ].filter(Boolean).join('\n') || 'Aucune activite', inline: false },

      // Vocal
      { name: 'Vocal', value: [
        `**Temps total :** ${h}h ${mn}m`,
        `**Classement :** #${posVoc||'?'}`,
        inVoc ? `**En vocal :** Oui — <#${vocChannel?.id}> (depuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>)` : `**En vocal :** Non`,
      ].join('\n'), inline: true },

      // Messages
      { name: 'Messages', value: [
        `**Total :** ${msgs.toLocaleString()}`,
        `**Classement :** #${posMsg||'?'}`,
        `**Invitations :** ${inv} (#${posInv||'?'})`,
      ].join('\n'), inline: true },

      // Moderation
      { name: 'Moderation', value: [
        `**Warns :** ${w.length}`,
        w.length > 0 ? `**Dernier warn :** ${w[w.length-1].raison||'N/A'} (${w[w.length-1].date||'?'})` : null,
        whitelistSet.has(target.id) || target.roles.cache.has(IDS.ROLE_WL) ? '**Whitelist censure :** Oui' : '**Whitelist censure :** Non',
      ].filter(Boolean).join('\n'), inline: false },

      // Roles
      { name: `Roles (${target.roles.cache.size - 1})`, value: roles.slice(0,800), inline: false },
    )
    .setTimestamp()
    .setFooter({ text: `Naytawa • Stalk • ID: ${user.id}` });

  // Banniere si disponible
  const bannerUrl = user.bannerURL({ size: 1024 });
  if (bannerUrl) embed.setImage(bannerUrl);

  return embed;
}

// ══ BIENVENUE ══
client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);
    if (role) await member.roles.add(role);
    const salon = member.guild.channels.cache.get(IDS.SALON_BIENVENUE);
    if (!salon) return;
    const newInvites = await member.guild.invites.fetch().catch(() => null);
    const oldInvites = inviteTracker.get(member.guild.id) || new Map();
    let inviterId = null;
    if (newInvites) {
      for (const [code, invite] of newInvites) {
        const old = oldInvites.get(code);
        if (old && (invite.uses||0) > (old.uses||0)) { inviterId = invite.inviter?.id; break; }
      }
      inviteTracker.set(member.guild.id, new Map(newInvites.map(i => [i.code, { uses: i.uses||0, inviterId: i.inviter?.id }])));
    }
    if (inviterId && inviterId !== member.id) {
      const cnt = (inviteCount.get(inviterId)||0) + 1;
      inviteCount.set(inviterId, cnt);
      await updateTopInvites(member.guild);
      await salon.send(`Bienvenue ${member}, amuse-toi bien avec nous !\nMerci <@${inviterId}> d'avoir invite ${member} ! (ca te fait ${cnt} invitation${cnt>1?'s':''})`);
    } else {
      await salon.send(`Bienvenue ${member}, amuse-toi bien avec nous !`);
    }
  } catch (e) { console.error('Bienvenue:', e.message); }
});

// ══ ROLES + BOOST ══
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const salon = newMember.guild.channels.cache.get(IDS.SALON_BIENVENUE);
      if (salon) await salon.send(`Merci ${newMember} pour ton boost !`);
    }
    const logCh = newMember.guild.channels.cache.get(IDS.LOG_ROLE);
    if (!logCh) return;
    const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size > 0) {
      const r = added.first();
      const hist = rolesHistory.get(newMember.id) || [];
      hist.unshift({ type: 'ajoute', name: r?.name, date: new Date().toLocaleDateString('fr-FR') });
      if (hist.length > 20) hist.pop();
      rolesHistory.set(newMember.id, hist);
      logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Role ajoute').setDescription(`Membre : ${newMember.user.tag}\nRole : ${r?.name}\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
    }
    if (removed.size > 0) {
      const r = removed.first();
      const hist = rolesHistory.get(newMember.id) || [];
      hist.unshift({ type: 'retire', name: r?.name, date: new Date().toLocaleDateString('fr-FR') });
      if (hist.length > 20) hist.pop();
      rolesHistory.set(newMember.id, hist);
      logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Role retire').setDescription(`Membre : ${newMember.user.tag}\nRole : ${r?.name}\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
    }
  } catch (e) { console.error('MemberUpdate:', e.message); }
});

// ══ VOC TEMPORAIRE ══
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  const member = newState.member || oldState.member;

  try {
    const logCh = guild.channels.cache.get(IDS.LOG_VOC);
    if (member) {
      if (!oldState.channelId && newState.channelId) {
        vocJoin.set(member.id, Date.now());
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Rejoint vocal').setDescription(`Membre : ${member.user.tag}\nSalon : <#${newState.channelId}>\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
      } else if (oldState.channelId && !newState.channelId) {
        const join = vocJoin.get(member.id);
        if (join) {
          const elapsed = Date.now()-join;
          vocTime.set(member.id, (vocTime.get(member.id)||0)+elapsed);
          vocJoin.delete(member.id);
          const h = Math.floor(elapsed/3600000); const m2 = Math.floor((elapsed%3600000)/60000);
          if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Quitte vocal').setDescription(`Membre : ${member.user.tag}\nSalon : <#${oldState.channelId}>\nTemps : ${h}h ${m2}m`).setTimestamp()] });
          updateTopVoc().catch(() => {});
        }
      } else if (oldState.channelId !== newState.channelId && logCh) {
        logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Changement vocal').setDescription(`Membre : ${member.user.tag}\nDe : <#${oldState.channelId}>\nVers : <#${newState.channelId}>`).setTimestamp()] });
      }
      if (!oldState.serverMute && newState.serverMute && logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Mute vocal').setDescription(`Membre : ${member.user.tag}`).setTimestamp()] });
      if (oldState.serverMute && !newState.serverMute && logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Demute vocal').setDescription(`Membre : ${member.user.tag}`).setTimestamp()] });
    }

    // Générateur voc temporaire
    if (VOC_GENERATOR_CHANNEL_ID && newState.channelId === VOC_GENERATOR_CHANNEL_ID && member) {
      // Vérifie si l'utilisateur a déjà une voc
      const existingVocId = userTempVoc.get(member.id);
      if (existingVocId && guild.channels.cache.has(existingVocId)) {
        // Renvoie l'utilisateur dans sa voc existante
        await member.voice.setChannel(existingVocId).catch(() => {});
        try {
          await member.send(
            `Tu as deja une voc en cours (<#${existingVocId}>).\n` +
            `Tu ne peux creer qu'une seule voc a la fois.\n` +
            `Elle sera supprimee automatiquement 10 minutes apres que tout le monde ait quitte.`
          );
        } catch {}
        return;
      }

      const catId = VOC_CATEGORY_ID || guild.channels.cache.get(VOC_GENERATOR_CHANNEL_ID)?.parentId;
      const tempChannel = await guild.channels.create({
        name: `voc de ${member.displayName}`,
        type: ChannelType.GuildVoice,
        parent: catId || null,
        permissionOverwrites: [
          { id: guild.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
          { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
        ],
      }).catch(() => null);

      if (tempChannel) {
        await member.voice.setChannel(tempChannel).catch(() => {});
        userTempVoc.set(member.id, tempChannel.id);
        tempVocs.set(tempChannel.id, { ownerId: member.id, timeout: null });
      }
    }

    // Suppression voc temporaire vide après 10 minutes
    if (oldState.channelId && tempVocs.has(oldState.channelId)) {
      const vocData = tempVocs.get(oldState.channelId);
      const channel = guild.channels.cache.get(oldState.channelId);
      if (channel && channel.members.size === 0) {
        if (vocData.timeout) clearTimeout(vocData.timeout);
        const t = setTimeout(async () => {
          const ch = guild.channels.cache.get(oldState.channelId);
          if (ch && ch.members.size === 0) {
            await ch.delete().catch(() => {});
            userTempVoc.delete(vocData.ownerId);
            tempVocs.delete(oldState.channelId);
          }
        }, 10 * 60 * 1000);
        vocData.timeout = t;
        tempVocs.set(oldState.channelId, vocData);
      } else if (channel && channel.members.size > 0 && vocData.timeout) {
        clearTimeout(vocData.timeout);
        vocData.timeout = null;
        tempVocs.set(oldState.channelId, vocData);
      }
    }
  } catch (e) { console.error('VoiceState:', e.message); }
});

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const contentLower = message.content.toLowerCase();

  // Mention bot
  if (
    message.mentions.has(client.user) &&
    !message.mentions.everyone &&
    !message.content.includes('@everyone') &&
    !message.content.includes('@here') &&
    !message.content.startsWith(PREFIX)
  ) {
    const now = Date.now();
    if (botPingCooldown && (now-botPingCooldown) < 2*60*60*1000) return;
    if (botPingStage===0)      { await message.reply("Ntm fdp (mon prefixe c'est -)"); botPingStage=1; }
    else if (botPingStage===1) { await message.reply('Ftg frr cplc'); botPingStage=2; }
    else {
      await message.reply("Sayez je parle plus, t'es moche + t'as pas d'avenir, tu clc a un bot fdp ntm j'espere tu te reveilles pas encule");
      try { await message.member.timeout(60*1000); } catch {}
      try { await message.author.send("Prends-le pas personnellement, desole de t'avoir insulte et mute"); } catch {}
      botPingStage=0; botPingCooldown=now;
    }
    return;
  }

  if (message.channel.id === IDS.SALON_AUTO_REACT) await message.react('❤️').catch(() => {});
  if (message.channel.id === IDS.SALON_SELFIE)     await message.react('🤍').catch(() => {});

  // Auto reponses
  if (contentLower.includes("je t'aime pas") && peutRepondre(message.author.id, 'aimepas'))
    await message.reply('Comment tu veux j\'te dise "ti amo" si y a pas d\'amour? - timar MIEUX QU\'HIER');
  if (contentLower.includes('bot de merde') && peutRepondre(message.author.id, 'botmerde'))
    await message.reply('Rien a change, j\'ferais toujours chanter la zone meme au sommet (tiki-tiki-tiki) - l2b La Zone');
  if (contentLower.includes("j'aime mon ex") && peutRepondre(message.author.id, 'ex'))
    await message.reply('Les comebacks, ca sert a rien, viens pas perdre ta dignite - l2b Billionnaire');
  if ((contentLower.includes('incapable')||contentLower.includes('tocard')||contentLower.includes('loser')) && peutRepondre(message.author.id, 'loser'))
    await message.reply("Peut-etre que tu crois qu'on n'a pas travaille sur la route du bonheur, je cavalais");

  const isWL = message.member?.roles.cache.has(IDS.ROLE_WL) || whitelistSet.has(message.author.id);

  if (!isWL && checkSpam(message)) {
    try {
      await message.delete();
      await message.member.timeout(5*60*1000, 'Spam');
      const w = await message.channel.send(`${message.author} spam detecte, mute 5 minutes.`);
      setTimeout(() => w.delete().catch(() => {}), 5000);
    } catch {}
    return;
  }

  if (!isWL) {
    const motTrouve = contientMotInterdit(message.content);
    if (motTrouve) {
      try {
        await message.delete();
        const w = warns.get(message.author.id)||[];
        const infractions = w.filter(x => x.type==='insulte').length;
        const duree = infractions===0?15:infractions===1?25:30;
        const raison = `Infraction n${infractions+1} — langage inapproprie`;
        w.push({ type:'insulte', mot:motTrouve, raison, date:new Date().toLocaleDateString('fr-FR'), duree, by:'Auto' });
        warns.set(message.author.id, w);
        await message.member.timeout(duree*60*1000, raison).catch(() => {});
        const muteEnd = Math.floor((Date.now()+duree*60*1000)/1000);
        if (infractions>=2) setTimeout(() => { const cw=warns.get(message.author.id)||[]; warns.set(message.author.id,cw.filter(x=>x.type!=='insulte')); }, 60*60*1000);
        try { await message.author.send(`Tu as ete mute ${duree} minutes.\nRaison : ${raison}\nFin : <t:${muteEnd}:F>`); } catch {}
        const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Auto-moderation').setDescription(`Membre : ${message.author.tag}\nSalon : <#${message.channel.id}>\nMot : ||${motTrouve}||\nDuree : ${duree} min`).setTimestamp()] });
        const wMsg = await message.channel.send(`${message.author} message supprime. Mute ${duree} minutes.`);
        setTimeout(() => wMsg.delete().catch(() => {}), 5000);
      } catch (e) { console.error('Anti-insulte:', e.message); }
      return;
    }
  }

  const count = (messageCount.get(message.author.id)||0)+1;
  messageCount.set(message.author.id, count);
  if (count%5===0) updateTopMessages(message.guild).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd  = args.shift().toLowerCase();

  // ════════ COMMANDES ════════

  // STALK — système complet
  if (cmd === 'stalk') {
    const target = message.mentions.members.first() ||
      (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null) ||
      message.member;

    if (!target) return message.reply('Membre introuvable. Usage : `-stalk @user` ou `-stalk`');

    try {
      const embed = await buildStalkEmbed(target, message.guild);

      // Menu pour voir encore plus de détails
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`stalk_${target.id}`)
        .setPlaceholder('Voir plus de details')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Vocal complet').setDescription('Stats vocales detaillees').setValue('voc'),
          new StringSelectMenuOptionBuilder().setLabel('Historique warns').setDescription('Tous les avertissements').setValue('warns'),
          new StringSelectMenuOptionBuilder().setLabel('Historique roles').setDescription('Derniers changements de roles').setValue('roles'),
          new StringSelectMenuOptionBuilder().setLabel('Activite complete').setDescription('Messages, invitations et classements').setValue('activite'),
          new StringSelectMenuOptionBuilder().setLabel('Banniere').setDescription('Afficher la banniere du profil').setValue('banniere'),
        );

      await message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
    } catch (e) {
      console.error('Stalk:', e.message);
      message.reply('Erreur lors du stalk.');
    }
  }

  if (cmd === 'naytawa') {
    const role = message.guild.roles.cache.get(IDS.ROLE_NAYTAWA);
    if (!role) return message.reply('Role introuvable.');
    if (message.member.roles.cache.has(IDS.ROLE_NAYTAWA)) return message.reply('Tu as deja ce role !');
    await message.member.roles.add(role);
    const m = await message.reply('Role Naytawa ajoute !');
    setTimeout(() => m.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }

  if (cmd === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Avatar de ${target.tag}`).setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))] });
  }

  if (cmd === 'invites') {
    const target = message.mentions.members.first() || message.member;
    const cnt = inviteCount.get(target.id)||0;
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Invitations de ${target.displayName}`).setDescription(`${target.displayName} a invite **${cnt}** membre${cnt>1?'s':''}.`).setTimestamp()] });
  }

  if (cmd === 'topinvites') {
    const sorted = [...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    if (!sorted.length) return message.reply('Aucune donnee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Top 10 Invitations').setDescription(sorted.map((e,i)=>`Top ${i+1} <@${e[0]}> — ${e[1]} invitation${e[1]>1?'s':''}`).join('\n')).setTimestamp()] });
  }

  if (cmd === 'profil') {
    const target = message.mentions.members.first() || message.member;
    const menu = new StringSelectMenuBuilder().setCustomId(`profil_${target.id}`).setPlaceholder('Choisis ce que tu veux voir').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Date arrivee').setDescription("Date d'arrivee sur le serveur").setValue('arrivee'),
      new StringSelectMenuOptionBuilder().setLabel('Photo de profil').setDescription('PP et banniere').setValue('avatar'),
      new StringSelectMenuOptionBuilder().setLabel('Messages et vocal').setDescription('Stats messages et temps vocal').setValue('stats'),
      new StringSelectMenuOptionBuilder().setLabel('Derniers roles').setDescription('10 derniers roles ajoutes/retires').setValue('roles'),
      new StringSelectMenuOptionBuilder().setLabel('Avertissements').setDescription('10 derniers warns').setValue('warns'),
    );
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: `Profil de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) }).setDescription('Que veux-tu voir ?').setThumbnail(target.user.displayAvatarURL({ dynamic: true })).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (cmd === 's-u') {
    const target = message.mentions.members.first() || message.member;
    const msgs=messageCount.get(target.id)||0, voc=vocTime.get(target.id)||0;
    const h=Math.floor(voc/3600000), m2=Math.floor((voc%3600000)/60000);
    const inv=inviteCount.get(target.id)||0, w=warns.get(target.id)||[];
    const posMsg=[...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const posVoc=[...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const posInv=[...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const embed = new EmbedBuilder().setColor(COLOR)
      .setAuthor({ name: `Stats de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Messages', value: `${msgs.toLocaleString()} messages\nClassement : #${posMsg||'?'}`, inline: true },
        { name: 'Temps vocal', value: `${h}h ${m2}m\nClassement : #${posVoc||'?'}`, inline: true },
        { name: 'Invitations', value: `${inv} invitation${inv>1?'s':''}\nClassement : #${posInv||'?'}`, inline: true },
        { name: 'Avertissements', value: `${w.length} warn${w.length>1?'s':''}`, inline: true },
        { name: 'En vocal', value: vocJoin.has(target.id) ? `Oui (depuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>)` : 'Non', inline: true },
        { name: 'Sur le serveur depuis', value: `<t:${Math.floor(target.joinedTimestamp/1000)}:R>`, inline: true },
        { name: 'Roles', value: target.roles.cache.filter(r=>r.id!==message.guild.id).map(r=>r.toString()).join(' ').slice(0,800)||'Aucun' },
      ).setTimestamp().setFooter({ text: 'Naytawa' });
    const menu = new StringSelectMenuBuilder().setCustomId(`su_${target.id}`).setPlaceholder('Voir plus').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Vocal detaille').setValue('voc_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Historique warns').setValue('warn_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Historique roles').setValue('role_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Activite').setValue('activite'),
    );
    return message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  // WARN / UNWARN
  if (cmd === 'warn') {
    if (!canWarn(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id)||[];
    w.push({ type:'manuel', raison:reason, by:message.author.tag, date:new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}\nTotal : ${w.length}`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Warn').setDescription(`Averti : ${target.user.tag}\nPar : ${message.author.tag}\nRaison : ${reason}\nTotal : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'unwarn') {
    if (!canWarn(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const num = parseInt(args[1]);
    const w = warns.get(target.id)||[];
    if (!num||num<1||num>w.length) return message.reply(`Numero invalide. ${target.user.tag} a ${w.length} warn(s).`);
    const removed = w.splice(num-1,1)[0];
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Warn supprime').setDescription(`Warn n${num} supprime.\nRaison : ${removed.raison}\nWarns restants : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'warns') {
    const target = message.mentions.members.first() || message.member;
    const w = warns.get(target.id)||[];
    if (!w.length) return message.reply(`${target.user.tag} n'a aucun warn.`);
    return message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle(`Warns de ${target.user.tag}`).setDescription(w.map((x,i)=>`${i+1}. ${x.raison||x.type} - ${x.date} par ${x.by||'Auto'}`).join('\n')).setFooter({ text: `Total : ${w.length}` }).setTimestamp()] });
  }

  // GIVEAWAY
  if (cmd === 'giveaway') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const btn = new ButtonBuilder().setCustomId('gw_open_modal').setLabel('Configurer le giveaway').setStyle(ButtonStyle.Primary);
    const m = await message.reply({ content: 'Clique sur le bouton pour configurer le giveaway :', components: [new ActionRowBuilder().addComponents(btn)] });
    const collector = m.createMessageComponentCollector({ filter: i => i.user.id===message.author.id && i.customId==='gw_open_modal', time: 60000, max: 1 });
    collector.on('collect', async i => {
      const modal = new ModalBuilder().setCustomId('gw_create').setTitle('Creer un Giveaway');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_prix').setLabel('Prix du giveaway').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setPlaceholder('Ex: 10 euros Paypal')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_duree').setLabel('Duree (ex: 10m, 1h, 2h, 1j)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10).setPlaceholder('Ex: 1h')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_gagnants').setLabel('Nombre de gagnants (1-10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setPlaceholder('Ex: 1')),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gw_conditions').setLabel('Conditions (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100).setPlaceholder('Ex: voc:5h msg:100 inv:2')),
      );
      await i.showModal(modal);
      await m.edit({ content: 'Formulaire ouvert !', components: [] }).catch(() => {});
    });
    collector.on('end', collected => { if (collected.size===0) m.edit({ content: 'Temps ecoule.', components: [] }).catch(() => {}); });
  }

  if (cmd === 'helpgiveaway') {
    return message.reply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setTitle('Guide Giveaway — Naytawa Bot')
      .addFields(
        { name: '-giveaway', value: 'Ouvre un formulaire pour creer un giveaway. (Admin+)' },
        { name: 'Prix', value: 'Ex: 10 euros Paypal, Nitro 1 mois...' },
        { name: 'Duree', value: 'Ex: 10m = 10 minutes, 1h = 1 heure, 2j = 2 jours' },
        { name: 'Gagnants', value: 'Entre 1 et 10 gagnants.' },
        { name: 'Conditions (optionnel)', value: 'Format : `voc:Xh msg:X inv:X`\nEx: `voc:5h msg:100 inv:2`' },
      ).setFooter({ text: 'Naytawa' })] });
  }

  // WL
  if (cmd === 'wl') {
    if (!canWL(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.add(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.add(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Whitelist').setDescription(`${target.user.tag} ajoute a la whitelist.`).setTimestamp()] });
  }

  if (cmd === 'unwl') {
    if (!canWL(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.delete(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.remove(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Whitelist').setDescription(`${target.user.tag} retire de la whitelist.`).setTimestamp()] });
  }

  if (cmd === 'wllist') {
    if (!canWL(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Whitelist').setDescription(whitelistSet.size ? [...whitelistSet].map(id=>`<@${id}>`).join('\n') : 'Vide').setTimestamp()] });
  }

  // OWNER (invisible)
  if (cmd === 'owner') {
    if (!isRealOwner(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    ownerSet.add(target.id);
    try { await message.delete(); } catch {}
    try { await target.send(`Tu as ete ajoute comme owner sur Naytawa Bot. Tu peux maintenant utiliser toutes les commandes admin.`); } catch {}
  }

  if (cmd === 'unowner') {
    if (!isRealOwner(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    ownerSet.delete(target.id);
    try { await message.delete(); } catch {}
  }

  if (cmd === 'ownerlist') {
    if (!isRealOwner(message.member)) return message.reply('Permission refusee.');
    const list = ownerSet.size ? [...ownerSet].map(id=>`<@${id}>`).join('\n') : 'Aucun owner additionnel.';
    const m = await message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Liste Owners').setDescription(list).setTimestamp()] });
    setTimeout(() => m.delete().catch(() => {}), 15000);
    await message.delete().catch(() => {});
  }

  if (cmd === 'censure') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const etat = args[0]?.toLowerCase();
    if (etat==='on')  { censureActif=true;  return message.reply('Anti-insultes active.'); }
    if (etat==='off') { censureActif=false; return message.reply('Anti-insultes desactive.'); }
    return message.reply(`Anti-insultes : **${censureActif?'Actif':'Desactive'}**`);
  }

  if (cmd === 'antispam') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    if (antiSpamExclus.has(message.channel.id)) { antiSpamExclus.delete(message.channel.id); return message.reply('Anti-spam reactive.'); }
    antiSpamExclus.add(message.channel.id); return message.reply('Anti-spam desactive dans ce salon.');
  }

  if (cmd === 'gif') {
    if (message.author.id !== OWNER_ID) return message.reply('Permission refusee.');
    const lien = args[0];
    if (!lien) return message.reply('Usage : `-gif <lien>`');
    await message.channel.send(lien);
    await message.delete().catch(() => {});
  }

  if (cmd === 'vocsetup') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const channel = message.mentions.channels.first();
    if (!channel || channel.type !== ChannelType.GuildVoice) return message.reply('Mentionne un salon vocal. Usage : `-vocsetup #salon-vocal`');
    VOC_GENERATOR_CHANNEL_ID = channel.id;
    VOC_CATEGORY_ID = channel.parentId || null;
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Voc temporaire configure').setDescription(`Salon generateur : <#${channel.id}>\nCategorie : ${channel.parent?.name||'Meme categorie'}\n\nQuand un membre rejoint <#${channel.id}>, une voc privee est creee.\nElle disparait apres 10 minutes si vide.\nUn membre ne peut avoir qu'une seule voc a la fois.`).setTimestamp()] });
  }

  if (cmd === 'test') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Diagnostic Naytawa Bot')
      .addFields(
        { name: 'Bot', value: `Tag : ${client.user.tag}\nPing : ${client.ws.ping}ms\nUptime : ${Math.floor(client.uptime/1000)}s` },
        { name: 'Systemes', value: `Anti-insultes : ${censureActif?'Actif':'Desactive'}\nWhitelist : ${whitelistSet.size}\nOwners : ${ownerSet.size}\nVoc temp actives : ${tempVocs.size}` },
        { name: 'Voc generateur', value: VOC_GENERATOR_CHANNEL_ID ? `<#${VOC_GENERATOR_CHANNEL_ID}>` : 'Non configure (-vocsetup #salon)' },
        { name: 'Donnees', value: `Messages : ${messageCount.size}\nVocal : ${vocTime.size}\nWarns : ${warns.size}\nInvitations : ${inviteCount.size}\nGiveaways : ${giveaways.size}` },
        { name: 'Salons', value: ['SALON_STATS','SALON_TOP_MSG','SALON_TOP_VOC','SALON_TOP_INVITES','SALON_TICKET_PANEL','LOG_MOD'].map(k=>`${k} : ${message.guild.channels.cache.get(IDS[k])?'OK':'MANQUANT'}`).join('\n') },
      ).setTimestamp()] });
  }

  if (cmd === 'backup') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const guild = message.guild;
    const data = JSON.stringify({ channels: guild.channels.cache.map(c=>({name:c.name,type:c.type,position:c.position,parentId:c.parentId})), roles: guild.roles.cache.filter(r=>r.id!==guild.id).map(r=>({name:r.name,color:r.color,permissions:r.permissions.bitfield.toString(),position:r.position})), memberCount: guild.memberCount, name: guild.name, date: new Date().toISOString() }, null, 2);
    return message.reply({ content: 'Backup genere !', files: [new AttachmentBuilder(Buffer.from(data), { name: `backup-${Date.now()}.json` })] });
  }

  if (cmd === 'make' && args[0]==='panel') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const titre = args[1]||'Panel'; const desc = args.slice(2).join(' ')||'Description.';
    await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: message.guild.iconURL({ dynamic: true }) }).setTitle(titre).setDescription(desc).setTimestamp().setFooter({ text: 'Naytawa' })] });
    await message.delete().catch(() => {});
  }

  if (cmd === 'panel') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const type = args[0]?.toLowerCase();
    if (type==='reglement')    await sendPanelReglement(message.guild);
    else if (type==='roles')   await sendPanelRoles(message.guild);
    else if (type==='tickets') await sendPanelTickets(message.guild);
    else if (type==='prison')  await sendPanelPrison(message.guild);
    else if (type==='top')     { await updateTopMessages(message.guild); await updateTopVoc(); }
    else if (type==='topinvites') await updateTopInvites(message.guild);
    else if (type==='partenariat') await sendPanelPartenariat(message.guild);
    else return message.reply('Types : `reglement` `roles` `tickets` `prison` `top` `topinvites` `partenariat`');
    const confirm = await message.reply('Panel envoye !');
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }

  if (cmd === 'help') {
    const menu = new StringSelectMenuBuilder().setCustomId('help_select').setPlaceholder('Choisis une commande').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('-stalk').setDescription('Stalk complet d un membre').setValue('cmd_stalk'),
      new StringSelectMenuOptionBuilder().setLabel('-naytawa').setDescription('Role Naytawa gratuit').setValue('cmd_naytawa'),
      new StringSelectMenuOptionBuilder().setLabel('-avatar').setDescription('Photo de profil').setValue('cmd_avatar'),
      new StringSelectMenuOptionBuilder().setLabel('-profil').setDescription('Profil interactif').setValue('cmd_profil'),
      new StringSelectMenuOptionBuilder().setLabel('-s-u').setDescription('Stats completes').setValue('cmd_su'),
      new StringSelectMenuOptionBuilder().setLabel('-invites / -topinvites').setDescription('Invitations').setValue('cmd_invites'),
      new StringSelectMenuOptionBuilder().setLabel('-warn / -unwarn / -warns').setDescription('Avertissements').setValue('cmd_warn'),
      new StringSelectMenuOptionBuilder().setLabel('-giveaway').setDescription('Creer un giveaway').setValue('cmd_giveaway'),
      new StringSelectMenuOptionBuilder().setLabel('-wl / -unwl / -wllist').setDescription('Whitelist censure').setValue('cmd_wl'),
      new StringSelectMenuOptionBuilder().setLabel('Admin & Panels').setDescription('Toutes les commandes admin').setValue('cmd_admin'),
    );
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Naytawa Bot — Aide').setDescription('Selectionne une commande pour voir sa description.').setFooter({ text: `Prefixe : ${PREFIX}` }).setTimestamp()], components: [new ActionRowBuilder().addComponents(menu)] });
  }
});

// ══ PANELS ══
async function sendPanelReglement(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT); if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Reglement du serveur').setImage(GIF.REGLEMENT).setDescription(['> Bienvenue ! Merci de respecter ces regles.','','01 - Respectez chaque membre.','02 - Zero discrimination.','03 - Pas de spam, flood ou pub.','04 - Contenu NSFW interdit hors salons dedies.','05 - Bonne conduite en vocal.','06 - Decisions du staff definitives.','07 - Aucun lien suspect.','08 - Une seule identite par personne.','','Conditions : https://discord.com/terms','Regles : https://discord.com/guidelines','','Tape -naytawa pour obtenir un role gratuit !','','*En restant ici, tu acceptes ces regles.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e=>console.error(e.message));
}

async function sendPanelRoles(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_ROLES); if (!salon) return;
  const menu = new StringSelectMenuBuilder().setCustomId('notif_select').setPlaceholder('Choisis tes notifications').addOptions(
    new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Annonces partenariat').setValue('notif_partner'),
    new StringSelectMenuOptionBuilder().setLabel('Sondage').setDescription('Sondages du serveur').setValue('notif_sondage'),
    new StringSelectMenuOptionBuilder().setLabel('Animation').setDescription('Evenements et animations').setValue('notif_anim'),
    new StringSelectMenuOptionBuilder().setLabel('Giveaway').setDescription('Concours et cadeaux').setValue('notif_giveaway'),
  );
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Notifications').setImage(GIF.ROLES).setDescription(['> Choisis les notifications que tu souhaites recevoir.','','Partenariat - Annonces partenariat','Sondage - Sondages du serveur','Animation - Evenements et animations','Giveaway - Concours et cadeaux'].join('\n')).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] }).catch(e=>console.error(e.message));
}

async function sendPanelTickets(guild) {
  const sR = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
  if (sR) await sR.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Regles des tickets').setImage(GIF.TICKET_REGLES).setDescription(['> Avant d\'ouvrir un ticket, lis ces regles.','','01 - Pas de faux tickets ou trolls','02 - Pas d\'insultes envers le staff','03 - Un seul ticket par probleme','04 - Sois poli et respectueux','',`Creer un ticket : <#${IDS.SALON_TICKET_PANEL}>`,'','*Tout abus entraine une sanction.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e=>console.error(e.message));
  const sP = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
  if (sP) {
    const menu = new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Choisis une categorie').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question generale').setValue('ticket_question'),
      new StringSelectMenuOptionBuilder().setLabel('Abus / Probleme').setDescription('Signaler un abus de perm').setValue('ticket_abus'),
      new StringSelectMenuOptionBuilder().setLabel('Staff').setDescription('Candidature moderateur').setValue('ticket_modo'),
      new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Demande de partenariat').setValue('ticket_partner'),
    );
    await sP.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Ouvrir un ticket').setImage(GIF.TICKET_PANEL).setDescription(['> Choisis la categorie de ta demande.','','Question - Une question generale','Abus / Probleme - Signaler un abus de perm','Staff - Candidature moderateur','Partenariat - Demande de partenariat'].join('\n')).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] }).catch(e=>console.error(e.message));
  }
}

async function sendPanelPrison(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_PRISON); if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Bienvenue en prison').setDescription(['> Salut a toi, tu as atterri ici car tu as enfreint les regles.','','Ta sanction est suffisamment grave pour necessiter un passage en prison.','','Pour en sortir, une mission t\'attend.','Un membre de la gestion prison va te contacter.','Sois patient et respectueux.','','Si tu contournes la procedure, ta sanction sera alourdie.','','*Bonne chance.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e=>console.error(e.message));
}

async function sendPanelPartenariat(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_PARTENARIAT); if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Partenariat').setImage(GIF.PARTENARIAT).setDescription(['> Tu souhaites devenir partenaire de Naytawa ?','','01 - Minimum 100 membres','02 - Serveur actif','03 - Pas de contenu illicite','04 - Avoir un salon partenariat','',`Ouvre un ticket dans <#${IDS.SALON_TICKET_PANEL}>`].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e=>console.error(e.message));
}

// ══ LOGS ══
client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG); if (!logCh) return;
  const embed = new EmbedBuilder().setColor('#ed4245').setTitle('Message supprime').setDescription(`Auteur : ${message.author?.tag}\nSalon : <#${message.channel.id}>\nContenu : ${message.content?message.content.slice(0,1000):'Non disponible'}`).setTimestamp();
  if (message.attachments.size>0) embed.addFields({ name: 'Pieces jointes', value: message.attachments.map(a=>a.url).join('\n') });
  logCh.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (oldMessage.content===newMessage.content) return;
  const logCh = newMessage.guild?.channels.cache.get(IDS.LOG_MSG); if (!logCh) return;
  logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Message modifie').setDescription(`Auteur : ${newMessage.author?.tag}\nSalon : <#${newMessage.channel.id}>\nAvant : ${oldMessage.content?.slice(0,500)||'N/A'}\nApres : ${newMessage.content?.slice(0,500)}`).setTimestamp()] });
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild  = interaction.guild;

    // ─── MODALS ───
    if (interaction.isModalSubmit() && interaction.customId==='gw_create') {
      await interaction.deferReply({ ephemeral: true });
      const prix=interaction.fields.getTextInputValue('gw_prix');
      const dureeStr=interaction.fields.getTextInputValue('gw_duree');
      const gagnants=Math.min(10,Math.max(1,parseInt(interaction.fields.getTextInputValue('gw_gagnants'))||1));
      const condStr=interaction.fields.getTextInputValue('gw_conditions');
      const dureeMs=parseDuree(dureeStr); const conditions=parseConditions(condStr); const endTime=Date.now()+dureeMs;
      const condLines=[];
      if (conditions.vocMin>0) condLines.push(`Vocal : ${conditions.vocMin}h minimum`);
      if (conditions.msgMin>0) condLines.push(`Messages : ${conditions.msgMin} minimum`);
      if (conditions.invMin>0) condLines.push(`Invitations : ${conditions.invMin} minimum`);
      const embed = new EmbedBuilder().setColor('#f1c40f').setTitle(`Giveaway — ${prix}`)
        .setDescription([`Fin : <t:${Math.floor(endTime/1000)}:R> (<t:${Math.floor(endTime/1000)}:F>)`,`Gagnants : ${gagnants}`,`Duree : ${parseDureeLabel(dureeMs)}`,condLines.length?`\nConditions :\n${condLines.join('\n')}`:'\nPas de conditions.',`\nParticipants : 0`].join('\n'))
        .setTimestamp().setFooter({ text: 'Naytawa • Giveaway' });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_participer').setLabel('Participer').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gw_participants').setLabel('Voir les participants').setStyle(ButtonStyle.Secondary),
      );
      const gwMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
      giveaways.set(gwMsg.id, { messageId:gwMsg.id, channelId:interaction.channel.id, guildId:guild.id, prix, nbGagnants:gagnants, conditions, endTime, participants:[], ended:false });
      await interaction.editReply({ content: `Giveaway lance ! Termine <t:${Math.floor(endTime/1000)}:R>.` });
      return;
    }

    // ─── SELECT MENUS ───
    if (interaction.isStringSelectMenu()) {

      // Help
      if (interaction.customId==='help_select') {
        const pages = {
          cmd_stalk:   { title: '-stalk [@user]', desc: 'Stalk complet d\'un membre.\n\nUtilisation : `-stalk @user` ou `-stalk` (toi-meme)\n\nAffiche :\n- Infos compte (tag, ID, age, badges Discord)\n- Infos serveur (date arrivee, anciennete, nickname)\n- Statut et activite (Spotify, jeux, status perso)\n- Stats vocales et classement\n- Stats messages et invitations\n- Moderation (warns, whitelist)\n- Tous les roles\n- Banniere si disponible\n\nMenu interactif pour voir encore plus de details.' },
          cmd_naytawa: { title: '-naytawa', desc: 'Obtenir le role Naytawa gratuitement.\n\nUtilisation : `-naytawa`\n\nDonne automatiquement le role Naytawa. Pas besoin de permission.' },
          cmd_avatar:  { title: '-avatar [@user]', desc: 'Afficher la photo de profil d\'un membre.\n\nUtilisation : `-avatar` ou `-avatar @user`' },
          cmd_profil:  { title: '-profil [@user]', desc: 'Profil interactif d\'un membre.\n\nMenu avec : date arrivee, photo de profil, stats, roles, warns.' },
          cmd_su:      { title: '-s-u [@user]', desc: 'Stats completes d\'un membre.\n\nMessages, vocal, invitations, warns, statut vocal, roles.\nMenu pour voir le detail vocal, warns, roles et activite.' },
          cmd_invites: { title: '-invites / -topinvites', desc: '-invites [@user] : invitations d\'un membre.\n-topinvites : top 10 des inviteurs du serveur.' },
          cmd_warn:    { title: '-warn / -unwarn / -warns', desc: '-warn @user <raison> : avertir un membre.\n-unwarn @user <numero> : supprimer un warn.\n-warns [@user] : voir les warns.\n\nAccessible avec le role de permission.' },
          cmd_giveaway:{ title: '-giveaway', desc: 'Creer un giveaway interactif.\n\nPrix, duree, gagnants, conditions (voc/msg/inv).\nLes participants voient leurs stats vs conditions en temps reel.' },
          cmd_wl:      { title: '-wl / -unwl / -wllist', desc: '-wl @user : ajouter a la whitelist censure.\n-unwl @user : retirer.\n-wllist : voir la liste.\n\nLes membres WL ne sont pas affectes par anti-insultes et anti-spam.\nRole special requis.' },
          cmd_admin:   { title: 'Admin & Panels', desc: '-panel reglement/roles/tickets/prison/top/topinvites/partenariat\n-make panel <titre> <desc>\n-censure on/off\n-antispam\n-vocsetup #salon (vocs temporaires)\n-test (diagnostic)\n-backup (sauvegarde)\n-gif <lien> (owner)\n-owner @user (ajouter owner invisible)\n-unowner @user\n-ownerlist' },
        };
        const page = pages[interaction.values[0]];
        if (page) return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(page.title).setDescription(page.desc).setFooter({ text: 'Naytawa' }).setTimestamp()], ephemeral: true });
      }

      // Stalk detail
      if (interaction.customId.startsWith('stalk_')) {
        const targetId = interaction.customId.replace('stalk_','');
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0];
        let embed;

        if (val === 'voc') {
          const voc = vocTime.get(target.id)||0;
          const h=Math.floor(voc/3600000), mn=Math.floor((voc%3600000)/60000), s=Math.floor((voc%60000)/1000);
          const inVoc = vocJoin.has(target.id);
          const vocCh = inVoc ? guild.voiceStates.cache.get(target.id)?.channel : null;
          const posVoc = [...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
          embed = new EmbedBuilder().setColor(COLOR).setTitle(`Vocal complet — ${target.displayName}`)
            .addFields(
              { name: 'Temps total', value: `${h}h ${mn}m ${s}s`, inline: true },
              { name: 'Classement', value: `#${posVoc||'?'}`, inline: true },
              { name: 'Statut actuel', value: inVoc ? `En vocal dans <#${vocCh?.id}>\nDepuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>` : 'Pas en vocal', inline: false },
            ).setThumbnail(target.user.displayAvatarURL({ dynamic: true })).setTimestamp();
        }

        if (val === 'warns') {
          const w = warns.get(target.id)||[];
          embed = new EmbedBuilder().setColor('#faa61a').setTitle(`Warns complets — ${target.displayName}`)
            .setDescription(w.length ? w.map((x,i)=>`**${i+1}.** ${x.raison||x.type}\n   Date : ${x.date} | Par : ${x.by||'Auto'}`).join('\n\n') : 'Aucun avertissement.')
            .setFooter({ text: `Total : ${w.length} warn(s)` }).setTimestamp();
        }

        if (val === 'roles') {
          const hist = rolesHistory.get(target.id)||[];
          const current = target.roles.cache.filter(r=>r.id!==guild.id).sort((a,b)=>b.position-a.position).map(r=>`${r.toString()} (pos: ${r.position})`).join('\n').slice(0,900)||'Aucun';
          embed = new EmbedBuilder().setColor(COLOR).setTitle(`Roles — ${target.displayName}`)
            .addFields(
              { name: `Roles actuels (${target.roles.cache.size-1})`, value: current },
              { name: 'Derniers changements', value: hist.length ? hist.slice(0,15).map((h,i)=>`${i+1}. ${h.type==='ajoute'?'➕':'➖'} **${h.name}** — ${h.date}`).join('\n') : 'Aucun historique' },
            ).setTimestamp();
        }

        if (val === 'activite') {
          const msgs = messageCount.get(target.id)||0;
          const inv  = inviteCount.get(target.id)||0;
          const posMsg = [...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
          const posInv = [...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
          embed = new EmbedBuilder().setColor(COLOR).setTitle(`Activite — ${target.displayName}`)
            .addFields(
              { name: 'Messages envoyes', value: `**${msgs.toLocaleString()}**\nClassement : #${posMsg||'?'}`, inline: true },
              { name: 'Invitations', value: `**${inv}**\nClassement : #${posInv||'?'}`, inline: true },
            ).setTimestamp();
        }

        if (val === 'banniere') {
          const user = await target.user.fetch({ force: true }).catch(() => target.user);
          const bannerUrl = user.bannerURL({ size: 1024 });
          embed = new EmbedBuilder().setColor(COLOR).setTitle(`Banniere — ${target.displayName}`);
          if (bannerUrl) embed.setImage(bannerUrl);
          else embed.setDescription('Ce membre n\'a pas de banniere.');
          embed.setTimestamp();
        }

        if (embed) return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Notifications
      if (interaction.customId==='notif_select') {
        const notifMap = { notif_partner:IDS.ROLE_NOTIF_PARTNER, notif_sondage:IDS.ROLE_NOTIF_SONDAGE, notif_anim:IDS.ROLE_NOTIF_ANIM, notif_giveaway:IDS.ROLE_NOTIF_GIVEAWAY };
        const roleId = notifMap[interaction.values[0]];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Notification ${role.name} desactivee !`, ephemeral: true }); }
        await member.roles.add(role); return interaction.reply({ content: `Notification ${role.name} activee !`, ephemeral: true });
      }

      // Tickets
      if (interaction.customId==='ticket_select') {
        const typeMap = { ticket_question:'Question', ticket_abus:'Abus / Probleme', ticket_modo:'Devenir Moderateur', ticket_partner:'Partenariat' };
        const type = typeMap[interaction.values[0]];
        const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20);
        const existing = guild.channels.cache.find(c => c.name===`ticket-${safeName}` && c.parentId===IDS.CAT_TICKETS);
        if (existing) return interaction.reply({ content: 'Tu as deja un ticket ouvert !', ephemeral: true });
        const ticketChannel = await guild.channels.create({
          name: `ticket-${safeName}`, type: ChannelType.GuildText, parent: IDS.CAT_TICKETS,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: IDS.ROLE_TICKET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });
        let extra = interaction.values[0]==='ticket_partner' ? '\n\nMerci de fournir :\n- Nom du serveur\n- Lien invitation\n- Nombre membres\n- Raison' : '';
        const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle(`Ticket - ${type}`).setDescription(`Bonjour ${member} !\n\nType : ${type}\nCree le : <t:${Math.floor(Date.now()/1000)}:F>${extra}`).setFooter({ text: 'Naytawa' }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel('Je le prends en charge').setStyle(ButtonStyle.Success),
        );
        await ticketChannel.send({ content: `<@&${IDS.ROLE_TICKET}>`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Ticket cree : ${ticketChannel}`, ephemeral: true });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Nouveau ticket').setDescription(`Par : ${member.user.tag}\nType : ${type}\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        return;
      }

      // Profil
      if (interaction.customId.startsWith('profil_')) {
        const targetId = interaction.customId.replace('profil_','');
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0]; let embed;
        if (val==='arrivee') embed = new EmbedBuilder().setColor(COLOR).setTitle(`Arrivee de ${target.displayName}`).addFields({ name: 'Arrive le', value: `<t:${Math.floor(target.joinedTimestamp/1000)}:F> (<t:${Math.floor(target.joinedTimestamp/1000)}:R>)` }, { name: 'Compte cree le', value: `<t:${Math.floor(target.user.createdTimestamp/1000)}:F>` }).setTimestamp();
        if (val==='avatar') { const u=await target.user.fetch(); embed=new EmbedBuilder().setColor(COLOR).setTitle(`PP de ${target.displayName}`).setImage(target.user.displayAvatarURL({ dynamic:true, size:1024 })).setTimestamp(); if (u.bannerURL()) embed.addFields({ name: 'Banniere', value: `[Voir](${u.bannerURL({ size:1024 })})` }); }
        if (val==='stats') { const ms=messageCount.get(target.id)||0; const vc=vocTime.get(target.id)||0; const hh=Math.floor(vc/3600000); const mm=Math.floor((vc%3600000)/60000); const pm=[...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1; const pv=[...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1; embed=new EmbedBuilder().setColor(COLOR).setTitle(`Stats de ${target.displayName}`).addFields({ name:'Messages', value:`${ms.toLocaleString()}\n#${pm||'?'}`, inline:true }, { name:'Vocal', value:`${hh}h ${mm}m\n#${pv||'?'}`, inline:true }).setTimestamp(); }
        if (val==='roles') { const hist=rolesHistory.get(target.id)||[]; embed=new EmbedBuilder().setColor(COLOR).setTitle(`Roles de ${target.displayName}`).addFields({ name:'Roles actuels', value:target.roles.cache.filter(r=>r.id!==guild.id).map(r=>r.toString()).join(' ').slice(0,800)||'Aucun' }, { name:'Historique', value:hist.length?hist.slice(0,10).map((h,i)=>`${i+1}. ${h.type==='ajoute'?'+':'-'} ${h.name} - ${h.date}`).join('\n'):'Aucun' }).setTimestamp(); }
        if (val==='warns') { const w=warns.get(target.id)||[]; embed=new EmbedBuilder().setColor(COLOR).setTitle(`Warns de ${target.displayName}`).setDescription(w.length?w.slice(-10).map((x,i)=>`${i+1}. ${x.raison||x.type} - ${x.date} par ${x.by||'Auto'}`).join('\n'):'Aucun warn.').setFooter({ text:`Total : ${w.length}` }).setTimestamp(); }
        if (embed) return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // S-U detail
      if (interaction.customId.startsWith('su_')) {
        const targetId = interaction.customId.replace('su_','');
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0]; let embed;
        if (val==='voc_detail') { const vc=vocTime.get(target.id)||0; const hh=Math.floor(vc/3600000); const mm=Math.floor((vc%3600000)/60000); const ss=Math.floor((vc%60000)/1000); embed=new EmbedBuilder().setColor(COLOR).setTitle(`Vocal — ${target.displayName}`).addFields({ name:'Temps total', value:`${hh}h ${mm}m ${ss}s` }, { name:'En vocal', value:vocJoin.has(target.id)?`Oui (depuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>)`:'Non' }, { name:'Classement', value:`#${[...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}` }).setTimestamp(); }
        if (val==='warn_detail') { const w=warns.get(target.id)||[]; embed=new EmbedBuilder().setColor('#faa61a').setTitle(`Warns — ${target.displayName}`).setDescription(w.length?w.map((x,i)=>`${i+1}. ${x.raison||x.type} — ${x.date} par ${x.by||'Auto'}`).join('\n'):'Aucun warn.').setFooter({ text:`Total : ${w.length}` }).setTimestamp(); }
        if (val==='role_detail') { const hist=rolesHistory.get(target.id)||[]; embed=new EmbedBuilder().setColor(COLOR).setTitle(`Roles — ${target.displayName}`).setDescription(hist.length?hist.map((h,i)=>`${i+1}. ${h.type==='ajoute'?'➕':'➖'} ${h.name} — ${h.date}`).join('\n'):'Aucun historique.').setTimestamp(); }
        if (val==='activite') { const ms=messageCount.get(target.id)||0; const iv=inviteCount.get(target.id)||0; embed=new EmbedBuilder().setColor(COLOR).setTitle(`Activite — ${target.displayName}`).addFields({ name:'Messages', value:`${ms.toLocaleString()}\n#${[...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}`, inline:true }, { name:'Invitations', value:`${iv}\n#${[...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}`, inline:true }).setTimestamp(); }
        if (embed) return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // ─── BOUTONS ───
    if (interaction.isButton()) {
      if (interaction.customId==='gw_participer') {
        const gwData = giveaways.get(interaction.message.id);
        if (!gwData||gwData.ended) return interaction.reply({ content: 'Ce giveaway est termine.', ephemeral: true });
        const voc=vocTime.get(member.id)||0, msgs=messageCount.get(member.id)||0, inv=inviteCount.get(member.id)||0;
        const condLines=[];
        if (gwData.conditions.vocMin>0) condLines.push(`Vocal : ${(voc/3600000).toFixed(1)}h / ${gwData.conditions.vocMin}h ${voc/3600000>=gwData.conditions.vocMin?'✅':'❌'}`);
        if (gwData.conditions.msgMin>0) condLines.push(`Messages : ${msgs} / ${gwData.conditions.msgMin} ${msgs>=gwData.conditions.msgMin?'✅':'❌'}`);
        if (gwData.conditions.invMin>0) condLines.push(`Invitations : ${inv} / ${gwData.conditions.invMin} ${inv>=gwData.conditions.invMin?'✅':'❌'}`);
        const condText = condLines.length ? `\n\nTes stats :\n${condLines.join('\n')}` : '';
        if (gwData.participants.includes(member.id)) {
          gwData.participants = gwData.participants.filter(id=>id!==member.id);
          giveaways.set(interaction.message.id, gwData);
          const newDesc = interaction.message.embeds[0].description.replace(/Participants : \d+/, `Participants : ${gwData.participants.length}`);
          await interaction.message.edit({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setDescription(newDesc)] }).catch(() => {});
          return interaction.reply({ content: `Tu t'es desincrit.${condText}`, ephemeral: true });
        }
        gwData.participants.push(member.id);
        giveaways.set(interaction.message.id, gwData);
        const newDesc = interaction.message.embeds[0].description.replace(/Participants : \d+/, `Participants : ${gwData.participants.length}`);
        await interaction.message.edit({ embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setDescription(newDesc)] }).catch(() => {});
        return interaction.reply({ content: `Tu participes !${condText}`, ephemeral: true });
      }

      if (interaction.customId==='gw_participants') {
        const gwData = giveaways.get(interaction.message.id);
        if (!gwData) return interaction.reply({ content: 'Donnees introuvables.', ephemeral: true });
        const lines = gwData.participants.slice(0,25).map((id,i)=>`${i+1}. <@${id}>`).join('\n')||'Aucun participant.';
        return interaction.reply({ content: `**Participants (${gwData.participants.length}) :**\n${lines}`, ephemeral: true });
      }

      if (interaction.customId==='ticket_prendre') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_fermer').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_prendre').setLabel(`Pris en charge par ${member.displayName}`).setStyle(ButtonStyle.Success).setDisabled(true),
        );
        await interaction.update({ components: [row] });
        await interaction.channel.send(`Ce ticket est pris en charge par ${member} !`);
        return;
      }

      if (interaction.customId==='ticket_fermer') {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par ${member}\nSuppression dans 5s...`).setTimestamp()] });
        const logCh = guild.channels.cache.get(IDS.LOG_TICKET);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par : ${member.user.tag}\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
    }

  } catch (e) { console.error('Interaction:', e.message); }
});

client.login(process.env.DISCORD_TOKEN);
