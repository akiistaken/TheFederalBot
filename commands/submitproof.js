const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submitproof')
        .setDescription('Submit proof for an active event')
        .addAttachmentOption(option => 
            option.setName('proof')
                .setDescription('Image or video proof of the activity')
                .setRequired(true)),
    async execute(interaction) {
        const proof = interaction.options.getAttachment('proof');
        const pendingThreadId = interaction.client.pendingProofs.get(interaction.user.id);

        if (!pendingThreadId) {
            return interaction.reply({ content: 'You must click the "Submit Proof" button on an active event announcement before using this command!', ephemeral: true });
        }

        try {
            // Find the thread
            const channelManager = interaction.guild.channels;
            const thread = await channelManager.fetch(pendingThreadId).catch(() => null);

            if (!thread || !thread.isThread()) {
                // Clear state if thread is gone
                interaction.client.pendingProofs.delete(interaction.user.id);
                return interaction.reply({ content: 'The event proof thread could not be found. It may have been deleted or archived.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('New Event Proof Submission')
                .setColor('Blue')
                .addFields(
                    { name: 'User', value: `${interaction.user} (${interaction.user.tag})` }
                )
                .setImage(proof.url)
                .setTimestamp();

            let points = 5;
            const tName = thread.name.toLowerCase();
            const ptMatch = tName.match(/\[(\d+) pts\]/);
            if (ptMatch) points = parseInt(ptMatch[1]);
            else if (tName.includes('business war')) points = 15;
            else if (tName.includes('crown')) points = 20;
            else if (tName.includes('cartel')) points = 10;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_proof_${interaction.user.id}_${points}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_proof_${interaction.user.id}`)
                    .setLabel('Reject')
                    .setStyle(ButtonStyle.Danger)
            );

            await thread.send({ embeds: [embed], components: [row] });
            
            // Clear the state so they must click the button again for their next proof
            interaction.client.pendingProofs.delete(interaction.user.id);
            
            await interaction.reply({ content: 'Your proof has been successfully submitted to the event log!', ephemeral: true });
        } catch (error) {
            console.error('Failed to process submitproof command:', error);
            await interaction.reply({ content: 'Failed to submit proof. Please try again later or contact an admin.', ephemeral: true });
        }
    }
};
