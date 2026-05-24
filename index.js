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
const COLOR  = '#C8A951'; // doré/marron clair
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
  ROLE_WPERM:          '1506650704243069158',
  ROLE_MIDPERM:        '1506650786354958396',
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
const wpermSet       = new Set();
const midpermSet     = new Set();
const antiSpamExclus = new Set();
const spamTracker    = new Map();
const giveaways      = new Map(); // msgId -> giveaway data
const gwSetup        = new Map(); // userId -> setup data
const autoreponseCD  = new Map();
let censureActif     = true;
let botPingCooldown  = null;
let botPingStage     = 0;

// ══ PERMISSIONS — vérifie RÔLE ET SET ══
function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild);
}
function isWperm(member) {
  return isAdmin(member) ||
         member.roles.cache.has(IDS.ROLE_WPERM) ||
         wpermSet.has(member.id);
}
function isMidperm(member) {
  return isWperm(member) ||
         member.roles.cache.has(IDS.ROLE_MIDPERM) ||
         midpermSet.has(member.id);
}
function getNiveau(member) {
  if (isAdmin(member))  return 'Admin';
  if (isWperm(member))  return 'Wperm';
  if (isMidperm(member)) return 'Midperm';
  return 'Libre';
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
    if (invites) inviteTracker.set(guild.id, new Map(invites.map(i => [i.code, { uses: i.uses || 0, inviterId: i.inviter?.id }])));
  }
  // Stats toutes les 2 minutes exactement
  setInterval(updateStats, 120000);
  // Top vocal toutes les 5 minutes
  setInterval(updateTopVoc, 300000);
  // Check giveaways toutes les 15 secondes
  setInterval(checkGiveaways, 15000);
});

client.on('inviteCreate', invite => {
  const map = inviteTracker.get(invite.guild.id) || new Map();
  map.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id });
  inviteTracker.set(invite.guild.id, map);
});

