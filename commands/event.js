const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { triggerEvent } = require('../eventMonitor');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Create a custom event')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('now')
                .setDescription('Trigger a custom event immediately')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('Name of the event')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('Description of the event')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('points')
                        .setDescription('Points awarded for verified proof (default 5)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Schedule a custom event for a specific time')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('Name of the event')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('time')
                        .setDescription('Time in UTC (HH:MM) to trigger the event')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('Description of the event')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('points')
                        .setDescription('Points awarded for verified proof (default 5)')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || `A custom event: ${name}`;
        const pointsOpt = interaction.options.getInteger('points');
        const guildId = interaction.guild.id;

        if (pointsOpt) {
            name = `${name} [${pointsOpt} pts]`;
        }

        if (subcommand === 'now') {
            await interaction.deferReply({ ephemeral: true });
            try {
                await triggerEvent(interaction.client, { name, description }, guildId, true);
                await interaction.editReply({ content: `Successfully triggered the custom event **${name}** right now!` });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: 'Failed to trigger the event.' });
            }
        } else if (subcommand === 'schedule') {
            const time = interaction.options.getString('time');

            // Basic time format validation (HH:MM)
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(time)) {
                return interaction.reply({ content: 'Invalid time format. Please use HH:MM (e.g. 14:30) in UTC.', ephemeral: true });
            }

            db.run('INSERT INTO custom_events (guild_id, name, description, time) VALUES (?, ?, ?, ?)', 
                [guildId, name, description, time], 
                async function(err) {
                    if (err) return interaction.reply({ content: 'Failed to schedule the event in the database.', ephemeral: true });
                    await interaction.reply({ content: `Successfully scheduled custom event **${name}** for ${time} UTC. It will announce ~13 minutes prior.` });
                }
            );
        }
    }
};
