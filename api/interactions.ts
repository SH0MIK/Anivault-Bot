// api/interactions.ts
// Handles Discord slash command interactions.
// Discord POSTs here whenever someone uses a slash command in your server.
// Add new commands in the switch block below + register them via scripts/register-commands.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyKey } from 'discord-interactions';
import {
    InteractionType,
    InteractionResponseType,
    type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';

// Vercel must receive the raw body for signature verification — disable bodyParser
export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    // Verify the request is genuinely from Discord
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp  = req.headers['x-signature-timestamp'] as string;
    const rawBody    = await getRawBody(req);

    const isValid = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY!);
    if (!isValid) return res.status(401).send('Bad request signature');

    const interaction = JSON.parse(rawBody.toString());

    // ── PING (Discord endpoint verification) ────────────────
    if (interaction.type === InteractionType.Ping) {
        return res.json({ type: InteractionResponseType.Pong });
    }

    // ── Slash commands ───────────────────────────────────────
    if (interaction.type === InteractionType.ApplicationCommand) {
        const cmd = interaction as APIChatInputApplicationCommandInteraction;
        const name = cmd.data.name;

        switch (name) {
            // ── Add new commands here as you build features ──
            // case 'stats':   return handleStats(cmd, res);
            // case 'anime':   return handleAnime(cmd, res);
            // case 'profile': return handleProfile(cmd, res);

            default:
                return res.json({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: { content: '❓ Unknown command.', flags: 64 }, // 64 = ephemeral
                });
        }
    }

    return res.status(400).json({ error: 'Unknown interaction type' });
}