// ══ STATS — nouveau message toutes les 2 minutes ══
async function updateStats() {
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
      .setColor(COLOR)
      .setTitle('Statistiques du serveur')
      .setDescription(`Membres : ${total}\nEn ligne : ${online}\nEn vocal : ${voc}\nBoosts : ${boosts}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Naytawa' });
    // On cherche le dernier message du bot et on l'édite — sinon on envoie
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === 'Statistiques du serveur');
    if (ex) await ex.edit({ embeds: [embed] }).catch(() => salon.send({ embeds: [embed] }));
    else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('Stats:', e.message); }
}

// ══ TOP MESSAGES ══
async function updateTopMessages(guild) {
  if (!guild) return;
  try {
    await guild.members.fetch();
    const sorted  = [...messageCount.entries()].sort((a, b) => b[1] - a[1]);
    const top3Ids = sorted.slice(0, 3).map(e => e[0]);
    const roleId  = IDS.ROLE_TOP3_MSG;
    const role    = guild.roles.cache.get(roleId);
    if (role) {
      for (const [, m] of guild.members.cache) {
        if (m.roles.cache.has(roleId) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(roleId) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_MSG);
    if (!salon) return;
    const lines = sorted.slice(0, 10).map((e, i) => `Top ${i+1} <@${e[0]}> — ${e[1].toLocaleString()} messages`);
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Messages').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Messages');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('UpdateTopMessages:', e.message); }
}

// ══ TOP VOCAL ══
async function updateTopVoc() {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    await guild.members.fetch();
    for (const [userId, joinTime] of vocJoin) {
      vocTime.set(userId, (vocTime.get(userId) || 0) + (Date.now() - joinTime));
      vocJoin.set(userId, Date.now());
    }
    const sorted  = [...vocTime.entries()].sort((a, b) => b[1] - a[1]);
    const top3Ids = sorted.slice(0, 3).map(e => e[0]);
    const roleId  = IDS.ROLE_TOP3_VOC;
    const role    = guild.roles.cache.get(roleId);
    if (role) {
      for (const [, m] of guild.members.cache) {
        if (m.roles.cache.has(roleId) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(roleId) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_VOC);
    if (!salon) return;
    const lines = sorted.slice(0, 10).map((e, i) => {
      const h = Math.floor(e[1]/3600000); const mn = Math.floor((e[1]%3600000)/60000);
      return `Top ${i+1} <@${e[0]}> — ${h}h ${mn}m`;
    });
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Vocal').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Vocal');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('UpdateTopVoc:', e.message); }
}

// ══ TOP INVITATIONS ══
async function updateTopInvites(guild) {
  try {
    await guild.members.fetch();
    const sorted  = [...inviteCount.entries()].sort((a, b) => b[1] - a[1]);
    const top3Ids = sorted.slice(0, 3).map(e => e[0]);
    const roleId  = IDS.ROLE_TOP3_INVITES;
    const role    = guild.roles.cache.get(roleId);
    if (role) {
      for (const [, m] of guild.members.cache) {
        if (m.roles.cache.has(roleId) && !top3Ids.includes(m.id)) await m.roles.remove(role).catch(() => {});
        if (!m.roles.cache.has(roleId) && top3Ids.includes(m.id)) await m.roles.add(role).catch(() => {});
      }
    }
    const salon = guild.channels.cache.get(IDS.SALON_TOP_INVITES);
    if (!salon) return;
    const lines = sorted.slice(0, 10).map((e, i) => `Top ${i+1} <@${e[0]}> — ${e[1]} invitation${e[1]>1?'s':''}`);
    const embed = new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Top 10 Invitations').setImage(GIF.TOP).setDescription(lines.length ? lines.join('\n') : 'Aucune donnee.').setTimestamp().setFooter({ text: 'Naytawa' });
    const msgs = await salon.messages.fetch({ limit: 10 });
    const ex = msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title === 'Top 10 Invitations');
    if (ex) await ex.edit({ embeds: [embed] }); else await salon.send({ embeds: [embed] });
  } catch (e) { console.error('UpdateTopInvites:', e.message); }
}

// ══ GIVEAWAY CHECK ══
async function checkGiveaways() {
  const now = Date.now();
  for (const [id, gw] of giveaways) {
    if (!gw.ended && now >= gw.endTime) {
      gw.ended = true;
      giveaways.set(id, gw);
      finishGiveaway(gw).catch(e => console.error('FinishGW:', e.message));
    }
  }
}

async function finishGiveaway(gw) {
  const guild   = client.guilds.cache.get(gw.guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(gw.channelId);
  if (!channel) return;
  const msg = await channel.messages.fetch(gw.messageId).catch(() => null);

  const eligibles = [];
  for (const userId of gw.participants) {
    const vocH = (vocTime.get(userId) || 0) / 3600000;
    const msgs = messageCount.get(userId) || 0;
    const inv  = inviteCount.get(userId) || 0;
    if (gw.conditions.vocMin > 0 && vocH < gw.conditions.vocMin) continue;
    if (gw.conditions.msgMin > 0 && msgs < gw.conditions.msgMin) continue;
    if (gw.conditions.invMin > 0 && inv  < gw.conditions.invMin) continue;
    eligibles.push(userId);
  }

  const pool = [...eligibles];
  const gagnants = [];
  for (let i = 0; i < Math.min(gw.nbGagnants, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    gagnants.push(pool.splice(idx, 1)[0]);
  }

  const embed = new EmbedBuilder()
    .setColor('#f1c40f')
    .setTitle(`Giveaway termine — ${gw.prix}`)
    .setDescription(gagnants.length > 0
      ? `Gagnant${gagnants.length>1?'s':''} : ${gagnants.map(id=>`<@${id}>`).join(', ')}\nEligibles : ${eligibles.length}/${gw.participants.length}`
      : 'Aucun participant eligible !')
    .setTimestamp()
    .setFooter({ text: 'Naytawa • Giveaway termine' });

  if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
  if (gagnants.length > 0) await channel.send(`Felicitations ${gagnants.map(id=>`<@${id}>`).join(', ')} ! Vous avez gagne **${gw.prix}** !`);
  else await channel.send(`Aucun participant eligible pour **${gw.prix}**.`);
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
      const cnt = (inviteCount.get(inviterId) || 0) + 1;
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

// ══ MESSAGES ══
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const contentLower = message.content.toLowerCase();

  // Mention bot — ignore @everyone / @here
  if (
    message.mentions.has(client.user) &&
    !message.mentions.everyone &&
    !message.content.includes('@everyone') &&
    !message.content.includes('@here') &&
    !message.content.startsWith(PREFIX)
  ) {
    const now = Date.now();
    if (botPingCooldown && (now - botPingCooldown) < 2*60*60*1000) return;
    if (botPingStage === 0)      { await message.reply("Ntm fdp (mon prefixe c'est -)"); botPingStage = 1; }
    else if (botPingStage === 1) { await message.reply('Ftg frr cplc'); botPingStage = 2; }
    else {
      await message.reply("Sayez je parle plus, t'es moche + t'as pas d'avenir, tu clc a un bot fdp ntm va bz ton pere sah trdc trbl enfant de merde suce ma bite sale pute j'espere tu te reveilles pas encule");
      try { await message.member.timeout(60*1000); } catch {}
      try { await message.author.send("Prends-le pas personnellement, on me clc a me ping h24, desole de t'avoir insulte et mute"); } catch {}
      botPingStage = 0; botPingCooldown = now;
    }
    return;
  }

  // Auto react
  if (message.channel.id === IDS.SALON_AUTO_REACT) await message.react('❤️').catch(() => {});
  if (message.channel.id === IDS.SALON_SELFIE)     await message.react('🤍').catch(() => {});

  // Auto reponses
  if (contentLower.includes("je t'aime pas") && peutRepondre(message.author.id, 'aimepas'))
    await message.reply('Comment tu veux j\'te dise "ti amo" si y a pas d\'amour? - timar MIEUX QU\'HIER');
  if (contentLower.includes('bot de merde') && peutRepondre(message.author.id, 'botmerde'))
    await message.reply('Rien a change, j\'ferais toujours chanter la zone meme au sommet, j\'ferais toujours danser la zone (tiki-tiki-tiki) - l2b La Zone');
  if (contentLower.includes("j'aime mon ex") && peutRepondre(message.author.id, 'ex'))
    await message.reply('Les comebacks, ca sert a rien, ca sert a rien, viens pas perdre ta dignite - l2b Billionaire');
  if ((contentLower.includes('incapable') || contentLower.includes('tocard') || contentLower.includes('loser')) && peutRepondre(message.author.id, 'loser'))
    await message.reply("Peut-etre que tu crois qu'on n'a pas travaille sur la route du bonheur, je cavalais");

  const isWL = message.member?.roles.cache.has(IDS.ROLE_WL) || whitelistSet.has(message.author.id);

  // Anti spam
  if (!isWL && checkSpam(message)) {
    try {
      await message.delete();
      await message.member.timeout(5*60*1000, 'Spam detecte');
      const w = await message.channel.send(`${message.author} spam detecte, mute 5 minutes.`);
      setTimeout(() => w.delete().catch(() => {}), 5000);
    } catch {}
    return;
  }

  // Anti insultes
  if (!isWL) {
    const motTrouve = contientMotInterdit(message.content);
    if (motTrouve) {
      try {
        await message.delete();
        const w = warns.get(message.author.id) || [];
        const infractions = w.filter(x => x.type === 'insulte').length;
        const duree = infractions === 0 ? 15 : infractions === 1 ? 25 : 30;
        const raison = `Infraction n${infractions+1} — langage inapproprie`;
        w.push({ type: 'insulte', mot: motTrouve, raison, date: new Date().toLocaleDateString('fr-FR'), duree, by: 'Auto' });
        warns.set(message.author.id, w);
        await message.member.timeout(duree*60*1000, raison).catch(() => {});
        const muteEnd = Math.floor((Date.now() + duree*60*1000) / 1000);
        if (infractions >= 2) setTimeout(() => { const cw = warns.get(message.author.id)||[]; warns.set(message.author.id, cw.filter(x => x.type !== 'insulte')); }, 60*60*1000);
        try { await message.author.send(`Tu as ete mute ${duree} minutes sur Naytawa.\nRaison : ${raison}\nFin : <t:${muteEnd}:F>`); } catch {}
        const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Auto-moderation').setDescription(`Membre : ${message.author.tag} (${message.author.id})\nSalon : <#${message.channel.id}>\nMot : ||${motTrouve}||\nDuree : ${duree} min\nFin : <t:${muteEnd}:F>`).setTimestamp()] });
        const warn = await message.channel.send(`${message.author} message supprime. Mute ${duree} minutes.`);
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
  const cmd  = args.shift().toLowerCase();

  // ════════════════ COMMANDES LIBRES ════════════════

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

  if (cmd === 'love') return message.channel.send(VIDEO_LOVE);

  if (cmd === 'invites') {
    const target = message.mentions.members.first() || message.member;
    const cnt = inviteCount.get(target.id) || 0;
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle(`Invitations de ${target.displayName}`).setDescription(`${target.displayName} a invite **${cnt}** membre${cnt>1?'s':''}.`).setTimestamp()] });
  }

  if (cmd === 'topinvites') {
    const sorted = [...inviteCount.entries()].sort((a,b) => b[1]-a[1]).slice(0,10);
    if (!sorted.length) return message.reply('Aucune donnee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Top 10 Invitations').setDescription(sorted.map((e,i)=>`Top ${i+1} <@${e[0]}> — ${e[1]} invitation${e[1]>1?'s':''}`).join('\n')).setTimestamp()] });
  }

  if (cmd === 'profil') {
    const target = message.mentions.members.first() || message.member;
    const menu = new StringSelectMenuBuilder().setCustomId(`profil_${target.id}`).setPlaceholder('Choisis ce que tu veux voir').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Date arrivee').setDescription("Date d'arrivee").setValue('arrivee'),
      new StringSelectMenuOptionBuilder().setLabel('Photo de profil').setDescription('PP et banniere').setValue('avatar'),
      new StringSelectMenuOptionBuilder().setLabel('Messages et vocal').setDescription('Stats').setValue('stats'),
      new StringSelectMenuOptionBuilder().setLabel('Derniers roles').setDescription('10 derniers roles').setValue('roles'),
      new StringSelectMenuOptionBuilder().setLabel('Avertissements').setDescription('10 derniers warns').setValue('warns'),
    );
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: `Profil de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) }).setDescription('Que veux-tu voir ?').setThumbnail(target.user.displayAvatarURL({ dynamic: true })).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (cmd === 's-u') {
    const target = message.mentions.members.first() || message.member;
    const msgs = messageCount.get(target.id) || 0;
    const voc  = vocTime.get(target.id) || 0;
    const h    = Math.floor(voc/3600000);
    const m2   = Math.floor((voc%3600000)/60000);
    const inv  = inviteCount.get(target.id) || 0;
    const w    = warns.get(target.id) || [];
    const posMsg = [...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const posVoc = [...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const posInv = [...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1;
    const inVoc  = vocJoin.has(target.id);
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: `Stats de ${target.displayName}`, iconURL: target.user.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Messages', value: `${msgs.toLocaleString()} messages\nClassement : #${posMsg||'?'}`, inline: true },
        { name: 'Temps vocal', value: `${h}h ${m2}m\nClassement : #${posVoc||'?'}`, inline: true },
        { name: 'Invitations', value: `${inv} invitation${inv>1?'s':''}\nClassement : #${posInv||'?'}`, inline: true },
        { name: 'Avertissements', value: `${w.length} warn${w.length>1?'s':''}`, inline: true },
        { name: 'En vocal', value: inVoc ? `Oui (depuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>)` : 'Non', inline: true },
        { name: 'Sur le serveur depuis', value: `<t:${Math.floor(target.joinedTimestamp/1000)}:R>`, inline: true },
        { name: 'Roles', value: target.roles.cache.filter(r=>r.id!==message.guild.id).map(r=>r.toString()).join(' ').slice(0,800)||'Aucun' },
      )
      .setTimestamp().setFooter({ text: 'Naytawa' });
    const menu = new StringSelectMenuBuilder().setCustomId(`su_${target.id}`).setPlaceholder('Voir plus de details').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Vocal detaille').setDescription('Temps exact et statut').setValue('voc_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Historique warns').setDescription('Tous les warns').setValue('warn_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Historique roles').setDescription('Derniers roles').setValue('role_detail'),
      new StringSelectMenuOptionBuilder().setLabel('Activite').setDescription('Messages et invitations').setValue('activite'),
    );
    return message.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (cmd === 'help') {
    const menu = new StringSelectMenuBuilder().setCustomId('help_select').setPlaceholder('Choisis une categorie').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Commandes libres').setDescription('Tout le monde').setValue('libre'),
      new StringSelectMenuOptionBuilder().setLabel('Moderation').setDescription('Warn, mute, ban, kick...').setValue('modo'),
      new StringSelectMenuOptionBuilder().setLabel('Giveaway').setDescription('Systeme de giveaway').setValue('giveaway'),
      new StringSelectMenuOptionBuilder().setLabel('Permissions').setDescription('Wperm, midperm, whitelist').setValue('perms'),
      new StringSelectMenuOptionBuilder().setLabel('Admin').setDescription('Commandes admin').setValue('admin'),
      new StringSelectMenuOptionBuilder().setLabel('Panels').setDescription('Commandes de panels').setValue('panels'),
      new StringSelectMenuOptionBuilder().setLabel('Mes permissions').setDescription('Voir ce que tu peux faire').setValue('mesperm'),
    );
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Naytawa Bot — Aide').setDescription('Choisis une categorie pour voir les commandes.').setFooter({ text: `Prefixe : ${PREFIX}` }).setTimestamp()], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  // ════════════════ MIDPERM ════════════════

  if (cmd === 'giveaway') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee. (Midperm minimum)');

    gwSetup.set(message.author.id, {
      creatorId: message.author.id,
      guildId: message.guild.id,
      channelId: message.channel.id,
      prix: null,
      duree: 3600000,
      nbGagnants: 1,
      conditions: { vocMin: 0, msgMin: 0, invMin: 0 },
      participants: [],
      ended: false,
    });

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('Configurateur Giveaway')
      .setDescription(
        'Configure chaque option ci-dessous puis clique sur **Lancer le giveaway**.\n\n' +
        'Prix : non defini\nDuree : 1 heure\nGagnants : 1\nConditions : aucune\n\n' +
        '*Commence par definir le prix.*'
      )
      .setFooter({ text: 'Naytawa • Giveaway' });

    const menuDuree = new StringSelectMenuBuilder().setCustomId(`gw_d_${message.author.id}`).setPlaceholder('1) Choisir la duree').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('10 minutes').setValue('600000'),
      new StringSelectMenuOptionBuilder().setLabel('30 minutes').setValue('1800000'),
      new StringSelectMenuOptionBuilder().setLabel('1 heure').setValue('3600000'),
      new StringSelectMenuOptionBuilder().setLabel('6 heures').setValue('21600000'),
      new StringSelectMenuOptionBuilder().setLabel('12 heures').setValue('43200000'),
      new StringSelectMenuOptionBuilder().setLabel('24 heures').setValue('86400000'),
      new StringSelectMenuOptionBuilder().setLabel('3 jours').setValue('259200000'),
      new StringSelectMenuOptionBuilder().setLabel('7 jours').setValue('604800000'),
    );

    const menuGagnants = new StringSelectMenuBuilder().setCustomId(`gw_g_${message.author.id}`).setPlaceholder('2) Nombre de gagnants').addOptions(
      ['1','2','3','5','10'].map(n => new StringSelectMenuOptionBuilder().setLabel(`${n} gagnant${n>'1'?'s':''}`).setValue(n))
    );

    const menuVoc = new StringSelectMenuBuilder().setCustomId(`gw_v_${message.author.id}`).setPlaceholder('3) Condition vocal (optionnel)').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Pas de condition vocal').setValue('0'),
      new StringSelectMenuOptionBuilder().setLabel('1h minimum').setValue('1'),
      new StringSelectMenuOptionBuilder().setLabel('5h minimum').setValue('5'),
      new StringSelectMenuOptionBuilder().setLabel('10h minimum').setValue('10'),
      new StringSelectMenuOptionBuilder().setLabel('20h minimum').setValue('20'),
      new StringSelectMenuOptionBuilder().setLabel('50h minimum').setValue('50'),
    );

    const menuMsg = new StringSelectMenuBuilder().setCustomId(`gw_m_${message.author.id}`).setPlaceholder('4) Condition messages (optionnel)').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Pas de condition messages').setValue('0'),
      new StringSelectMenuOptionBuilder().setLabel('50 messages minimum').setValue('50'),
      new StringSelectMenuOptionBuilder().setLabel('100 messages minimum').setValue('100'),
      new StringSelectMenuOptionBuilder().setLabel('500 messages minimum').setValue('500'),
      new StringSelectMenuOptionBuilder().setLabel('1000 messages minimum').setValue('1000'),
    );

    const menuInv = new StringSelectMenuBuilder().setCustomId(`gw_i_${message.author.id}`).setPlaceholder('5) Condition invitations (optionnel)').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Pas de condition invitations').setValue('0'),
      new StringSelectMenuOptionBuilder().setLabel('1 invitation minimum').setValue('1'),
      new StringSelectMenuOptionBuilder().setLabel('3 invitations minimum').setValue('3'),
      new StringSelectMenuOptionBuilder().setLabel('5 invitations minimum').setValue('5'),
      new StringSelectMenuOptionBuilder().setLabel('10 invitations minimum').setValue('10'),
    );

    const btnPrix   = new ButtonBuilder().setCustomId(`gw_prix_${message.author.id}`).setLabel('Definir le prix').setStyle(ButtonStyle.Primary);
    const btnLancer = new ButtonBuilder().setCustomId(`gw_lancer_${message.author.id}`).setLabel('Lancer le giveaway').setStyle(ButtonStyle.Success);

    return message.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(menuDuree),
        new ActionRowBuilder().addComponents(menuGagnants),
        new ActionRowBuilder().addComponents(menuVoc),
        new ActionRowBuilder().addComponents(menuMsg),
        new ActionRowBuilder().addComponents(menuInv),
        new ActionRowBuilder().addComponents(btnPrix, btnLancer),
      ],
    });
  }

  if (cmd === 'helpgiveaway') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee. (Midperm minimum)');
    return message.reply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setTitle('Guide Giveaway — Naytawa Bot')
      .addFields(
        { name: '-giveaway', value: 'Lance le configurateur interactif. (Midperm+)' },
        { name: 'Configuration', value: 'Duree : 10min a 7 jours\nGagnants : 1 a 10\nPrix : bouton "Definir le prix"\nConditions : vocal, messages, invitations (optionnel)' },
        { name: 'Conditions', value: 'Vocal : 1h, 5h, 10h, 20h, 50h\nMessages : 50, 100, 500, 1000\nInvitations : 1, 3, 5, 10\n\nLes conditions sont verifiees au moment du tirage.' },
        { name: 'Participation', value: 'Les membres cliquent sur "Participer". Le bot affiche leurs stats vs les conditions en temps reel.' },
        { name: 'Fin', value: 'Tirage automatique a la fin. Les ineligibles sont exclus. Les gagnants sont annonces dans le salon.' },
      ).setFooter({ text: 'Naytawa' })] });
  }

  if (cmd === 'warn') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    const w = warns.get(target.id) || [];
    w.push({ type: 'manuel', raison: reason, by: message.author.tag, date: new Date().toLocaleDateString('fr-FR') });
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Avertissement').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}\nTotal : ${w.length}`).setTimestamp()] });
    try { await target.send(`Avertissement sur Naytawa : ${reason}`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Warn').setDescription(`Averti : ${target.user.tag}\nPar : ${message.author.tag}\nRaison : ${reason}\nTotal : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'unwarn') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const num = parseInt(args[1]);
    const w = warns.get(target.id) || [];
    if (!num || num < 1 || num > w.length) return message.reply(`Numero invalide. ${target.user.tag} a ${w.length} warn(s).`);
    const removed = w.splice(num-1, 1)[0];
    warns.set(target.id, w);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Warn supprime').setDescription(`Warn n${num} supprime.\nRaison : ${removed.raison}\nWarns restants : ${w.length}`).setTimestamp()] });
  }

  if (cmd === 'warns') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first() || message.member;
    const w = warns.get(target.id) || [];
    if (!w.length) return message.reply(`${target.user.tag} n'a aucun warn.`);
    return message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle(`Warns de ${target.user.tag}`).setDescription(w.map((x,i)=>`${i+1}. ${x.raison||x.type} - ${x.date} par ${x.by||'Auto'}`).join('\n')).setFooter({ text: `Total : ${w.length}` }).setTimestamp()] });
  }

  if (cmd === 'mute') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const duree = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'Aucune raison';
    await target.timeout(duree*60*1000, reason);
    const muteEnd = Math.floor((Date.now() + duree*60*1000)/1000);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`Membre : ${target.user.tag}\nDuree : ${duree} min\nFin : <t:${muteEnd}:R>`).setTimestamp()] });
    try { await target.send(`Tu as ete mute ${duree} minutes.\nRaison : ${reason}\nFin : <t:${muteEnd}:F>`); } catch {}
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Mute').setDescription(`Mute : ${target.user.tag}\nPar : ${message.author.tag}\nDuree : ${duree} min`).setTimestamp()] });
  }

  if (cmd === 'unmute') {
    if (!isMidperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    await target.timeout(null);
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`${target.user.tag} demute.`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Unmute').setDescription(`Demute : ${target.user.tag}\nPar : ${message.author.tag}`).setTimestamp()] });
  }

  // ════════════════ WPERM ════════════════

  if (cmd === 'kick') {
    if (!isWperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.kick(reason);
    message.reply({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Expulsion').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Kick').setDescription(`Expulse : ${target.user.tag}\nPar : ${message.author.tag}`).setTimestamp()] });
  }

  if (cmd === 'wl') {
    if (!isWperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.add(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.add(role).catch(() => {});
    message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Whitelist').setDescription(`${target.user.tag} ajoute.`).setTimestamp()] });
  }

  if (cmd === 'unwl') {
    if (!isWperm(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    whitelistSet.delete(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WL);
    if (role) await target.roles.remove(role).catch(() => {});
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Whitelist').setDescription(`${target.user.tag} retire.`).setTimestamp()] });
  }

  if (cmd === 'wllist') {
    if (!isWperm(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Whitelist').setDescription(whitelistSet.size ? [...whitelistSet].map(id=>`<@${id}>`).join('\n') : 'Vide').setTimestamp()] });
  }

  // ════════════════ ADMIN ════════════════

  if (cmd === 'ban') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    const reason = args.slice(1).join(' ') || 'Aucune raison';
    await target.ban({ reason });
    message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Bannissement').setDescription(`Membre : ${target.user.tag}\nRaison : ${reason}`).setTimestamp()] });
    const logCh = message.guild.channels.cache.get(IDS.LOG_MOD);
    if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ban').setDescription(`Banni : ${target.user.tag}\nPar : ${message.author.tag}\nRaison : ${reason}`).setTimestamp()] });
  }

  if (cmd === 'clear') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const n = parseInt(args[0]);
    if (!n || n < 1 || n > 100) return message.reply('Nombre entre 1 et 100.');
    const deleted = await message.channel.bulkDelete(n+1, true);
    const m = await message.channel.send(`${deleted.size-1} messages supprimes.`);
    setTimeout(() => m.delete().catch(() => {}), 3000);
  }

  if (cmd === 'censure') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const etat = args[0]?.toLowerCase();
    if (etat === 'on')  { censureActif = true;  return message.reply('Anti-insultes active.'); }
    if (etat === 'off') { censureActif = false; return message.reply('Anti-insultes desactive.'); }
    return message.reply(`Anti-insultes : **${censureActif ? 'Actif' : 'Desactive'}**`);
  }

  if (cmd === 'antispam') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    if (antiSpamExclus.has(message.channel.id)) { antiSpamExclus.delete(message.channel.id); return message.reply('Anti-spam active dans ce salon.'); }
    antiSpamExclus.add(message.channel.id); return message.reply('Anti-spam desactive dans ce salon.');
  }

  if (cmd === 'wperm') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    wpermSet.add(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WPERM);
    if (role) await target.roles.add(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Wperm attribue').setDescription(`${target.user.tag} a maintenant les permissions **Wperm**.\nIl peut utiliser : kick, wl, unwl, wllist + toutes les commandes midperm.`).setTimestamp()] });
  }

  if (cmd === 'unwperm') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    wpermSet.delete(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_WPERM);
    if (role) await target.roles.remove(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Wperm retire').setDescription(`${target.user.tag} n'a plus les permissions Wperm.`).setTimestamp()] });
  }

  if (cmd === 'wpermlist') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Liste Wperm').setDescription(wpermSet.size ? [...wpermSet].map(id=>`<@${id}>`).join('\n') : 'Vide').setTimestamp()] });
  }

  if (cmd === 'midperm') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    midpermSet.add(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_MIDPERM);
    if (role) await target.roles.add(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Midperm attribue').setDescription(`${target.user.tag} a maintenant les permissions **Midperm**.\nIl peut utiliser : warn, unwarn, warns, mute, unmute, giveaway, helpgiveaway.`).setTimestamp()] });
  }

  if (cmd === 'unmidperm') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mentionne un membre.');
    midpermSet.delete(target.id);
    const role = message.guild.roles.cache.get(IDS.ROLE_MIDPERM);
    if (role) await target.roles.remove(role).catch(() => {});
    return message.reply({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Midperm retire').setDescription(`${target.user.tag} n'a plus les permissions Midperm.`).setTimestamp()] });
  }

  if (cmd === 'midpermlist') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor(COLOR).setTitle('Liste Midperm').setDescription(midpermSet.size ? [...midpermSet].map(id=>`<@${id}>`).join('\n') : 'Vide').setTimestamp()] });
  }

  if (cmd === 'test') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    return message.reply({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Diagnostic Naytawa Bot')
      .addFields(
        { name: 'Bot', value: `Tag : ${client.user.tag}\nPing : ${client.ws.ping}ms\nUptime : ${Math.floor(client.uptime/1000)}s` },
        { name: 'Systemes', value: `Anti-insultes : ${censureActif?'Actif':'Desactive'}\nWhitelist : ${whitelistSet.size}\nWperm : ${wpermSet.size}\nMidperm : ${midpermSet.size}` },
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

  if (cmd === 'gif') {
    if (message.author.id !== OWNER_ID) return message.reply('Permission refusee.');
    const lien = args[0];
    if (!lien) return message.reply('Usage : `-gif <lien>`');
    await message.channel.send(lien);
    await message.delete().catch(() => {});
  }

  if (cmd === 'make' && args[0] === 'panel') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const titre = args[1] || 'Panel';
    const desc  = args.slice(2).join(' ') || 'Description.';
    await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: message.guild.iconURL({ dynamic: true }) }).setTitle(titre).setDescription(desc).setTimestamp().setFooter({ text: 'Naytawa' })] });
    await message.delete().catch(() => {});
  }

  if (cmd === 'panel') {
    if (!isAdmin(message.member)) return message.reply('Permission refusee.');
    const type = args[0]?.toLowerCase();
    if (type === 'reglement')    await sendPanelReglement(message.guild);
    else if (type === 'roles')   await sendPanelRoles(message.guild);
    else if (type === 'tickets') await sendPanelTickets(message.guild);
    else if (type === 'prison')  await sendPanelPrison(message.guild);
    else if (type === 'top')     { await updateTopMessages(message.guild); await updateTopVoc(); }
    else if (type === 'topinvites') await updateTopInvites(message.guild);
    else if (type === 'partenariat') await sendPanelPartenariat(message.guild);
    else return message.reply('Types : `reglement` `roles` `tickets` `prison` `top` `topinvites` `partenariat`');
    const confirm = await message.reply('Panel envoye !');
    setTimeout(() => confirm.delete().catch(() => {}), 3000);
    await message.delete().catch(() => {});
  }
});

