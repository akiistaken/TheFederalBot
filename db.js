const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'bot_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create Warnings Table
        db.run(`CREATE TABLE IF NOT EXISTS warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            moderator_id TEXT NOT NULL,
            reason TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Guild Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            guild_id TEXT PRIMARY KEY,
            log_channel_id TEXT,
            automod_enabled BOOLEAN DEFAULT 1,
            forbidden_words TEXT DEFAULT ''
        )`, () => {
            // Add columns for welcome system, stream announcements, and autorole (fails silently if they already exist)
            db.run(`ALTER TABLE settings ADD COLUMN welcome_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN info_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN announcement_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN autorole_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN ticket_category_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN ticket_support_role_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN ticket_transcript_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN welcome_ping_channels TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN loa_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN loa_support_role_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN rolereq_log_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN rolereq_support_role_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN event_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN event_role_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN event_log_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN cartel_channel_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN cartel_role_id TEXT`, () => {});
            db.run(`ALTER TABLE settings ADD COLUMN cartel_log_channel_id TEXT`, () => {});
        });

        // Create Custom Events Table
        db.run(`CREATE TABLE IF NOT EXISTS custom_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            time TEXT NOT NULL
        )`);

        // Create Points Table
        db.run(`CREATE TABLE IF NOT EXISTS points (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        )`);

        // Create Streamers Table
        db.run(`CREATE TABLE IF NOT EXISTS streamers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            username TEXT NOT NULL,
            last_stream_id TEXT,
            last_video_id TEXT
        )`, () => {
            // Fails silently if it already exists
            db.run(`ALTER TABLE streamers ADD COLUMN last_video_id TEXT`, () => {});
        });

        // Create Reaction Roles Table
        db.run(`CREATE TABLE IF NOT EXISTS reaction_roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            emoji TEXT NOT NULL,
            role_id TEXT NOT NULL
        )`);
    }
});

module.exports = db;
