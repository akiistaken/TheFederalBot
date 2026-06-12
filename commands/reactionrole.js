const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Manage reaction roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('createpanel')
                .setDescription('Creates a new embed message for reaction roles in the current channel')
                .addStringOption(option => 
                    option.setName('title')
                        .setDescription('The title of the reaction role panel')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('The description/instructions for the panel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Bind an emoji to a role on an existing message')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the message to add the reaction to')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('emoji')
                        .setDescription('The emoji to react with')
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('role')
                        .setDescription('The role to give when a user reacts')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a reaction role binding')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the message')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('emoji')
                        .setDescription('The emoji to unbind')
                        .setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'createpanel') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor('Blurple');

            const message = await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: `Panel created! The Message ID is \`${message.id}\`. You can now use \`/reactionrole add\` with this ID.`, ephemeral: true });
            
        } else if (subcommand === 'add') {
            const messageId = interaction.options.getString('message_id');
            const emojiStr = interaction.options.getString('emoji').trim();
            const role = interaction.options.getRole('role');

            try {
                const message = await interaction.channel.messages.fetch(messageId);
                
                // Add the reaction to the message
                await message.react(emojiStr);

                // Store the string exactly as given (or parsed if custom)
                db.run('INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)', 
                    [guildId, messageId, interaction.channel.id, emojiStr, role.id], 
                    async (err) => {
                        if (err) return interaction.reply({ content: 'Failed to save to database.', ephemeral: true });
                        await interaction.reply({ content: `Successfully bound ${emojiStr} to ${role} on message \`${messageId}\`!`, ephemeral: true });
                    });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Failed to find that message or react with that emoji. Make sure the message is in this channel and the emoji is valid!', ephemeral: true });
            }
        } else if (subcommand === 'remove') {
            const messageId = interaction.options.getString('message_id');
            const emojiStr = interaction.options.getString('emoji').trim();

            db.run('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?', [guildId, messageId, emojiStr], async function(err) {
                if (err) return interaction.reply({ content: 'Failed to remove from database.', ephemeral: true });
                if (this.changes === 0) return interaction.reply({ content: 'No reaction role found with that message ID and emoji.', ephemeral: true });
                
                try {
                    const message = await interaction.channel.messages.fetch(messageId);
                    // Try to remove the bot's reaction
                    const reaction = message.reactions.cache.find(r => r.emoji.name === emojiStr || `<:${r.emoji.name}:${r.emoji.id}>` === emojiStr);
                    if (reaction) await reaction.users.remove(interaction.client.user.id);
                } catch (e) {
                    console.error('Failed to remove bot reaction:', e);
                }
                
                await interaction.reply({ content: `Successfully removed the reaction role for ${emojiStr}.`, ephemeral: true });
            });
        }
    },
};