// ══ PANELS ══
async function sendPanelReglement(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_REGLEMENT);
  if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Reglement du serveur').setImage(GIF.REGLEMENT).setDescription(['> Bienvenue ! Merci de respecter ces regles.','','01 - Respectez chaque membre.','02 - Zero discrimination.','03 - Pas de spam, flood ou pub.','04 - Contenu NSFW interdit hors salons dedies.','05 - Bonne conduite en vocal.','06 - Decisions du staff definitives.','07 - Aucun lien suspect.','08 - Une seule identite par personne.','','Conditions : https://discord.com/terms','Regles : https://discord.com/guidelines','','Tape -naytawa pour obtenir un role gratuit !','','*En restant ici, tu acceptes ces regles.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e => console.error(e.message));
}

async function sendPanelRoles(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_ROLES);
  if (!salon) return;
  const menu = new StringSelectMenuBuilder().setCustomId('notif_select').setPlaceholder('Choisis tes notifications').addOptions(
    new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Annonces partenariat').setValue('notif_partner'),
    new StringSelectMenuOptionBuilder().setLabel('Sondage').setDescription('Sondages du serveur').setValue('notif_sondage'),
    new StringSelectMenuOptionBuilder().setLabel('Animation').setDescription('Evenements et animations').setValue('notif_anim'),
    new StringSelectMenuOptionBuilder().setLabel('Giveaway').setDescription('Concours et cadeaux').setValue('notif_giveaway'),
  );
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Notifications').setImage(GIF.ROLES).setDescription(['> Choisis les notifications que tu souhaites recevoir.','','Partenariat - Annonces partenariat','Sondage - Sondages du serveur','Animation - Evenements et animations','Giveaway - Concours et cadeaux'].join('\n')).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] }).catch(e => console.error(e.message));
}

