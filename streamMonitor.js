const axios = require('axios');
const db = require('./db');
const { EmbedBuilder } = require('discord.js');

let twitchAccessToken = null;
let twitchTokenExpiry = 0;

async function getTwitchToken() {
    if (Date.now() < twitchTokenExpiry && twitchAccessToken) return twitchAccessToken;
    
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
        const res = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
        twitchAccessToken = res.data.access_token;
        twitchTokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000; // 1 minute buffer
        return twitchAccessToken;
    } catch (error) {
        console.error('Failed to get Twitch token:', error.response?.data || error.message);
        return null;
    }
}

async function checkTwitch(client, rows) {
    const token = await getTwitchToken();
    if (!token) return;

    const clientId = process.env.TWITCH_CLIENT_ID;
    const twitchUsers = rows.filter(r => r.platform === 'twitch');
    if (twitchUsers.length === 0) return;

    for (const user of twitchUsers) {
        try {
            const res = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${user.username}`, {
                headers: {
                    'Client-ID': clientId,
                    'Authorization': `Bearer ${token}`
                }
            });

            const streamData = res.data.data[0];
            if (streamData && streamData.type === 'live') {
                if (user.last_stream_id !== streamData.id) {
                    await announceStream(client, user, streamData.title, `https://twitch.tv/${user.username}`, streamData.game_name, streamData.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'));
                    db.run('UPDATE streamers SET last_stream_id = ? WHERE id = ?', [streamData.id, user.id]);
                }
            } else if (!streamData && user.last_stream_id) {
                // Stream ended
                db.run('UPDATE streamers SET last_stream_id = NULL WHERE id = ?', [user.id]);
            }
        } catch (error) {
            console.error(`Twitch check failed for ${user.username}:`, error.message);
        }
    }
}

async function checkYouTube(client, rows) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return;

    const ytUsers = rows.filter(r => r.platform === 'youtube');
    if (ytUsers.length === 0) return;

    for (const user of ytUsers) {
        try {
            // Check if there is an active live broadcast for the channel
            const res = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${user.username}&eventType=live&type=video&key=${apiKey}`);
            const streamData = res.data.items[0];

            if (streamData) {
                const videoId = streamData.id.videoId;
                if (user.last_stream_id !== videoId) {
                    await announceStream(client, user, streamData.snippet.title, `https://www.youtube.com/watch?v=${videoId}`, 'YouTube Live', streamData.snippet.thumbnails.high.url);
                    db.run('UPDATE streamers SET last_stream_id = ? WHERE id = ?', [videoId, user.id]);
                }
            } else if (!streamData && user.last_stream_id) {
                db.run('UPDATE streamers SET last_stream_id = NULL WHERE id = ?', [user.id]);
            }
        } catch (error) {
            console.error(`YouTube check failed for ${user.username}:`, error.response?.data?.error?.message || error.message);
        }
    }
}

async function announceStream(client, dbRow, title, url, category, thumbnail) {
    db.get('SELECT announcement_channel_id FROM settings WHERE guild_id = ?', [dbRow.guild_id], async (err, setting) => {
        if (err || !setting || !setting.announcement_channel_id) return;
        
        const guild = client.guilds.cache.get(dbRow.guild_id);
        if (!guild) return;
        const channel = guild.channels.cache.get(setting.announcement_channel_id);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(`🔴 ${dbRow.username} is now LIVE on ${dbRow.platform === 'twitch' ? 'Twitch' : 'YouTube'}!`)
            .setDescription(`**${title}**\n\nWatch here: ${url}`)
            .setColor(dbRow.platform === 'twitch' ? '#9146FF' : '#FF0000')
            .setURL(url)
            .addFields({ name: 'Playing', value: category || 'N/A', inline: true })
            .setImage(thumbnail)
            .setTimestamp();

        try {
            await channel.send({ content: `@everyone **${dbRow.username}** is live!`, embeds: [embed] });
        } catch (error) {
            console.error(`Failed to send announcement in guild ${dbRow.guild_id}:`, error);
        }
    });
}

function startStreamMonitor(client) {
    console.log('Started Stream Monitor...');
    
    // Check APIs every 5 minutes
    setInterval(() => {
        db.all('SELECT id, guild_id, platform, username, last_stream_id FROM streamers', [], (err, rows) => {
            if (err || !rows || rows.length === 0) return;
            
            checkTwitch(client, rows);
            checkYouTube(client, rows);
        });
    }, 5 * 60 * 1000); 
}

module.exports = { startStreamMonitor };
