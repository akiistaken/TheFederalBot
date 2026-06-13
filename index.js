require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, EmbedBuilder, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('./db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const { startStreamMonitor } = require('./streamMonitor');

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    startStreamMonitor(client);
    
    // Force instant command registration in all servers to bypass global cache
    try {
        const commands = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`./commands/${file}`);
            commands.push(command.data.toJSON());
        }

        for (const guild of client.guilds.cache.values()) {
            await guild.commands.set(commands);
            console.log(`Instantly reloaded commands for guild: ${guild.name}`);
        }
    } catch (error) {
        console.error('Failed to instantly reload commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const errMessage = { content: 'There was an error while executing this command!', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errMessage);
            } else {
                await interaction.reply(errMessage);
            }
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'create_loa_request') {
            const modal = new ModalBuilder()
                .setCustomId('loamodal')
                .setTitle('Leave of Absence Request');

            const nameInput = new TextInputBuilder()
                .setCustomId('loa_name')
                .setLabel('Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const idInput = new TextInputBuilder()
                .setCustomId('loa_id')
                .setLabel('ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const reasonInput = new TextInputBuilder()
                .setCustomId('loa_reason')
                .setLabel('Reason')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const dateInput = new TextInputBuilder()
                .setCustomId('loa_date')
                .setLabel('Return Date (DD-MM-YYYY)')
                .setPlaceholder('e.g. 25-12-2026')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(reasonInput),
                new ActionRowBuilder().addComponents(dateInput)
            );

            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('create_ticket_')) {
            const ticketType = interaction.customId.replace('create_ticket_', '');

            const modal = new ModalBuilder()
                .setCustomId(`ticketmodal_${ticketType}`)
                .setTitle(`Open ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)} Ticket`);

            if (ticketType === 'suggestion') {
                const titleInput = new TextInputBuilder()
                    .setCustomId('ticketmodal_title')
                    .setLabel('Suggestion Title')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const explInput = new TextInputBuilder()
                    .setCustomId('ticketmodal_reason')
                    .setLabel('Explanation')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(explInput));
            } else {
                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticketmodal_reason')
                    .setLabel('Reason / Details')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            }

            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('loa_approve_') || interaction.customId.startsWith('loa_deny_')) {
            const isApprove = interaction.customId.startsWith('loa_approve_');
            const targetUserId = interaction.customId.replace(isApprove ? 'loa_approve_' : 'loa_deny_', '');

            db.get('SELECT loa_support_role_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
                if (err || !row || !row.loa_support_role_id) return interaction.reply({ content: 'LOA system error.', ephemeral: true });

                const hasSupportRole = interaction.member.roles.cache.has(row.loa_support_role_id);
                const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

                if (!hasSupportRole && !hasAdmin) {
                    return interaction.reply({ content: 'Only support staff can review LOA requests.', ephemeral: true });
                }

                if (!isApprove) {
                    const modal = new ModalBuilder()
                        .setCustomId(`loadenymodal_${targetUserId}`)
                        .setTitle('Deny LOA Request');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('deny_reason')
                        .setLabel('Reason for Denial (Optional)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    await interaction.showModal(modal);
                    return;
                }

                const newColor = 'Green';
                const statusText = 'Approved';

                const originalEmbed = interaction.message.embeds[0];
                const newEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(newColor)
                    .setTitle(`Leave of Absence Request - ${statusText}`);

                const rowComponent = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('dummy_btn')
                            .setLabel(statusText)
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true)
                    );

                try {
                    await interaction.update({ embeds: [newEmbed], components: [rowComponent] });
                } catch (error) {
                    console.error('Failed to update LOA message:', error);
                }

                try {
                    const targetUser = await interaction.client.users.fetch(targetUserId);
                    if (targetUser) {
                        await targetUser.send(`Your Leave of Absence (LOA) request in **${interaction.guild.name}** has been **${statusText}**.`);
                    }
                } catch (error) {
                    console.error('Failed to DM user about LOA status:', error);
                }
            });
        } else if (interaction.customId === 'close_ticket') {
            db.get('SELECT ticket_support_role_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
                if (err || !row || !row.ticket_support_role_id) return interaction.reply({ content: 'Ticket system error.', ephemeral: true });

                const hasSupportRole = interaction.member.roles.cache.has(row.ticket_support_role_id);
                const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

                if (!hasSupportRole && !hasAdmin) {
                    return interaction.reply({ content: 'Only support staff can close this ticket.', ephemeral: true });
                }

                const rowComponent = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_close_ticket')
                            .setLabel('Confirm Close')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('⚠'),
                        new ButtonBuilder()
                            .setCustomId('transcript_ticket')
                            .setLabel('Transcript')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📄')
                    );
                await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [rowComponent] });
            });
        } else if (interaction.customId === 'confirm_close_ticket') {
            const channelToClose = interaction.channel;
            if (!channelToClose) return interaction.reply({ content: 'Channel not found.', ephemeral: true });

            channelToClose.delete().catch(err => console.error('Failed to delete ticket channel:', err));
        } else if (interaction.customId === 'transcript_ticket') {
            await interaction.deferReply();

            let messages = [];
            let lastId;
            while (true) {
                const fetched = await interaction.channel.messages.fetch({ limit: 100, before: lastId });
                if (fetched.size === 0) break;
                messages.push(...fetched.values());
                lastId = fetched.last().id;
            }
            messages.reverse();

            const text = messages.map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join('\n');
            const buffer = Buffer.from(text, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

            db.get('SELECT ticket_transcript_channel_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
                if (row && row.ticket_transcript_channel_id) {
                    const transcriptChannel = interaction.guild.channels.cache.get(row.ticket_transcript_channel_id);
                    if (transcriptChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('Ticket Transcript Generated')
                            .setDescription(`Transcript for \`${interaction.channel.name}\``)
                            .setColor('Green')
                            .setTimestamp();
                        await transcriptChannel.send({ embeds: [embed], files: [attachment] }).catch(console.error);
                    }
                }
            });

            await interaction.editReply({ content: 'Here is the transcript for this ticket:', files: [attachment] });
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'loamodal') {
            const userName = interaction.fields.getTextInputValue('loa_name');
            const userId = interaction.fields.getTextInputValue('loa_id');
            const userReason = interaction.fields.getTextInputValue('loa_reason');
            const userDate = interaction.fields.getTextInputValue('loa_date');

            // Validate date format (DD-MM-YYYY)
            const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
            if (!dateRegex.test(userDate)) {
                return interaction.reply({ content: 'Invalid date format! Please use DD-MM-YYYY (e.g. 25-12-2026) and try again.', ephemeral: true });
            }

            db.get('SELECT loa_channel_id, loa_support_role_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
                if (err || !row || !row.loa_channel_id || !row.loa_support_role_id) {
                    return interaction.reply({ content: 'LOA system is not completely set up.', ephemeral: true });
                }

                const loaChannel = interaction.guild.channels.cache.get(row.loa_channel_id);
                if (!loaChannel) return interaction.reply({ content: 'LOA Channel not found.', ephemeral: true });

                const embed = new EmbedBuilder()
                    .setTitle('Leave of Absence Request')
                    .setColor('Purple')
                    .addFields(
                        { name: 'Name', value: userName, inline: true },
                        { name: 'ID', value: userId, inline: true },
                        { name: 'Return Date', value: userDate, inline: true },
                        { name: 'Reason', value: userReason, inline: false }
                    )
                    .setTimestamp();

                const rowComponent = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`loa_approve_${interaction.user.id}`)
                            .setLabel('Approve')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`loa_deny_${interaction.user.id}`)
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger)
                    );

                try {
                    await loaChannel.send({ content: `<@&${row.loa_support_role_id}> | Submitted by ${interaction.user}`, embeds: [embed], components: [rowComponent] });
                    await interaction.reply({ content: 'Your LOA request has been submitted!', ephemeral: true });
                } catch (error) {
                    console.error('Failed to post LOA request:', error);
                    await interaction.reply({ content: 'Failed to post your LOA request.', ephemeral: true });
                }
            });
        } else if (interaction.customId.startsWith('loadenymodal_')) {
            const targetUserId = interaction.customId.replace('loadenymodal_', '');
            const denyReason = interaction.fields.getTextInputValue('deny_reason');

            const statusText = 'Denied';
            const newColor = 'Red';

            try {
                const originalEmbed = interaction.message.embeds[0];
                const newEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(newColor)
                    .setTitle(`Leave of Absence Request - ${statusText}`);

                if (denyReason) {
                    newEmbed.addFields({ name: 'Denial Reason', value: denyReason });
                }

                const rowComponent = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('dummy_btn')
                            .setLabel(statusText)
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                await interaction.update({ embeds: [newEmbed], components: [rowComponent] });

                const targetUser = await interaction.client.users.fetch(targetUserId);
                if (targetUser) {
                    let dmMsg = `Your Leave of Absence (LOA) request in **${interaction.guild.name}** has been **${statusText}**.`;
                    if (denyReason) {
                        dmMsg += `\n**Reason:** ${denyReason}`;
                    }
                    await targetUser.send(dmMsg).catch(() => {});
                }
            } catch (error) {
                console.error('Failed to process LOA denial modal:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Failed to process denial.', ephemeral: true });
                }
            }
        } else if (interaction.customId.startsWith('announce_')) {
            const parts = interaction.customId.split('_');
            const channelId = parts[1];
            const pingRoleId = parts[2];
            const messageText = interaction.fields.getTextInputValue('announce_message');
            
            let imageUrl = '';
            try { imageUrl = interaction.fields.getTextInputValue('announce_image'); } catch (e) {}

            let threadName = '';
            try { threadName = interaction.fields.getTextInputValue('announce_thread'); } catch (e) {}

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return interaction.reply({ content: 'Channel not found!', ephemeral: true });

            let finalContent = messageText;
            if (pingRoleId !== 'none') {
                finalContent = `<@&${pingRoleId}>\n\n${finalContent}`;
            }

            const messageOptions = { content: finalContent };

            if (imageUrl) {
                const embed = new EmbedBuilder()
                    .setImage(imageUrl)
                    .setColor('#2b2d31');
                messageOptions.embeds = [embed];
            }

            try {
                if (channel.type === ChannelType.GuildForum) {
                    const finalThreadName = threadName || 'Announcement';
                    await channel.threads.create({
                        name: finalThreadName,
                        message: messageOptions,
                        reason: 'Forum Announcement'
                    });
                } else {
                    const sentMessage = await channel.send(messageOptions);
                    
                    if (threadName) {
                        await sentMessage.startThread({
                            name: threadName,
                            autoArchiveDuration: 1440,
                            reason: 'Announcement Discussion Thread'
                        });
                    }
                }
                
                await interaction.reply({ content: `Announcement successfully sent to ${channel}!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `Failed to send announcement to ${channel}.`, ephemeral: true });
            }
        } else if (interaction.customId.startsWith('ticketsetup_')) {
            const parts = interaction.customId.split('_');
            const categoryId = parts[1];
            const supportRoleId = parts[2];
            const transcriptChannelId = parts[3] === 'none' ? null : parts[3];

            const messageText = interaction.fields.getTextInputValue('ticketsetup_message');

            db.run('INSERT OR IGNORE INTO settings (guild_id) VALUES (?)', [interaction.guild.id]);
            db.run('UPDATE settings SET ticket_category_id = ?, ticket_support_role_id = ?, ticket_transcript_channel_id = ? WHERE guild_id = ?',
                [categoryId, supportRoleId, transcriptChannelId, interaction.guild.id], async (err) => {
                    if (err) return interaction.reply({ content: 'Failed to save ticket settings.', ephemeral: true });

                    const embed = new EmbedBuilder()
                        .setTitle('Support Tickets')
                        .setDescription(messageText)
                        .setColor('Blue');

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_ticket_report')
                                .setLabel('Report 🚨')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId('create_ticket_appeal')
                                .setLabel('Appeal ⚖')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('create_ticket_suggestion')
                                .setLabel('Suggestion 💡')
                                .setStyle(ButtonStyle.Success)
                        );

                    await interaction.channel.send({ embeds: [embed], components: [row] });
                    await interaction.reply({ content: 'Ticket system set up successfully.', ephemeral: true });
                });
        } else if (interaction.customId.startsWith('editmsg_')) {
            const parts = interaction.customId.split('_');
            const channelId = parts[1];
            const messageId = parts[2];

            const newContent = interaction.fields.getTextInputValue('editmsg_content');

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return interaction.reply({ content: 'Channel not found!', ephemeral: true });

            try {
                const targetMessage = await channel.messages.fetch(messageId);
                await targetMessage.edit({ content: newContent });
                await interaction.reply({ content: 'Message edited successfully!', ephemeral: true });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Failed to edit message. It might have been deleted or I lack permissions.', ephemeral: true });
            }
        } else if (interaction.customId.startsWith('ticketmodal_')) {
            const ticketType = interaction.customId.replace('ticketmodal_', '');
            let userReason = '';
            let userTitle = '';

            if (ticketType === 'suggestion') {
                userTitle = interaction.fields.getTextInputValue('ticketmodal_title');
                userReason = interaction.fields.getTextInputValue('ticketmodal_reason');
            } else {
                userReason = interaction.fields.getTextInputValue('ticketmodal_reason');
            }

            db.get('SELECT ticket_category_id, ticket_support_role_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
                if (err || !row) return interaction.reply({ content: 'Ticket system is not set up correctly.', ephemeral: true });

                const categoryId = row.ticket_category_id;
                const supportRoleId = row.ticket_support_role_id;

                if (!categoryId || !supportRoleId) {
                    return interaction.reply({ content: 'Ticket system is missing configuration. Tell an admin to run `/ticket setup`.', ephemeral: true });
                }

                // Create the channel
                try {
                    let channelPrefix = 'ticket';
                    let embedTitle = 'Support Ticket';
                    let color = 'Blue';

                    if (ticketType === 'report') {
                        channelPrefix = 'report';
                        embedTitle = 'Report Ticket';
                        color = 'Red';
                    } else if (ticketType === 'appeal') {
                        channelPrefix = 'appeal';
                        embedTitle = 'Appeal Ticket';
                        color = 'Grey';
                    } else if (ticketType === 'suggestion') {
                        channelPrefix = 'suggest';
                        embedTitle = 'Suggestion Ticket';
                        color = 'Green';
                    }

                    const ticketChannel = await interaction.guild.channels.create({
                        name: `${channelPrefix}-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        parent: categoryId,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: interaction.user.id, // The user who clicked
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                            },
                            {
                                id: supportRoleId, // The support role
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                            },
                            {
                                id: interaction.client.user.id, // The bot itself
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                            }
                        ]
                    });

                    const embed = new EmbedBuilder()
                        .setTitle(embedTitle)
                        .setDescription(`Welcome ${interaction.user}! Support will be with you shortly.`)
                        .setColor(color);

                    if (ticketType === 'suggestion') {
                        embed.addFields(
                            { name: 'Suggestion Title', value: userTitle },
                            { name: 'Explanation', value: userReason }
                        );
                    } else {
                        embed.addFields({ name: 'Reason / Details', value: userReason });
                    }

                    const rowComponent = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('Close Ticket')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('🔒')
                        );

                    await ticketChannel.send({ content: `<@&${supportRoleId}> | ${interaction.user}`, embeds: [embed], components: [rowComponent] });
                    await interaction.reply({ content: `Ticket created! Head over to ${ticketChannel}`, ephemeral: true });

                } catch (err) {
                    console.error('Failed to create ticket channel:', err);
                    await interaction.reply({ content: 'Failed to create your ticket. The bot might be missing permissions.', ephemeral: true });
                }
            });
        }
    }
});

