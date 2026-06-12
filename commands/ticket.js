const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket panel in this channel')
                .addChannelOption(option => 
                    option.setName('category')
                        .setDescription('The category where tickets will be created')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('support_role')
                        .setDescription('The role that will answer tickets')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('transcript_channel')
                        .setDescription('The channel to save transcripts to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Rename the current ticket')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('The new name for the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')),
                
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'setup') {
            const category = interaction.options.getChannel('category');
            const supportRole = interaction.options.getRole('support_role');
            const transcriptChannel = interaction.options.getChannel('transcript_channel');

            const customId = `ticketsetup_${category.id}_${supportRole.id}_${transcriptChannel ? transcriptChannel.id : 'none'}`;

            const modal = new ModalBuilder()
                .setCustomId(customId)
                .setTitle('Ticket Panel Setup');

            const messageInput = new TextInputBuilder()
                .setCustomId('ticketsetup_message')
                .setLabel('Panel Message')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue('Click a button below to open a support ticket.\n\n🚨 **Report**: Report a user or bug\n⚖ **Appeal**: Appeal a punishment\n💡 **Suggestion**: Submit a server suggestion');

            const firstActionRow = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        } else if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            
            try {
                await interaction.channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                await interaction.reply(`Added ${user} to the ticket.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to add user to this channel.', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
            
            try {
                await interaction.channel.permissionOverwrites.delete(user.id);
                await interaction.reply(`Removed ${user} from the ticket.`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to remove user from this channel.', ephemeral: true });
            }
        } else if (subcommand === 'rename') {
            const name = interaction.options.getString('name');
            try {
                await interaction.channel.setName(name);
                await interaction.reply(`Ticket renamed to **${name}**.`);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Failed to rename channel. Are you sure this is a ticket?', ephemeral: true });
            }
        } else if (subcommand === 'close') {
            const rowComponent = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_close_ticket')
                        .setLabel('Confirm Close')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⚠')
                );
            await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [rowComponent] });
        }
    },
};
