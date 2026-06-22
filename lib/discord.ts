import { REST } from '@discordjs/rest';

export const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