// Automod System (Word Filter)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    db.get('SELECT automod_enabled, forbidden_words, log_channel_id FROM settings WHERE guild_id = ?', [message.guild.id], async (err, row) => {
        if (err || !row || !row.automod_enabled || !row.forbidden_words) return;

        const forbiddenWords = row.forbidden_words.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
        if (forbiddenWords.length === 0) return;

        const messageContent = message.content.toLowerCase();
        const containsForbiddenWord = forbiddenWords.some(word => messageContent.includes(word));

        if (containsForbiddenWord) {
            try {
                await message.delete();
                await message.channel.send(`${message.author}, your message was deleted for containing forbidden words.`).then(m => setTimeout(() => m.delete().catch(() => { }), 5000));

                // Log the action
                if (row.log_channel_id) {
                    const logChannel = message.guild.channels.cache.get(row.log_channel_id);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('Automod: Message Deleted')
                            .setColor('Red')
                            .addFields(
                                { name: 'User', value: `${message.author} (${message.author.id})` },
                                { name: 'Channel', value: `${message.channel}` },
                                { name: 'Content', value: message.content.substring(0, 1024) }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (error) {
                console.error('Failed to delete message or send log:', error);
            }
        }
    });
});

// Welcome System & Autorole
client.on('guildMemberAdd', async member => {
    db.get('SELECT welcome_channel_id, welcome_ping_channels, autorole_id FROM settings WHERE guild_id = ?', [member.guild.id], async (err, row) => {
        if (err || !row) return;

        // Auto-role assignment if NOT pending (Onboarding disabled)
        if (!member.pending && row.autorole_id) {
            const role = member.guild.roles.cache.get(row.autorole_id);
            if (role) {
                member.roles.add(role).catch(err => console.error('Failed to assign autorole:', err));
            }
        }

        if (!row.welcome_channel_id) return;

        const welcomeChannel = member.guild.channels.cache.get(row.welcome_channel_id);
        if (!welcomeChannel) return;

        let channelsString = '';
        if (row.welcome_ping_channels) {
            const channels = row.welcome_ping_channels.split(',');
            channelsString = channels.map(id => `<#${id}>`).join(' | ');
        }

        const embed = new EmbedBuilder()
            .setTitle('✨ Welcome to The Federals! ✨')
            .setDescription(`Hello ${member}, welcome to **${member.guild.name}**! We are absolutely thrilled to have you join us.`)
            .setColor('#2b2d31')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '📚 Getting Started', value: channelsString ? `Please check out the following channels to get familiar with our server:\n\n${channelsString}` : 'Please check out our rules channel to get familiar with the guidelines.', inline: false },
                { name: '💬 Join the Chat', value: "Jump into the general chat and say hello to everyone! Don't be shy.", inline: false }
            )
            .setFooter({ text: `Member #${member.guild.memberCount} • Enjoy your stay!`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        try {
            // Mention the user outside the embed so they actually get pinged
            await welcomeChannel.send({ content: `Hey ${member}!`, embeds: [embed] });
        } catch (error) {
            console.error('Failed to send welcome message:', error);
        }
    });
});

