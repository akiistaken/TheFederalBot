const db = require('./db');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

async function triggerEvent(client, event) {
    db.all('SELECT guild_id, event_channel_id, event_role_id, event_log_channel_id, cartel_channel_id, cartel_role_id, cartel_log_channel_id FROM settings', [], async (err, rows) => {
        if (err || !rows) return;

        const now = new Date();
        const eventTime = new Date(now.getTime() + 13 * 60 * 1000);
        const nyTime = eventTime.toLocaleString("en-US", { timeZone: "America/New_York", hour12: true, hour: "numeric", minute: "2-digit" });
        const discordTime = `<t:${Math.floor(eventTime.getTime() / 1000)}:t>`;

        const embed = new EmbedBuilder()
            .setTitle(`⏰ Event: ${event.name}`)
            .setDescription(`${event.description || `The event **${event.name}** is starting now!`}\n\n🕒 **Time:** ${nyTime} IC\n🌍 **Your Local Time:** ${discordTime}`)
            .setColor('Gold')
            .addFields({ name: 'Roster (0)', value: '*No one has joined yet.*' })
            .setTimestamp();

        const isCartel = event.name.toLowerCase().includes('cartel');

        const rowComponent = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('event_join')
                    .setLabel('Join Roster')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('event_leave')
                    .setLabel('Leave Roster')
                    .setStyle(ButtonStyle.Danger)
            );

        if (isCartel) {
            rowComponent.addComponents(
                new ButtonBuilder()
                    .setCustomId('cartel_submit_proof')
                    .setLabel('Submit Proof')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        // now is already defined above
        const currentHour = now.getUTCHours().toString().padStart(2, '0');
        const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        for (const row of rows) {
            try {
                const guild = client.guilds.cache.get(row.guild_id);
                if (guild) {
                    const targetChannelId = isCartel ? row.cartel_channel_id : row.event_channel_id;
                    const targetRoleId = isCartel ? row.cartel_role_id : row.event_role_id;
                    
                    if (!targetChannelId) continue;
                    
                    const channel = guild.channels.cache.get(targetChannelId);
                    if (channel) {
                        const messageContent = targetRoleId ? `<@&${targetRoleId}>` : null;
                        const messageOptions = { embeds: [embed], components: [rowComponent] };
                        if (messageContent) messageOptions.content = messageContent;

                        const sentMessage = await channel.send(messageOptions).catch(err => console.error(`Failed to send event to channel ${targetChannelId}:`, err));
                        
                        if (sentMessage) {
                            setTimeout(async () => {
                                try {
                                    const fetchedMsg = await channel.messages.fetch(sentMessage.id);
                                    if (fetchedMsg) {
                                        const disabledRow = new ActionRowBuilder()
                                            .addComponents(
                                                new ButtonBuilder()
                                                    .setCustomId('event_join_locked')
                                                    .setLabel('Join Roster (Locked)')
                                                    .setStyle(ButtonStyle.Secondary)
                                                    .setDisabled(true),
                                                new ButtonBuilder()
                                                    .setCustomId('event_leave_locked')
                                                    .setLabel('Leave Roster (Locked)')
                                                    .setStyle(ButtonStyle.Secondary)
                                                    .setDisabled(true)
                                            );
                                        await fetchedMsg.edit({ components: [disabledRow] });
                                    }
                                } catch (e) {
                                    console.error(`Failed to lock roster for message ${sentMessage.id}:`, e);
                                }
                            }, 11 * 60 * 1000); // Lock after 11 minutes
                        }
                    }

                    if (!isCartel && row.event_log_channel_id) {
                        const logChannel = guild.channels.cache.get(row.event_log_channel_id);
                        if (logChannel) {
                            const nyDate = eventTime.toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
                            const nyTimeString = eventTime.toLocaleString("en-US", { timeZone: "America/New_York", hour12: true, hour: "numeric", minute: "2-digit" });
                            const threadName = `${event.name} ${nyDate} ${nyTimeString}`;
                            const thread = await logChannel.threads.create({
                                name: threadName,
                                autoArchiveDuration: 1440,
                                reason: 'Event proof thread'
                            }).catch(err => console.error(`Failed to create thread in log channel ${row.event_log_channel_id}:`, err));

                            if (thread) {
                                await thread.send({ content: 'Ready to submit proof for this event? Post it here!' });
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to send event to guild ${row.guild_id}:`, e);
            }
        }
    });
}

function startEventMonitor(client) {
    console.log('Started Event Monitor...');
    
    // Check every minute
    setInterval(() => {
        // Check 13 minutes into the future
        const now = new Date();
        const futureTime = new Date(now.getTime() + 13 * 60 * 1000);
        const currentHour = futureTime.getUTCHours().toString().padStart(2, '0');
        const currentMinute = futureTime.getUTCMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        let events = [];
        try {
            const eventsPath = path.join(__dirname, 'events.json');
            if (fs.existsSync(eventsPath)) {
                events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
            }
        } catch (e) {
            console.error('Failed to read events.json:', e);
            return;
        }

        const triggeringEvents = events.filter(e => e.time === currentTime);

        if (triggeringEvents.length > 0) {
            for (const event of triggeringEvents) {
                triggerEvent(client, event);
            }
        }
    }, 60 * 1000);
}

module.exports = { startEventMonitor, triggerEvent };
