// api/event.ts
// Receives login/register events from AniVault PHP (routed via Railway proxy)
// and posts an embed to the configured Discord log channel.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Routes } from 'discord-api-types/v10';
import { rest } from '../lib/discord';
import { buildRegisterEmbed, buildLoginEmbed, type UserInfo } from '../lib/embeds';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate shared secret
    if (req.headers['x-bot-secret'] !== process.env.BOT_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, user, method } = req.body as {
        type:   'login' | 'register';
        user:   UserInfo;
        method: string;
    };

    if (!type || !user?.username) {
        return res.status(400).json({ error: 'Missing type or user' });
    }

    const channelId = process.env.DISCORD_LOG_CHANNEL_ID;
    if (!channelId) {
        return res.status(500).json({ error: 'DISCORD_LOG_CHANNEL_ID not configured' });
    }

    const embed = type === 'register'
        ? buildRegisterEmbed(user, method ?? 'email')
        : buildLoginEmbed(user, method ?? 'email');

    try {
        await rest.post(Routes.channelMessages(channelId), {
            body: { embeds: [embed] },
        });
        return res.json({ ok: true });
    } catch (err: any) {
        console.error('[event] Discord post failed:', err?.message ?? err);
        return res.status(500).json({ error: 'Failed to post to Discord' });
    }
}
