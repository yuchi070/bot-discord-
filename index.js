require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

/* =======================================================
   CONFIG
======================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
  ],
});

const PREFIX = '-';

const IDS = {
  /* salons */
  SALON_BIENVENUE: 'ID',
  SALON_ROLES: 'ID',
  SALON_TICKETS: 'ID',
  SALON_TOP_MSG: 'ID',
  SALON_TOP_VOC: 'ID',
  SALON_LOGS: 'ID',
  SALON_PLAINTE: 'ID',
  SALON_PLAINTE_STAFF: 'ID',

  /* catégories */
  CAT_TICKETS: 'ID',

  /* rôles */
  ROLE_MEMBRE: 'ID',
  ROLE_HOMME: 'ID',
  ROLE_FEMME: 'ID',
  ROLE_MINEUR: 'ID',
  ROLE_MAJEUR: 'ID',
  ROLE_TICKET: 'ID',
  ROLE_TOP_MSG: 'ID',
  ROLE_TOP_VOC: 'ID',
};

/* =======================================================
   DATA
======================================================= */

const messageCount = new Map();
const voiceTime = new Map();
const voiceJoin = new Map();

/* =======================================================
   READY
======================================================= */

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'le serveur ❤️' }],
    status: 'online',
  });

  setInterval(updateVoiceLeaderboard, 300000);
});

/* =======================================================
   MEMBER JOIN
======================================================= */

client.on('guildMemberAdd', async member => {
  try {
    const role = member.guild.roles.cache.get(IDS.ROLE_MEMBRE);

    if (role) {
      await member.roles.add(role);
    }

    const salon = member.guild.channels.cache.get(
      IDS.SALON_BIENVENUE
    );

    if (!salon) return;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('✨ Nouveau membre')
      .setDescription(
        `Bienvenue ${member} sur **${member.guild.name}** ❤️`
      )
      .setThumbnail(
        member.user.displayAvatarURL({ dynamic: true })
      )
      .setFooter({
        text: `Nous sommes maintenant ${member.guild.memberCount} membres`,
      });

    salon.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
  }
});

/* =======================================================
   MESSAGES
======================================================= */

client.on('messageCreate', async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    /* leaderboard */
    const count =
      (messageCount.get(message.author.id) || 0) + 1;

    messageCount.set(message.author.id, count);

    /* prefix */
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/ +/);

    const cmd = args.shift().toLowerCase();

    /* ==========================================
       PING
    ========================================== */

    if (cmd === 'ping') {
      const m = await message.reply('🏓');
      return m.edit(
        `🏓 ${m.createdTimestamp - message.createdTimestamp}ms`
      );
    }

    /* ==========================================
       HELP
    ========================================== */

    if (cmd === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('📘 Commandes')
        .setDescription(
          [
            '`-ping`',
            '`-avatar`',
            '`-clear`',
            '`-kick`',
            '`-ban`',
            '`-mute`',
            '`-panel`',
          ].join('\n')
        );

      return message.reply({
        embeds: [embed],
      });
    }

    /* ==========================================
       AVATAR
    ========================================== */

    if (cmd === 'avatar') {
      const user =
        message.mentions.users.first() ||
        message.author;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`🖼️ ${user.tag}`)
        .setImage(
          user.displayAvatarURL({
            dynamic: true,
            size: 1024,
          })
        );

      return message.reply({
        embeds: [embed],
      });
    }

    /* ==========================================
       CLEAR
    ========================================== */

    if (cmd === 'clear') {
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        return message.reply('❌ Permission refusée.');
      }

      const amount = parseInt(args[0]);

      if (!amount || amount < 1 || amount > 100) {
        return message.reply(
          '❌ Entre 1 et 100.'
        );
      }

      await message.channel.bulkDelete(amount + 1, true);

      const msg = await message.channel.send(
        `✅ ${amount} messages supprimés`
      );

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 3000);
    }

    /* ==========================================
       BAN
    ========================================== */

    if (cmd === 'ban') {
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.BanMembers
        )
      ) {
        return message.reply('❌ Permission refusée.');
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          '❌ Mentionne un membre.'
        );
      }

      const reason =
        args.slice(1).join(' ') ||
        'Aucune raison';

      await target.ban({ reason });

      message.reply(
        `🔨 ${target.user.tag} banni`
      );
    }

    /* ==========================================
       KICK
    ========================================== */

    if (cmd === 'kick') {
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.KickMembers
        )
      ) {
        return message.reply('❌ Permission refusée.');
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          '❌ Mentionne un membre.'
        );
      }

      await target.kick();

      message.reply(
        `👢 ${target.user.tag} expulsé`
      );
    }

    /* ==========================================
       MUTE
    ========================================== */

    if (cmd === 'mute') {
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.ModerateMembers
        )
      ) {
        return message.reply('❌ Permission refusée.');
      }

      const target =
        message.mentions.members.first();

      if (!target) {
        return message.reply(
          '❌ Mentionne un membre.'
        );
      }

      const duration =
        parseInt(args[1]) || 10;

      await target.timeout(
        duration * 60 * 1000
      );

      message.reply(
        `🔇 ${target.user.tag} muté ${duration} min`
      );
    }

    /* ==========================================
       PANELS
    ========================================== */

    if (cmd === 'panel') {
      if (
        !message.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return message.reply('❌ Permission refusée.');
      }

      const type = args[0];

      if (type === 'roles') {
        await sendRolesPanel(message.guild);
      }

      if (type === 'tickets') {
        await sendTicketsPanel(message.guild);
      }

      if (type === 'top') {
        await sendTopMessages(message.guild);
        await sendTopVoice(message.guild);
      }

      if (type === 'plainte') {
        await sendComplaintPanel(message.guild);
      }

      message.react('✅');
    }
  } catch (err) {
    console.error(err);
  }
});