async function sendPanelTickets(guild) {
  const sR = guild.channels.cache.get(IDS.SALON_TICKET_REGLES);
  if (sR) await sR.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Regles des tickets').setImage(GIF.TICKET_REGLES).setDescription(['> Avant d\'ouvrir un ticket, lis ces regles.','','01 - Pas de faux tickets ou trolls','02 - Pas d\'insultes envers le staff','03 - Un seul ticket par probleme','04 - Sois poli et respectueux','',`Creer un ticket : <#${IDS.SALON_TICKET_PANEL}>`,'','*Tout abus entraine une sanction.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e => console.error(e.message));
  const sP = guild.channels.cache.get(IDS.SALON_TICKET_PANEL);
  if (sP) {
    const menu = new StringSelectMenuBuilder().setCustomId('ticket_select').setPlaceholder('Choisis une categorie').addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Question').setDescription('Une question generale').setValue('ticket_question'),
      new StringSelectMenuOptionBuilder().setLabel('Abus / Probleme').setDescription('Signaler un abus de perm').setValue('ticket_abus'),
      new StringSelectMenuOptionBuilder().setLabel('Staff').setDescription('Candidature moderateur').setValue('ticket_modo'),
      new StringSelectMenuOptionBuilder().setLabel('Partenariat').setDescription('Demande de partenariat').setValue('ticket_partner'),
    );
    await sP.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Ouvrir un ticket').setImage(GIF.TICKET_PANEL).setDescription(['> Choisis la categorie de ta demande.','','Question - Une question generale','Abus / Probleme - Signaler un abus de perm','Staff - Candidature moderateur','Partenariat - Demande de partenariat'].join('\n')).setFooter({ text: 'Naytawa' })], components: [new ActionRowBuilder().addComponents(menu)] }).catch(e => console.error(e.message));
  }
}

