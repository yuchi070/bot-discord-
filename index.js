// ════════════════════════════════════════════
//   Bot Discord — édite ce fichier librement
//   depuis l'interface BotForge
// ════════════════════════════════════════════
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const PREFIX = process.env.PREFIX || '!';

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setActivity('vos commandes', { type: ActivityType.Listening });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    const msg = await message.reply('🏓 Calcul...');
    const latency = msg.createdTimestamp - message.createdTimestamp;
    await msg.edit(`🏓 Pong ! Latence : **${latency}ms** | WebSocket : **${client.ws.ping}ms**`);
  }

  if (command === 'help') {
    await message.reply([
      '📋 **Commandes disponibles :**',
      `\`${PREFIX}ping\` — Test de latence`,
      `\`${PREFIX}info\` — Infos du bot`,
      `\`${PREFIX}uptime\` — Temps en ligne`,
      `\`${PREFIX}help\` — Cette aide`,
    ].join('\n'));
  }

  if (command === 'info') {
    await message.reply([
      `🤖 **${client.user.username}**`,
      `Serveurs : ${client.guilds.cache.size}`,
      `Utilisateurs : ${client.users.cache.size}`,
      `Discord.js : v${require('discord.js').version}`,
      `Node.js : ${process.version}`,
    ].join('\n'));
  }

  if (command === 'uptime') {
    const s = Math.floor(client.uptime / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    await message.reply(`⏱️ En ligne depuis : **${h}h ${m}m ${sec}s**`);
  }
});

client.on('error', (err) => console.error('Erreur client:', err.message));
client.on('warn', (info) => console.warn('Avertissement:', info));

client.login(process.env.DISCORD_TOKEN);