/* =======================================================
   ROLE PANEL
======================================================= */

async function sendRolesPanel(guild) {
  const salon =
    guild.channels.cache.get(
      IDS.SALON_ROLES
    );

  if (!salon) return;

  await salon.bulkDelete(20).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('✨ Sélection des rôles')
    .setDescription(
      [
        'Choisis tes rôles automatiquement.',
        '',
        '👨 Homme',
        '👩 Femme',
        '🧒 Mineur',
        '🍷 Majeur',
      ].join('\n')
    )
    .setThumbnail(
      guild.iconURL({ dynamic: true })
    );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_homme')
        .setLabel('Homme')
        .setEmoji('👨')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('role_femme')
        .setLabel('Femme')
        .setEmoji('👩')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('role_mineur')
        .setLabel('Mineur')
        .setEmoji('🧒')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('role_majeur')
        .setLabel('Majeur')
        .setEmoji('🍷')
        .setStyle(ButtonStyle.Success)
    );

  salon.send({
    embeds: [embed],
    components: [row],
  });
}

/* =======================================================
   TICKETS PANEL
======================================================= */

async function sendTicketsPanel(guild) {
  const salon =
    guild.channels.cache.get(
      IDS.SALON_TICKETS
    );

  if (!salon) return;

  await salon.bulkDelete(20).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎫 Support')
    .setDescription(
      [
        'Ouvre un ticket pour contacter le staff.',
        '',
        '❓ Question',
        '⚠️ Signalement',
        '🛡️ Recrutement',
      ].join('\n')
    )
    .setThumbnail(
      guild.iconURL({ dynamic: true })
    );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_question')
        .setLabel('Question')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('ticket_signalement')
        .setLabel('Signalement')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('ticket_recrutement')
        .setLabel('Recrutement')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Success)
    );

  salon.send({
    embeds: [embed],
    components: [row],
  });
}

/* =======================================================
   PLAINTES PANEL
======================================================= */

async function sendComplaintPanel(guild) {
  const salon =
    guild.channels.cache.get(
      IDS.SALON_PLAINTE
    );

  if (!salon) return;

  const embed = new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle('⚖️ Plainte anonyme')
    .setDescription(
      'Clique sur le bouton ci-dessous.'
    );

  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('plainte_open')
        .setLabel('Déposer une plainte')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Danger)
    );

  salon.send({
    embeds: [embed],
    components: [row],
  });
}

/* =======================================================
   BUTTONS / INTERACTIONS
======================================================= */

