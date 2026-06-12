const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Edit Message')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        
    async execute(interaction) {
        const targetMessage = interaction.targetMessage;

        if (targetMessage.author.id !== interaction.client.user.id) {
            return interaction.reply({ content: 'You can only edit messages sent by the bot itself.', ephemeral: true });
        }

        const customId = `editmsg_${targetMessage.channelId}_${targetMessage.id}`;

        const modal = new ModalBuilder()
            .setCustomId(customId)
            .setTitle('Edit Message');

        const messageInput = new TextInputBuilder()
            .setCustomId('editmsg_content')
            .setLabel('Message Content')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(targetMessage.content.substring(0, 4000));

        const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },
};