async function sendPanelPrison(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_PRISON);
  if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor('#8B0000').setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Bienvenue en prison').setDescription(['> Salut a toi, tu as atterri ici car tu as enfreint les regles.','','Ta sanction est suffisamment grave pour necessiter un passage en prison.','','Pour en sortir, une mission t\'attend.','Un membre de la gestion prison va te contacter.','Sois patient et respectueux, c\'est ta seule chance.','','Si tu contournes la procedure, ta sanction sera alourdie.','','*Bonne chance.*'].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e => console.error(e.message));
}

async function sendPanelPartenariat(guild) {
  const salon = guild.channels.cache.get(IDS.SALON_PARTENARIAT);
  if (!salon) return;
  await salon.send({ embeds: [new EmbedBuilder().setColor(COLOR).setAuthor({ name: 'Naytawa', iconURL: guild.iconURL({ dynamic: true }) }).setTitle('Partenariat').setImage(GIF.PARTENARIAT).setDescription(['> Tu souhaites devenir partenaire de Naytawa ?','','01 - Minimum 100 membres','02 - Serveur actif','03 - Pas de contenu illicite','04 - Avoir un salon partenariat','',`Ouvre un ticket dans <#${IDS.SALON_TICKET_PANEL}>`].join('\n')).setFooter({ text: 'Naytawa' })] }).catch(e => console.error(e.message));
}