client.on(
  'interactionCreate',
  async interaction => {
    try {
      if (!interaction.guild) return;

      /* ======================================
         ROLE BUTTONS
      ====================================== */

      if (interaction.isButton()) {
        const roleMap = {
          role_homme: IDS.ROLE_HOMME,
          role_femme: IDS.ROLE_FEMME,
          role_mineur: IDS.ROLE_MINEUR,
          role_majeur: IDS.ROLE_MAJEUR,
        };

        if (roleMap[interaction.customId]) {
          const roleId =
            roleMap[interaction.customId];

          const role =
            interaction.guild.roles.cache.get(
              roleId
            );

          if (!role) {
            return interaction.reply({
              content:
                '❌ Rôle introuvable.',
              ephemeral: true,
            });
          }

          if (
            interaction.member.roles.cache.has(
              roleId
            )
          ) {
            await interaction.member.roles.remove(
              roleId
            );

            return interaction.reply({
              content: `➖ ${role.name} retiré`,
              ephemeral: true,
            });
          } else {
            await interaction.member.roles.add(
              roleId
            );

            return interaction.reply({
              content: `✅ ${role.name} ajouté`,
              ephemeral: true,
            });
          }
        }
      }

      /* ======================================
         TICKETS
      ====================================== */

      if (
        interaction.customId?.startsWith(
          'ticket_'
        )
      ) {
        const existing =
          interaction.guild.channels.cache.find(
            c =>
              c.name ===
              `ticket-${interaction.user.id}`
          );

        if (existing) {
          return interaction.reply({
            content:
              '❌ Tu as déjà un ticket.',
            ephemeral: true,
          });
        }

        const channel =
          await interaction.guild.channels.create({
            name: `ticket-${interaction.user.id}`,
            type: ChannelType.GuildText,
            parent: IDS.CAT_TICKETS,

            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [
                  PermissionFlagsBits.ViewChannel,
                ],
              },

              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },

              {
                id: IDS.ROLE_TICKET,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
            ],
          });

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🎫 Ticket ouvert')
          .setDescription(
            `Bienvenue ${interaction.member}`
          );

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('close_ticket')
              .setLabel('Fermer')
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Danger)
          );

        await channel.send({
          content: `<@&${IDS.ROLE_TICKET}>`,
          embeds: [embed],
          components: [row],
        });

        return interaction.reply({
          content: `✅ ${channel}`,
          ephemeral: true,
        });
      }

      /* ======================================
         CLOSE TICKET
      ====================================== */

      if (
        interaction.customId ===
        'close_ticket'
      ) {
        await interaction.reply(
          '🔒 Fermeture du ticket...'
        );

        setTimeout(() => {
          interaction.channel
            .delete()
            .catch(() => {});
        }, 3000);
      }

      /* ======================================
         PLAINTES
      ====================================== */

      if (
        interaction.customId ===
        'plainte_open'
      ) {
        const modal = new ModalBuilder()
          .setCustomId('plainte_modal')
          .setTitle('Plainte anonyme');

        const input =
          new TextInputBuilder()
            .setCustomId('plainte_text')
            .setLabel('Explique ta plainte')
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            input
          )
        );

        return interaction.showModal(modal);
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          'plainte_modal'
      ) {
        const text =
          interaction.fields.getTextInputValue(
            'plainte_text'
          );

        const salon =
          interaction.guild.channels.cache.get(
            IDS.SALON_PLAINTE_STAFF
          );

        if (!salon) return;

        const embed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('⚖️ Nouvelle plainte')
          .setDescription(text)
          .setFooter({
            text: 'Plainte anonyme',
          });

        salon.send({
          embeds: [embed],
        });

        interaction.reply({
          content:
            '✅ Plainte envoyée.',
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
);

/* =======================================================
   VOICE
======================================================= */

client.on(
  'voiceStateUpdate',
  async (oldState, newState) => {
    const member = newState.member;

    if (
      !oldState.channelId &&
      newState.channelId
    ) {
      voiceJoin.set(member.id, Date.now());
    }

    if (
      oldState.channelId &&
      !newState.channelId
    ) {
      const join =
        voiceJoin.get(member.id);

      if (!join) return;

      const total =
        (voiceTime.get(member.id) || 0) +
        (Date.now() - join);

      voiceTime.set(member.id, total);

      voiceJoin.delete(member.id);
    }
  }
);

/* =======================================================
   TOP MESSAGES
======================================================= */

async function sendTopMessages(guild) {
  const salon =
    guild.channels.cache.get(
      IDS.SALON_TOP_MSG
    );

  if (!salon) return;

  const sorted = [
    ...messageCount.entries(),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const lines = sorted.map((x, i) => {
    const member =
      guild.members.cache.get(x[0]);

    return `**${i + 1}.** ${
      member?.displayName || 'Inconnu'
    } — ${x[1]} msgs`;
  });

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('💬 Top Messages')
    .setDescription(
      lines.join('\n') ||
        'Aucune donnée.'
    );

  salon.send({ embeds: [embed] });
}

/* =======================================================
   TOP VOCAL
======================================================= */

async function sendTopVoice(guild) {
  const salon =
    guild.channels.cache.get(
      IDS.SALON_TOP_VOC
    );

  if (!salon) return;

  const sorted = [
    ...voiceTime.entries(),
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const lines = sorted.map((x, i) => {
    const member =
      guild.members.cache.get(x[0]);

    const h = Math.floor(
      x[1] / 3600000
    );

    const m = Math.floor(
      (x[1] % 3600000) / 60000
    );

    return `**${i + 1}.** ${
      member?.displayName || 'Inconnu'
    } — ${h}h ${m}m`;
  });

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎧 Top Vocal')
    .setDescription(
      lines.join('\n') ||
        'Aucune donnée.'
    );

  salon.send({ embeds: [embed] });
}

async function updateVoiceLeaderboard() {
  const guild =
    client.guilds.cache.first();

  if (!guild) return;

  sendTopVoice(guild);
}

/* =======================================================
   ERRORS
======================================================= */

process.on(
  'unhandledRejection',
  console.error
);

process.on(
  'uncaughtException',
  console.error
);

/* =======================================================
   LOGIN
======================================================= */

client.login(process.env.DISCORD_TOKEN);