// Handle Onboarding Completion (Pending -> Not Pending)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.pending && !newMember.pending) {
        db.get('SELECT autorole_id FROM settings WHERE guild_id = ?', [newMember.guild.id], async (err, row) => {
            if (err || !row || !row.autorole_id) return;

            const role = newMember.guild.roles.cache.get(row.autorole_id);
            if (role) {
                newMember.roles.add(role).catch(err => console.error('Failed to assign autorole after screening:', err));
            }
        });
    }
});

// Reaction Roles
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (!reaction.message.guildId) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const emojiName = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

    db.get('SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?', [reaction.message.id, emojiName], async (err, row) => {
        if (err || !row) return;

        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const role = reaction.message.guild.roles.cache.get(row.role_id);
        if (!role) return;

        try {
            await member.roles.add(role);
        } catch (error) {
            console.error('Failed to add role via reaction:', error);
        }
    });
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (!reaction.message.guildId) return;

    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    const emojiName = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

    db.get('SELECT role_id FROM reaction_roles WHERE message_id = ? AND emoji = ?', [reaction.message.id, emojiName], async (err, row) => {
        if (err || !row) return;

        const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return;

        const role = reaction.message.guild.roles.cache.get(row.role_id);
        if (!role) return;

        try {
            await member.roles.remove(role);
        } catch (error) {
            console.error('Failed to remove role via reaction:', error);
        }
    });
});

client.login(process.env.DISCORD_TOKEN);
