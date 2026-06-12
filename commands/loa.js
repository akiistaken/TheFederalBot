const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loa')
        .setDescription('Manage the Leave of Absence system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the LOA panel in this channel')
                .addChannelOption(option => 
                    option.setName('loa_channel')
                        .setDescription('The channel to post LOA requests')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('support_role')
                        .setDescription('The role that can approve/deny LOA requests')
                        .setRequired(true))),
                
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'setup') {
            const loaChannel = interaction.options.getChannel('loa_channel');
            const supportRole = interaction.options.getRole('support_role');

            db.run('INSERT OR IGNORE INTO settings (guild_id) VALUES (?)', [interaction.guild.id]);
            db.run('UPDATE settings SET loa_channel_id = ?, loa_support_role_id = ? WHERE guild_id = ?',
                [loaChannel.id, supportRole.id, interaction.guild.id], async (err) => {
                    if (err) return interaction.reply({ content: 'Failed to save LOA settings.', ephemeral: true });

                    const embed = new EmbedBuilder()
                        .setTitle('Leave of Absence (LOA)')
                        .setDescription('Need to take some time off? Click the button below to apply for a Leave of Absence. Staff will review your request.')
                        .setColor('Purple');

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_loa_request')
                                .setLabel('Apply LOA ✈')
                                .setStyle(ButtonStyle.Primary)
                        );

                    await interaction.channel.send({ embeds: [embed], components: [row] });
                    await interaction.reply({ content: `LOA system set up! Requests will be sent to ${loaChannel}.`, ephemeral: true });
                });
        }
    },
};
