const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist from YouTube or Spotify')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song name or URL')
                .setRequired(true)),
    async execute(interaction) {
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: 'You are not connected to a voice channel!', ephemeral: true });
        }

        const query = interaction.options.getString('query');
        
        await interaction.deferReply();

        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user
                    }
                }
            });

            return interaction.followUp(`**${track.title}** enqueued!`);
        } catch (e) {
            console.error(e);
            return interaction.followUp(`Something went wrong: ${e.message}`);
        }
    },
};
