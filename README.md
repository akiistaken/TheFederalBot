# TheFederalBot (Discord Mod Bot)

A powerful, multi-purpose Discord moderation bot built with Discord.js (v14) and SQLite.

## Features

- **Moderation**: Ban, kick, timeout, warn, and purge commands.
- **Tickets**: Create and manage support tickets.
- **Announcements**: Send and edit rich embed announcements.
- **Reaction Roles**: Easily set up reaction roles for users to self-assign roles.
- **Role Requests**: Interactive system for users to request roles, with staff approval workflows.
- **Leave of Absence (LOA)**: System for staff to request and track LOAs.
- **Stream Monitor**: Automatic announcements for Twitch & YouTube live streams and YouTube video uploads.
- **Automod & Welcome**: Word filtering, welcome messages, and auto-role assignment.
- **Settings**: Guild-specific configuration using SQLite.
- **Advanced Event Systems**: Automated scheduling and isolated roster tracking for Cartel Wars and Standard Events.
- **Custom Events**: Schedule or instantly trigger custom one-off events on the fly with custom point values.
- **Enforcer Loyalty System**: Advanced, admin-verified proof submission utilizing automated private threads, dynamic point tracking, and leaderboards.

## Commands

- `/announce`: Send an announcement to a channel.
- `/announcements`: Manage and view past announcements.
- `/ban`: Ban a user from the server.
- `/edit_announce`: Edit an existing announcement message.
- `/event`: Create custom instant or scheduled events with custom point values.
- `/help`: Display a list of available commands.
- `/kick`: Kick a user from the server.
- `/leaderboard`: View the top enforcers leaderboard.
- `/loa`: Manage the Leave of Absence request system.
- `/purge`: Delete a specified number of messages.
- `/reactionrole`: Set up a reaction role message.
- `/rolerequest`: Set up and manage the role request system.
- `/settings`: Configure bot settings for the server (e.g., log channels, event channels).
- `/submitproof`: Universal command to submit participation proofs directly into private admin event threads.
- `/ticket`: Create a support ticket system.
- `/timeout`: Temporarily timeout a user.
- `/warn`: Issue a warning to a user.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/akiistaken/TheFederalBot.git
   cd TheFederalBot
   ```

2. **Install dependencies**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory and add your bot token and IDs:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ```
   *(Update the variables based on your specific requirements)*

4. **Deploy Commands & Run**
   ```bash
   node deploy-commands.js
   node index.js
   ```

## Technologies Used
- Node.js
- discord.js
- sqlite3
- dotenv
- axios
