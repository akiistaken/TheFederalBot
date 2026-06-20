const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top enforcers on the server'),
    async execute(interaction) {
        db.all('SELECT user_id, points FROM points WHERE guild_id = ? ORDER BY points DESC LIMIT 10', [interaction.guild.id], async (err, rows) => {
            if (err || !rows || rows.length === 0) {
                return interaction.reply({ content: 'No points have been awarded yet!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Top Enforcers Leaderboard')
                .setColor('Gold')
                .setTimestamp();

            let description = '';
            for (let i = 0; i < rows.length; i++) {
                description += `**${i + 1}.** <@${rows[i].user_id}> - ${rows[i].points} points\n`;
            }
            embed.setDescription(description);

            await interaction.reply({ embeds: [embed] });
        });
    }
};