// ══ LOGS VOC ══
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const logCh = newState.guild.channels.cache.get(IDS.LOG_VOC);
    const member = newState.member;
    if (!member) return;
    if (!oldState.channelId && newState.channelId) {
      vocJoin.set(member.id, Date.now());
      if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#3ba55c').setTitle('Rejoint vocal').setDescription(`Membre : ${member.user.tag}\nSalon : <#${newState.channelId}>\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
    } else if (oldState.channelId && !newState.channelId) {
      const join = vocJoin.get(member.id);
      if (join) {
        const elapsed = Date.now() - join;
        vocTime.set(member.id, (vocTime.get(member.id)||0) + elapsed);
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
  } catch (e) { console.error('VoiceState:', e.message); }
});

client.on('messageDelete', async message => {
  if (message.author?.bot) return;
  const logCh = message.guild?.channels.cache.get(IDS.LOG_MSG);
  if (!logCh) return;
  const embed = new EmbedBuilder().setColor('#ed4245').setTitle('Message supprime').setDescription(`Auteur : ${message.author?.tag}\nSalon : <#${message.channel.id}>\nContenu : ${message.content ? message.content.slice(0,1000) : 'Non disponible'}`).setTimestamp();
  if (message.attachments.size > 0) embed.addFields({ name: 'Pieces jointes', value: message.attachments.map(a=>a.url).join('\n') });
  logCh.send({ embeds: [embed] });
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const logCh = newMessage.guild?.channels.cache.get(IDS.LOG_MSG);
  if (!logCh) return;
  logCh.send({ embeds: [new EmbedBuilder().setColor('#faa61a').setTitle('Message modifie').setDescription(`Auteur : ${newMessage.author?.tag}\nSalon : <#${newMessage.channel.id}>\nAvant : ${oldMessage.content?.slice(0,500)||'N/A'}\nApres : ${newMessage.content?.slice(0,500)}`).setTimestamp()] });
});

