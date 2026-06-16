const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure bot settings for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('logchannel')
                .setDescription('Set the channel for mod logs')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send logs to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('automod')
                .setDescription('Toggle the word filter automod')
                .addBooleanOption(option => 
                    option.setName('enabled')
                        .setDescription('Enable or disable automod')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('forbiddenwords')
                .setDescription('Set forbidden words for automod (comma separated)')
                .addStringOption(option => 
                    option.setName('words')
                        .setDescription('Comma separated list of words')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcomechannel')
                .setDescription('Set the channel for welcome messages')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send welcome messages to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome_channels')
                .setDescription('Set the channels to display in the welcome message')
                .addChannelOption(option => 
                    option.setName('channel1')
                        .setDescription('First channel to tag')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel2')
                        .setDescription('Second channel to tag')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addChannelOption(option => 
                    option.setName('channel3')
                        .setDescription('Third channel to tag')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))
                .addChannelOption(option => 
                    option.setName('channel4')
                        .setDescription('Fourth channel to tag')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autorole')
                .setDescription('Set the role given to new members automatically')
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription("The role to assign (must be below the bot's highest role)")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('testwelcome')
                .setDescription('Simulate a user joining the server to test your welcome message'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('eventchannel')
                .setDescription('Set the channel for global event notifications')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send event notifications to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to ping when an event starts (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('testevent')
                .setDescription('Manually trigger an event to test the notification system')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Ensure settings exist for guild
        db.run('INSERT OR IGNORE INTO settings (guild_id) VALUES (?)', [guildId], (err) => {
            if (err) console.error(err);
        });

        if (subcommand === 'logchannel') {
            const channel = interaction.options.getChannel('channel');
            db.run('UPDATE settings SET log_channel_id = ? WHERE guild_id = ?', [channel.id, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update log channel.', ephemeral: true });
                await interaction.reply(`Log channel updated to ${channel}.`);
            });
        } else if (subcommand === 'automod') {
            const enabled = interaction.options.getBoolean('enabled');
            db.run('UPDATE settings SET automod_enabled = ? WHERE guild_id = ?', [enabled ? 1 : 0, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update automod setting.', ephemeral: true });
                await interaction.reply(`Automod has been ${enabled ? 'enabled' : 'disabled'}.`);
            });
        } else if (subcommand === 'forbiddenwords') {
            const words = interaction.options.getString('words');
            db.run('UPDATE settings SET forbidden_words = ? WHERE guild_id = ?', [words, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update forbidden words.', ephemeral: true });
                await interaction.reply(`Forbidden words updated to: \`${words}\``);
            });
        } else if (subcommand === 'welcomechannel') {
            const channel = interaction.options.getChannel('channel');
            db.run('UPDATE settings SET welcome_channel_id = ? WHERE guild_id = ?', [channel.id, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update welcome channel.', ephemeral: true });
                await interaction.reply(`Welcome channel updated to ${channel}.`);
            });
        } else if (subcommand === 'welcome_channels') {
            const ch1 = interaction.options.getChannel('channel1');
            const ch2 = interaction.options.getChannel('channel2');
            const ch3 = interaction.options.getChannel('channel3');
            const ch4 = interaction.options.getChannel('channel4');

            const channels = [ch1, ch2, ch3, ch4].filter(c => c !== null).map(c => c.id).join(',');

            db.run('UPDATE settings SET welcome_ping_channels = ? WHERE guild_id = ?', [channels, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update welcome channels.', ephemeral: true });
                await interaction.reply(`Welcome ping channels updated successfully!`);
            });
        } else if (subcommand === 'autorole') {
            const role = interaction.options.getRole('role');
            db.run('UPDATE settings SET autorole_id = ? WHERE guild_id = ?', [role.id, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update autorole.', ephemeral: true });
                await interaction.reply(`Autorole updated to ${role}. New members will automatically receive this role.`);
            });
        } else if (subcommand === 'testwelcome') {
            await interaction.reply({ content: 'Simulating welcome message...', ephemeral: true });
            interaction.client.emit('guildMemberAdd', interaction.member);
        } else if (subcommand === 'eventchannel') {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            const roleId = role ? role.id : null;
            db.run('UPDATE settings SET event_channel_id = ?, event_role_id = ? WHERE guild_id = ?', [channel.id, roleId, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update event channel.', ephemeral: true });
                await interaction.reply(`Event notifications channel updated to ${channel}${role ? ` and will ping ${role}` : ''}.`);
            });
        } else if (subcommand === 'testevent') {
            await interaction.reply({ content: 'Simulating event trigger...', ephemeral: true });
            const { triggerEvent } = require('../eventMonitor');
            const dummyEvent = {
                name: '🧪 Test Event',
                time: '00:00',
                description: 'This is a manual test of the event notification system!'
            };
            await triggerEvent(interaction.client, dummyEvent);
        }
    },
};
