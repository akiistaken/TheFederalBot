const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available moderation and utility commands.'),
    async execute(interaction) {
        // Fetch all commands loaded in the bot
        const commands = interaction.client.commands;
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Moderation Bot Commands')
            .setDescription('Here is a list of all the commands you can use to manage your server:')
            .setColor('Blue')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp();

        // Dynamically add a field for each command
        commands.forEach(cmd => {
            embed.addFields({
                name: `/${cmd.data.name}`,
                value: cmd.data.description || 'No description provided.',
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },
};