// ══ INTERACTIONS ══
client.on('interactionCreate', async interaction => {
  try {
    const member = interaction.member;
    const guild  = interaction.guild;

    // ─── SELECT MENUS ───
    if (interaction.isStringSelectMenu()) {

      // Help
      if (interaction.customId === 'help_select') {
        const val = interaction.values[0];
        let embed;
        if (val === 'libre') embed = new EmbedBuilder().setColor(COLOR).setTitle('Commandes libres').addFields(
          { name: '-naytawa', value: 'Obtenir le role Naytawa gratuitement.' },
          { name: '-avatar [@user]', value: 'Afficher la photo de profil.' },
          { name: '-profil [@user]', value: 'Profil interactif d\'un membre.' },
          { name: '-s-u [@user]', value: 'Stats completes : messages, vocal, invitations, warns...' },
          { name: '-love', value: 'Envoie une video speciale.' },
          { name: '-invites [@user]', value: 'Nombre d\'invitations d\'un membre.' },
          { name: '-topinvites', value: 'Top 10 des inviteurs.' },
          { name: '-help', value: 'Ce menu d\'aide.' },
        );
        if (val === 'modo') embed = new EmbedBuilder().setColor('#faa61a').setTitle('Moderation').addFields(
          { name: 'Midperm+', value: '-warn @user <raison>\n-unwarn @user <numero>\n-warns [@user]\n-mute @user <min> [raison]\n-unmute @user\n-giveaway\n-helpgiveaway' },
          { name: 'Wperm+', value: '-kick @user [raison]\n-wl @user (whitelist censure)\n-unwl @user\n-wllist' },
          { name: 'Admin', value: '-ban @user [raison]\n-clear <1-100>' },
        );
        if (val === 'giveaway') embed = new EmbedBuilder().setColor('#f1c40f').setTitle('Giveaway (Midperm+)').addFields(
          { name: '-giveaway', value: 'Ouvre le configurateur interactif.' },
          { name: '-helpgiveaway', value: 'Guide detaille du systeme giveaway.' },
          { name: 'Conditions disponibles', value: 'Vocal : 1h, 5h, 10h, 20h, 50h\nMessages : 50, 100, 500, 1000\nInvitations : 1, 3, 5, 10' },
        );
        if (val === 'perms') embed = new EmbedBuilder().setColor(COLOR).setTitle('Permissions (Admin)').addFields(
          { name: 'Gestion Wperm', value: '-wperm @user\n-unwperm @user\n-wpermlist' },
          { name: 'Gestion Midperm', value: '-midperm @user\n-unmidperm @user\n-midpermlist' },
          { name: 'Whitelist censure (Wperm+)', value: '-wl @user\n-unwl @user\n-wllist' },
        );
        if (val === 'admin') embed = new EmbedBuilder().setColor('#ed4245').setTitle('Admin').addFields(
          { name: 'Configuration', value: '-censure on/off\n-antispam (toggle salon)\n-test (diagnostic)\n-backup (sauvegarde)' },
          { name: 'Owner uniquement', value: '-gif <lien>' },
        );
        if (val === 'panels') embed = new EmbedBuilder().setColor(COLOR).setTitle('Panels (Admin)').addFields(
          { name: 'Commandes disponibles', value: '-panel reglement\n-panel roles\n-panel tickets\n-panel prison\n-panel top\n-panel topinvites\n-panel partenariat\n-make panel <titre> <description>' },
        );
        if (val === 'mesperm') {
          const niveau = getNiveau(member);
          const lignes = ['Commandes libres : naytawa, avatar, profil, s-u, love, invites, topinvites, help'];
          if (isMidperm(member)) lignes.push('Midperm : warn, unwarn, warns, mute, unmute, giveaway, helpgiveaway');
          if (isWperm(member))   lignes.push('Wperm : kick, wl, unwl, wllist');
          if (isAdmin(member))   lignes.push('Admin : ban, clear, censure, antispam, wperm, midperm, test, backup, panel, make panel');
          if (member.id === OWNER_ID) lignes.push('Owner : gif');
          embed = new EmbedBuilder().setColor(COLOR).setTitle('Mes permissions').addFields(
            { name: 'Niveau', value: `**${niveau}**` },
            { name: 'Tu peux utiliser', value: lignes.join('\n') },
          );
        }
        if (embed) return interaction.reply({ embeds: [embed.setFooter({ text: 'Naytawa' }).setTimestamp()], ephemeral: true });
      }

      // Notifications
      if (interaction.customId === 'notif_select') {
        const notifMap = { notif_partner: IDS.ROLE_NOTIF_PARTNER, notif_sondage: IDS.ROLE_NOTIF_SONDAGE, notif_anim: IDS.ROLE_NOTIF_ANIM, notif_giveaway: IDS.ROLE_NOTIF_GIVEAWAY };
        const roleId = notifMap[interaction.values[0]];
        const role = guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: 'Role introuvable.', ephemeral: true });
        if (member.roles.cache.has(roleId)) { await member.roles.remove(role); return interaction.reply({ content: `Notification ${role.name} desactivee !`, ephemeral: true }); }
        await member.roles.add(role); return interaction.reply({ content: `Notification ${role.name} activee !`, ephemeral: true });
      }

      // Tickets
      if (interaction.customId === 'ticket_select') {
        const typeMap = { ticket_question: 'Question', ticket_abus: 'Abus / Probleme', ticket_modo: 'Devenir Moderateur', ticket_partner: 'Partenariat' };
        const type = typeMap[interaction.values[0]];
        const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20);
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
        let extra = interaction.values[0] === 'ticket_partner' ? '\n\nMerci de fournir :\n- Nom du serveur\n- Lien invitation\n- Nombre membres\n- Raison' : '';
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
        const targetId = interaction.customId.replace('profil_', '');
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0];
        let embed;
        if (val === 'arrivee') embed = new EmbedBuilder().setColor(COLOR).setTitle(`Arrivee de ${target.displayName}`).addFields({ name: 'Arrive le', value: `<t:${Math.floor(target.joinedTimestamp/1000)}:F> (<t:${Math.floor(target.joinedTimestamp/1000)}:R>)` }, { name: 'Compte cree le', value: `<t:${Math.floor(target.user.createdTimestamp/1000)}:F>` }).setTimestamp();
        if (val === 'avatar') { const user = await target.user.fetch(); embed = new EmbedBuilder().setColor(COLOR).setTitle(`PP de ${target.displayName}`).setImage(target.user.displayAvatarURL({ dynamic: true, size: 1024 })).setTimestamp(); if (user.bannerURL()) embed.addFields({ name: 'Banniere', value: `[Voir](${user.bannerURL({ size: 1024 })})` }); }
        if (val === 'stats') { const ms = messageCount.get(target.id)||0; const voc = vocTime.get(target.id)||0; const h = Math.floor(voc/3600000); const m2 = Math.floor((voc%3600000)/60000); const pm = [...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1; const pv = [...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1; embed = new EmbedBuilder().setColor(COLOR).setTitle(`Stats de ${target.displayName}`).addFields({ name: 'Messages', value: `${ms.toLocaleString()}\n#${pm||'?'}`, inline: true }, { name: 'Vocal', value: `${h}h ${m2}m\n#${pv||'?'}`, inline: true }).setTimestamp(); }
        if (val === 'roles') { const hist = rolesHistory.get(target.id)||[]; embed = new EmbedBuilder().setColor(COLOR).setTitle(`Roles de ${target.displayName}`).addFields({ name: 'Roles actuels', value: target.roles.cache.filter(r=>r.id!==guild.id).map(r=>r.toString()).join(' ').slice(0,800)||'Aucun' }, { name: 'Historique', value: hist.length ? hist.slice(0,10).map((h,i)=>`${i+1}. ${h.type==='ajoute'?'+':'-'} ${h.name} - ${h.date}`).join('\n') : 'Aucun' }).setTimestamp(); }
        if (val === 'warns') { const w = warns.get(target.id)||[]; embed = new EmbedBuilder().setColor(COLOR).setTitle(`Warns de ${target.displayName}`).setDescription(w.length ? w.slice(-10).map((x,i)=>`${i+1}. ${x.raison||x.type} - ${x.date} par ${x.by||'Auto'}`).join('\n') : 'Aucun warn.').setFooter({ text: `Total : ${w.length}` }).setTimestamp(); }
        if (embed) return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // S-U detail
      if (interaction.customId.startsWith('su_')) {
        const targetId = interaction.customId.replace('su_', '');
        const target = await guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
        const val = interaction.values[0];
        let embed;
        if (val === 'voc_detail') { const voc = vocTime.get(target.id)||0; const h = Math.floor(voc/3600000); const m2 = Math.floor((voc%3600000)/60000); const s = Math.floor((voc%60000)/1000); embed = new EmbedBuilder().setColor(COLOR).setTitle(`Vocal — ${target.displayName}`).addFields({ name: 'Temps total', value: `${h}h ${m2}m ${s}s` }, { name: 'En vocal actuellement', value: vocJoin.has(target.id) ? `Oui (depuis <t:${Math.floor(vocJoin.get(target.id)/1000)}:R>)` : 'Non' }, { name: 'Classement', value: `#${[...vocTime.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}` }).setTimestamp(); }
        if (val === 'warn_detail') { const w = warns.get(target.id)||[]; embed = new EmbedBuilder().setColor('#faa61a').setTitle(`Warns — ${target.displayName}`).setDescription(w.length ? w.map((x,i)=>`${i+1}. ${x.raison||x.type} — ${x.date} par ${x.by||'Auto'}`).join('\n') : 'Aucun warn.').setFooter({ text: `Total : ${w.length}` }).setTimestamp(); }
        if (val === 'role_detail') { const hist = rolesHistory.get(target.id)||[]; embed = new EmbedBuilder().setColor(COLOR).setTitle(`Roles — ${target.displayName}`).setDescription(hist.length ? hist.map((h,i)=>`${i+1}. ${h.type==='ajoute'?'➕':'➖'} ${h.name} — ${h.date}`).join('\n') : 'Aucun historique.').setTimestamp(); }
        if (val === 'activite') { const ms = messageCount.get(target.id)||0; const inv = inviteCount.get(target.id)||0; embed = new EmbedBuilder().setColor(COLOR).setTitle(`Activite — ${target.displayName}`).addFields({ name: 'Messages', value: `${ms.toLocaleString()}\n#${[...messageCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}`, inline: true }, { name: 'Invitations', value: `${inv}\n#${[...inviteCount.entries()].sort((a,b)=>b[1]-a[1]).findIndex(e=>e[0]===target.id)+1||'?'}`, inline: true }).setTimestamp(); }
        if (embed) return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Giveaway menus
      const gwMenuPrefixes = [
        { prefix: 'gw_d_', field: 'duree', labels: { '600000':'10min','1800000':'30min','3600000':'1h','21600000':'6h','43200000':'12h','86400000':'24h','259200000':'3j','604800000':'7j' } },
        { prefix: 'gw_g_', field: 'nbGagnants', labels: null },
        { prefix: 'gw_v_', field: 'vocMin', labels: null },
        { prefix: 'gw_m_', field: 'msgMin', labels: null },
        { prefix: 'gw_i_', field: 'invMin', labels: null },
      ];

      for (const { prefix, field, labels } of gwMenuPrefixes) {
        if (interaction.customId.startsWith(prefix)) {
          const creatorId = interaction.customId.slice(prefix.length);
          if (interaction.user.id !== creatorId) return interaction.reply({ content: 'Pas ton giveaway.', ephemeral: true });
          const data = gwSetup.get(creatorId);
          if (!data) return interaction.reply({ content: 'Session expiree. Refais -giveaway.', ephemeral: true });
          const val = interaction.values[0];
          if (field === 'duree') data.duree = parseInt(val);
          else if (field === 'nbGagnants') data.nbGagnants = parseInt(val);
          else if (field === 'vocMin') data.conditions.vocMin = parseInt(val);
          else if (field === 'msgMin') data.conditions.msgMin = parseInt(val);
          else if (field === 'invMin') data.conditions.invMin = parseInt(val);
          gwSetup.set(creatorId, data);
          const affiche = labels ? (labels[val] || val) : val;
          return interaction.reply({ content: `Defini : **${affiche}**`, ephemeral: true });
        }
      }
    }

    // ─── BOUTONS ───
    if (interaction.isButton()) {

      // Giveaway — Prix
      if (interaction.customId.startsWith('gw_prix_')) {
        const creatorId = interaction.customId.replace('gw_prix_', '');
        if (interaction.user.id !== creatorId) return interaction.reply({ content: 'Pas ton giveaway.', ephemeral: true });
        const modal = new ModalBuilder().setCustomId(`gw_modal_${creatorId}`).setTitle('Prix du giveaway');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('prix_input').setLabel('Quel est le prix ?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)));
        return interaction.showModal(modal);
      }

      // Giveaway — Lancer
      if (interaction.customId.startsWith('gw_lancer_')) {
        const creatorId = interaction.customId.replace('gw_lancer_', '');
        if (interaction.user.id !== creatorId) return interaction.reply({ content: 'Pas ton giveaway.', ephemeral: true });
        const data = gwSetup.get(creatorId);
        if (!data) return interaction.reply({ content: 'Session expiree. Refais -giveaway.', ephemeral: true });
        if (!data.prix) return interaction.reply({ content: 'Definis d\'abord le prix avec le bouton !', ephemeral: true });

        const endTime = Date.now() + data.duree;
        const dureeLabels = { 600000:'10min',1800000:'30min',3600000:'1h',21600000:'6h',43200000:'12h',86400000:'24h',259200000:'3j',604800000:'7j' };
        const dureeLabel = dureeLabels[data.duree] || `${data.duree/60000}min`;

        const condLines = [];
        if (data.conditions.vocMin > 0) condLines.push(`Vocal : ${data.conditions.vocMin}h minimum`);
        if (data.conditions.msgMin > 0) condLines.push(`Messages : ${data.conditions.msgMin} minimum`);
        if (data.conditions.invMin > 0) condLines.push(`Invitations : ${data.conditions.invMin} minimum`);

        const embed = new EmbedBuilder()
          .setColor('#f1c40f')
          .setTitle(`Giveaway — ${data.prix}`)
          .setDescription([
            `Fin : <t:${Math.floor(endTime/1000)}:R> (<t:${Math.floor(endTime/1000)}:F>)`,
            `Gagnants : ${data.nbGagnants}`,
            `Duree : ${dureeLabel}`,
            condLines.length ? `\nConditions :\n${condLines.join('\n')}` : '\nPas de conditions.',
            `\nParticipants : 0`,
          ].join('\n'))
          .setTimestamp()
          .setFooter({ text: 'Naytawa • Giveaway' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('gw_participer').setLabel('Participer').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('gw_participants').setLabel('Voir les participants').setStyle(ButtonStyle.Secondary),
        );

        const gwMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
        data.messageId = gwMsg.id;
        data.channelId = interaction.channel.id;
        data.endTime   = endTime;
        giveaways.set(gwMsg.id, { ...data });
        gwSetup.delete(creatorId);

        return interaction.reply({ content: `Giveaway lance ! Termine <t:${Math.floor(endTime/1000)}:R>.`, ephemeral: true });
      }

      // Giveaway — Participer
      if (interaction.customId === 'gw_participer') {
        const gwData = giveaways.get(interaction.message.id);
        if (!gwData || gwData.ended) return interaction.reply({ content: 'Ce giveaway est termine.', ephemeral: true });

        const voc  = vocTime.get(member.id) || 0;
        const msgs = messageCount.get(member.id) || 0;
        const inv  = inviteCount.get(member.id) || 0;
        const condLines = [];
        if (gwData.conditions.vocMin > 0) condLines.push(`Vocal : ${(voc/3600000).toFixed(1)}h / ${gwData.conditions.vocMin}h ${voc/3600000 >= gwData.conditions.vocMin ? '✅' : '❌'}`);
        if (gwData.conditions.msgMin > 0) condLines.push(`Messages : ${msgs} / ${gwData.conditions.msgMin} ${msgs >= gwData.conditions.msgMin ? '✅' : '❌'}`);
        if (gwData.conditions.invMin > 0) condLines.push(`Invitations : ${inv} / ${gwData.conditions.invMin} ${inv >= gwData.conditions.invMin ? '✅' : '❌'}`);
        const condText = condLines.length ? `\n\nTes stats :\n${condLines.join('\n')}` : '';

        if (gwData.participants.includes(member.id)) {
          gwData.participants = gwData.participants.filter(id => id !== member.id);
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

      // Giveaway — Participants
      if (interaction.customId === 'gw_participants') {
        const gwData = giveaways.get(interaction.message.id);
        if (!gwData) return interaction.reply({ content: 'Donnees introuvables.', ephemeral: true });
        const lines = gwData.participants.slice(0,25).map((id,i)=>`${i+1}. <@${id}>`).join('\n') || 'Aucun participant.';
        return interaction.reply({ content: `**Participants (${gwData.participants.length}) :**\n${lines}`, ephemeral: true });
      }

      // Tickets
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
        if (logCh) logCh.send({ embeds: [new EmbedBuilder().setColor('#ed4245').setTitle('Ticket ferme').setDescription(`Ferme par : ${member.user.tag}\nDate : <t:${Math.floor(Date.now()/1000)}:F>`).setTimestamp()] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
    }

    // ─── MODALS ───
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('gw_modal_')) {
        const creatorId = interaction.customId.replace('gw_modal_', '');
        const data = gwSetup.get(creatorId);
        if (!data) return interaction.reply({ content: 'Session expiree.', ephemeral: true });
        data.prix = interaction.fields.getTextInputValue('prix_input');
        gwSetup.set(creatorId, data);
        return interaction.reply({ content: `Prix defini : **${data.prix}**`, ephemeral: true });
      }
    }

  } catch (e) { console.error('Interaction:', e.message); }
});

client.login(process.env.DISCORD_TOKEN);
