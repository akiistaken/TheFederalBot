const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cartelproof')
        .setDescription('Submit proof for the Cartel War event')
        .addAttachmentOption(option => 
            option.setName('proof')
                .setDescription('Image or video proof of the activity')
                .setRequired(true)),
    async execute(interaction) {
        const proof = interaction.options.getAttachment('proof');

        db.get('SELECT cartel_log_channel_id FROM settings WHERE guild_id = ?', [interaction.guild.id], async (err, row) => {
            if (err || !row || !row.cartel_log_channel_id) {
                return interaction.reply({ content: 'Cartel War proof channel is not set up. Please ask an admin to configure it using `/settings cartelchannel`.', ephemeral: true });
            }

            const logChannel = interaction.guild.channels.cache.get(row.cartel_log_channel_id);
            if (!logChannel) {
                return interaction.reply({ content: 'Cartel War proof channel could not be found.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('New Cartel War Proof')
                .setColor('Blue')
                .addFields(
                    { name: 'User', value: `${interaction.user} (${interaction.user.tag})` }
                )
                .setImage(proof.url)
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [embed] });
                await interaction.reply({ content: 'Your proof has been successfully submitted!', ephemeral: true });
            } catch (sendErr) {
                console.error('Failed to send cartel proof:', sendErr);
                await interaction.reply({ content: 'Failed to send your submission. Check bot permissions.', ephemeral: true });
            }
        });
    }
};
