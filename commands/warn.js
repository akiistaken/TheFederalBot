const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warning system commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Warn a user')
                .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
                .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List warnings for a user')
                .addUserOption(option => option.setName('target').setDescription('The user to check').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option => option.setName('target').setDescription('The user to clear warnings for').setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('target');
        const guildId = interaction.guild.id;

        if (subcommand === 'add') {
            const reason = interaction.options.getString('reason');
            db.run('INSERT INTO warnings (user_id, guild_id, moderator_id, reason) VALUES (?, ?, ?, ?)', 
                [targetUser.id, guildId, interaction.user.id, reason], 
                async function(err) {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: 'Failed to add warning.', ephemeral: true });
                    }
                    await interaction.reply(`Successfully warned **${targetUser.tag}** for: ${reason}`);
                }
            );
        } else if (subcommand === 'list') {
            db.all('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ?', [targetUser.id, guildId], async (err, rows) => {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Failed to fetch warnings.', ephemeral: true });
                }

                if (rows.length === 0) {
                    return interaction.reply(`**${targetUser.tag}** has no warnings.`);
                }

                const embed = new EmbedBuilder()
                    .setTitle(`Warnings for ${targetUser.tag}`)
                    .setColor('Orange');

                rows.forEach((row, index) => {
                    embed.addFields({ name: `Warning ${index + 1}`, value: `**Reason:** ${row.reason}\n**Moderator:** <@${row.moderator_id}>\n**Date:** ${row.timestamp}` });
                });

                await interaction.reply({ embeds: [embed] });
            });
        } else if (subcommand === 'clear') {
            db.run('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?', [targetUser.id, guildId], async function(err) {
                if (err) {
                    console.error(err);
                    return interaction.reply({ content: 'Failed to clear warnings.', ephemeral: true });
                }
                await interaction.reply(`Successfully cleared all warnings for **${targetUser.tag}**.`);
            });
        }
    },
};
