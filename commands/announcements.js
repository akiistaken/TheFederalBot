const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announcements')
        .setDescription('Manage stream announcements')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Set the channel for live announcements')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send announcements to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a streamer to track')
                .addStringOption(option =>
                    option.setName('platform')
                        .setDescription('Twitch or YouTube')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Twitch', value: 'twitch' },
                            { name: 'YouTube', value: 'youtube' }
                        ))
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('The username of the streamer (Twitch username or YouTube channel ID)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a tracked streamer')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('The username to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all tracked streamers')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Ensure settings exist for guild
        db.run('INSERT OR IGNORE INTO settings (guild_id) VALUES (?)', [guildId], (err) => {
            if (err) console.error(err);
        });

        if (subcommand === 'setchannel') {
            const channel = interaction.options.getChannel('channel');
            db.run('UPDATE settings SET announcement_channel_id = ? WHERE guild_id = ?', [channel.id, guildId], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to update announcement channel.', ephemeral: true });
                await interaction.reply(`Announcement channel updated to ${channel}.`);
            });
        } else if (subcommand === 'add') {
            const platform = interaction.options.getString('platform');
            const username = interaction.options.getString('username');
            
            db.run('INSERT INTO streamers (guild_id, platform, username) VALUES (?, ?, ?)', [guildId, platform, username], async (err) => {
                if (err) return interaction.reply({ content: 'Failed to add streamer.', ephemeral: true });
                await interaction.reply(`Successfully added **${username}** (${platform}) to the watchlist.`);
            });
        } else if (subcommand === 'remove') {
            const username = interaction.options.getString('username');
            
            db.run('DELETE FROM streamers WHERE guild_id = ? AND username = ?', [guildId, username], function(err) {
                if (err) return interaction.reply({ content: 'Failed to remove streamer.', ephemeral: true });
                if (this.changes === 0) return interaction.reply({ content: 'Streamer not found in the list.', ephemeral: true });
                interaction.reply(`Successfully removed **${username}** from the watchlist.`);
            });
        } else if (subcommand === 'list') {
            db.all('SELECT platform, username FROM streamers WHERE guild_id = ?', [guildId], async (err, rows) => {
                if (err) return interaction.reply({ content: 'Failed to fetch streamers.', ephemeral: true });
                if (!rows || rows.length === 0) return interaction.reply('No streamers are currently being tracked.');
                
                const list = rows.map(r => `- **${r.username}** (${r.platform})`).join('\n');
                await interaction.reply(`**Tracked Streamers:**\n${list}`);
            });
        }
    },
};
