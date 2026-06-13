const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolerequest')
        .setDescription('Manage the role request system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the role request system')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post the request button in')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_channel')
                        .setDescription('The channel where staff will receive requests')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('support_role')
                        .setDescription('The role that can grant the requested roles')
                        .setRequired(true))
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'setup') {
            const requestChannel = interaction.options.getChannel('channel');
            const logChannel = interaction.options.getChannel('log_channel');
            const supportRole = interaction.options.getRole('support_role');

            db.run('INSERT OR IGNORE INTO settings (guild_id) VALUES (?)', [interaction.guild.id]);
            db.run('UPDATE settings SET rolereq_log_channel_id = ?, rolereq_support_role_id = ? WHERE guild_id = ?',
                [logChannel.id, supportRole.id, interaction.guild.id], async (err) => {
                    if (err) {
                        console.error('Failed to update role request settings:', err);
                        return interaction.reply({ content: 'Database error. Failed to set up the system.', ephemeral: true });
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('Role Request')
                        .setDescription('Click the button below to request your roles. You will need to provide your Rank, In Game Name, and ID.')
                        .setColor('Blue');

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_role_request')
                                .setLabel('Request Roles')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📝')
                        );

                    try {
                        await requestChannel.send({ embeds: [embed], components: [row] });
                        await interaction.reply({ content: `Role request system set up!\nButton sent to ${requestChannel}.\nLogs will go to ${logChannel}.`, ephemeral: true });
                    } catch (sendErr) {
                        console.error('Failed to send role request button:', sendErr);
                        await interaction.reply({ content: `Role request settings saved, but I couldn't send the message to ${requestChannel}. Please check my permissions.`, ephemeral: true });
                    }
                });
        }
    },
};
