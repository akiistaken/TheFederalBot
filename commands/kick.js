const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a user from the server.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for kicking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'I cannot kick this user! Do they have a higher role? Do I have kick permissions?', ephemeral: true });
        }

        try {
            await member.kick(reason);
            await interaction.reply(`Successfully kicked **${targetUser.tag}** for reason: ${reason}`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to kick this user.', ephemeral: true });
        }
    },
};
