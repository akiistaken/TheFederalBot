const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Temporarily times out a user in the server.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const durationMinutes = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'I cannot timeout this user!', ephemeral: true });
        }

        try {
            const durationMs = durationMinutes * 60 * 1000;
            await member.timeout(durationMs, reason);
            await interaction.reply(`Successfully timed out **${targetUser.tag}** for ${durationMinutes} minutes. Reason: ${reason}`);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error trying to timeout this user.', ephemeral: true });
        }
    },
};
