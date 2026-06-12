const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for banning'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        try {
            await interaction.guild.members.ban(targetUser, { reason });
            await interaction.reply(`Successfully banned **${targetUser.tag}** for reason: ${reason}`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to ban this user. Do they have a higher role? Do I have ban permissions?', ephemeral: true });
        }
    },
};
