const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current queue'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });
        }

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray();

        const embed = new EmbedBuilder()
            .setTitle(`Queue for ${interaction.guild.name}`)
            .setColor('#2b2d31')
            .addFields(
                { name: 'Now Playing', value: `🎶 | **${currentTrack.title}**` }
            );

        if (tracks.length > 0) {
            const nextSongs = tracks.slice(0, 10).map((track, i) => `${i + 1}. **${track.title}**`).join('\n');
            embed.addFields({ name: 'Up Next', value: nextSongs });
        } else {
            embed.addFields({ name: 'Up Next', value: 'None' });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
