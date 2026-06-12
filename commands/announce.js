const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Make an announcement in a specific channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the announcement to')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('ping')
                .setDescription('A role to mention with this announcement (optional)')
                .setRequired(false)),
                
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const pingRole = interaction.options.getRole('ping');

        const customId = `announce_${channel.id}_${pingRole ? pingRole.id : 'none'}`;

        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle('Create Announcement');

        const messageInput = new TextInputBuilder()
            .setCustomId('announce_message')
            .setLabel('Announcement Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(messageInput);

        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },
};
