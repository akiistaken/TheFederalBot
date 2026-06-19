const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const ACTIVITY_POINTS = {
    'Kill': 3,
    'Store Robbery': 5,
    'Business War': 15,
    'Crown Holder': 20,
    'Cartel War': 10
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity')
        .setDescription('Activity Tracking and Leaderboard System')
        .addSubcommand(subcommand =>
            subcommand
                .setName('submit')
                .setDescription('Submit proof of an activity for points')
                .addStringOption(option => 
                    option.setName('type')
                        .setDescription('The type of activity')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kill (3 pts)', value: 'Kill' },
                            { name: 'Store Robbery (5 pts)', value: 'Store Robbery' },
                            { name: 'Business War Participation (15 pts)', value: 'Business War' },
                            { name: 'Crown Holder Participation (20 pts)', value: 'Crown Holder' },
                            { name: 'Cartel War Participation (10 pts)', value: 'Cartel War' }
                        ))
                .addAttachmentOption(option => 
                    option.setName('proof')
                        .setDescription('Image or video proof of the activity')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current points or someone else\\'s')
                .addUserOption(option => 
                    option.setName('target')
                        .setDescription('The user to view points for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the weekly activity leaderboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'submit') {
            const type = interaction.options.getString('type');
            const proof = interaction.options.getAttachment('proof');
            const points = ACTIVITY_POINTS[type] || 0;

            db.get('SELECT activity_channel_id, activity_support_role_id FROM settings WHERE guild_id = ?', [guildId], async (err, row) => {
                if (err || !row || !row.activity_channel_id || !row.activity_support_role_id) {
                    return interaction.reply({ content: 'The activity system is not configured yet. Ask an admin to run `/settings activitychannel`.', ephemeral: true });
                }

                db.run('INSERT INTO activity_logs (user_id, guild_id, activity_type, points, status) VALUES (?, ?, ?, ?, ?)',
                    [interaction.user.id, guildId, type, points, 'pending'],
                    async function(insertErr) {
                        if (insertErr) return interaction.reply({ content: 'Failed to submit activity to the database.', ephemeral: true });
                        
                        const logId = this.lastID;
                        const adminChannel = interaction.guild.channels.cache.get(row.activity_channel_id);
                        if (!adminChannel) return interaction.reply({ content: 'Activity log channel not found.', ephemeral: true });

                        const embed = new EmbedBuilder()
                            .setTitle('New Activity Submission')
                            .setColor('Yellow')
                            .addFields(
                                { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                                { name: 'Activity', value: type, inline: true },
                                { name: 'Points', value: `${points}`, inline: true }
                            )
                            .setImage(proof.url)
                            .setTimestamp();

                        const rowComponent = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`activity_approve_${logId}`)
                                    .setLabel('Approve')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(`activity_edit_${logId}`)
                                    .setLabel('Edit')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId(`activity_deny_${logId}`)
                                    .setLabel('Deny')
                                    .setStyle(ButtonStyle.Danger)
                            );

                        try {
                            await adminChannel.send({ content: `<@&${row.activity_support_role_id}> | Submission #${logId}`, embeds: [embed], components: [rowComponent] });
                            await interaction.reply({ content: `Your submission for **${type}** has been sent to High Command for approval.`, ephemeral: true });
                        } catch (sendErr) {
                            console.error('Failed to send activity submission:', sendErr);
                            await interaction.reply({ content: 'Failed to send your submission. Check bot permissions.', ephemeral: true });
                        }
                    }
                );
            });
        } else if (subcommand === 'view') {
            const targetUser = interaction.options.getUser('target') || interaction.user;

            db.get('SELECT SUM(points) as total_points FROM activity_logs WHERE user_id = ? AND guild_id = ? AND status = ?', 
                [targetUser.id, guildId, 'approved'], (err, row) => {
                    if (err) return interaction.reply({ content: 'Database error.', ephemeral: true });

                    const totalPoints = row ? (row.total_points || 0) : 0;
                    const embed = new EmbedBuilder()
                        .setTitle(`${targetUser.username}'s Activity Points`)
                        .setColor('Blue')
                        .setDescription(`${targetUser} has **${totalPoints}** approved points this week.`)
                        .setThumbnail(targetUser.displayAvatarURL());

                    interaction.reply({ embeds: [embed] });
                });
        } else if (subcommand === 'leaderboard') {
            db.all('SELECT user_id, SUM(points) as total_points FROM activity_logs WHERE guild_id = ? AND status = ? GROUP BY user_id ORDER BY total_points DESC LIMIT 10', 
                [guildId, 'approved'], (err, rows) => {
                    if (err) return interaction.reply({ content: 'Database error.', ephemeral: true });

                    const embed = new EmbedBuilder()
                        .setTitle('🏆 The Federal - Weekly Leaderboard')
                        .setColor('Gold')
                        .setTimestamp();

                    if (!rows || rows.length === 0) {
                        embed.setDescription('No approved activities yet this week! Get out there and earn some points.');
                    } else {
                        let leaderboardText = '';
                        rows.forEach((row, index) => {
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                            leaderboardText += `${medal} **#${index + 1}** <@${row.user_id}> - **${row.total_points} pts**\n`;
                        });
                        embed.setDescription(leaderboardText);
                    }

                    interaction.reply({ embeds: [embed] });
                });
        }
    }
};
