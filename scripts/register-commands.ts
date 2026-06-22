// scripts/register-commands.ts
// Run this once whenever you add/change slash commands:
//   npx ts-node scripts/register-commands.ts

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import * as dotenv from 'fs';

// Load .env manually if present
try {
    const env = require('fs').readFileSync('.env', 'utf8');
    env.split('\n').forEach((line: string) => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
} catch {}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

// ── Define your slash commands here ─────────────────────────
// Add more as you build features
const commands = [
    // Example — uncomment and customise when ready:
    // {
    //     name: 'stats',
    //     description: 'Show AniVault site statistics',
    // },
    // {
    //     name: 'anime',
    //     description: 'Look up an anime on AniVault',
    //     options: [{
    //         name: 'title',
    //         description: 'Anime title to search',
    //         type: 3, // STRING
    //         required: true,
    //     }],
    // },
];

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APP_ID!),
            { body: commands }
        );
        console.log(`✅ Registered ${commands.length} command(s).`);
    } catch (err) {
        console.error('❌ Failed to register commands:', err);
    }
})();
