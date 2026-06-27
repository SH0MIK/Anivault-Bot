// scripts/register-commands.ts
// Run once whenever you add/change slash commands:
//   npx ts-node scripts/register-commands.ts

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

try {
    const env = require('fs').readFileSync('.env', 'utf8');
    env.split('\n').forEach((line: string) => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
} catch {}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

const commands = [
    {
        name: 'anime',
        description: 'Look up an anime on AniVault',
        options: [{
            name: 'title',
            description: 'Anime title to search',
            type: 3, // STRING
            required: true,
        }],
    },
    {
        name: 'user',
        description: 'Look up an AniVault user profile and stats',
        options: [{
            name: 'username',
            description: 'AniVault username',
            type: 3, // STRING
            required: true,
        }],
    },
];

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_APP_ID!),
            { body: commands }
        );
        console.log(`✅ Registered ${commands.length} command(s): ${commands.map(c => '/' + c.name).join(', ')}`);
    } catch (err) {
        console.error('❌ Failed to register commands:', err);
    }
})();
