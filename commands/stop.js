const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the player and clear the queue'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });
        }

        queue.delete();
        return interaction.reply('Stopped the player and cleared the queue.');
    },
};
