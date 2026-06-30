// api/interactions.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyKey } from 'discord-interactions';
import {
    InteractionType,
    InteractionResponseType,
    type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { buildAnimeEmbed, buildUserEmbed, type AnimeInfo, type ProfileInfo } from '../lib/embeds';

export const config = { api: { bodyParser: false } };

const MAL_CLIENT  = process.env.MAL_CLIENT_ID!;
const RAILWAY_URL = process.env.RAILWAY_URL!;
const DISCORD_APP_ID = process.env.DISCORD_APP_ID!;

async function getRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// Sends the final result as a Discord follow-up message (used after deferring)
async function sendFollowUp(token: string, body: any) {
    const url = `https://discord.com/api/v10/webhooks/${DISCORD_APP_ID}/${token}/messages/@original`;
    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

// ── /anime handler (fast — responds immediately, no defer needed) ──
async function handleAnime(
    cmd: APIChatInputApplicationCommandInteraction,
    res: VercelResponse
) {
    const query = (cmd.data.options?.find(o => o.name === 'title') as any)?.value as string;
    if (!query) {
        return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: '❌ Please provide an anime title.', flags: 64 },
        });
    }

    try {
        const searchUrl = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(query)}&limit=1&fields=id,title,alternative_titles,main_picture,synopsis,mean,rank,num_episodes,status,media_type,rating,genres,studios,source`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT },
        });

        if (!searchRes.ok) throw new Error(`MAL API error: ${searchRes.status}`);

        const searchData = await searchRes.json() as any;
        const node = searchData?.data?.[0]?.node;

        if (!node) {
            return res.json({
                type: InteractionResponseType.ChannelMessageWithSource,
                data: { content: `❌ No results found for **${query}**.`, flags: 64 },
            });
        }

        const anime: AnimeInfo = {
            mal_id:        node.id,
            title:         node.title,
            title_english: node.alternative_titles?.en || '',
            synopsis:      node.synopsis,
            mean:          node.mean,
            rank:          node.rank,
            num_episodes:  node.num_episodes,
            status:        node.status,
            media_type:    node.media_type,
            rating:        node.rating,
            genres:        node.genres ?? [],
            studios:       node.studios ?? [],
            images:        { jpg: {
                large_image_url: node.main_picture?.large,
                image_url:       node.main_picture?.medium,
            }},
            source:        node.source,
        };

        return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { embeds: [buildAnimeEmbed(anime)] },
        });
    } catch (err: any) {
        console.error('[/anime]', err?.message);
        return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: '❌ Failed to fetch anime info. Try again later.', flags: 64 },
        });
    }
}

// ── /user handler (slow — FlareSolverr can take 10-30s, so we defer) ──
// Step 1: respond instantly with "thinking..." (within Discord's 3s window)
// Step 2: do the slow Railway/FlareSolverr lookup in the background
// Step 3: PATCH the original message with the real result once ready
async function handleUser(
    cmd: APIChatInputApplicationCommandInteraction,
    res: VercelResponse
) {
    const username = (cmd.data.options?.find(o => o.name === 'username') as any)?.value as string;
    const token = cmd.token;

    if (!username) {
        return res.json({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: '❌ Please provide a username.', flags: 64 },
        });
    }

    // 1. Immediately tell Discord "we're working on it"
    res.json({ type: InteractionResponseType.DeferredChannelMessageWithSource });

    // 2. Do the slow work AFTER responding (Vercel keeps the function alive
    //    until this promise resolves, since we don't return early)
    try {
        const apiUrl = `${RAILWAY_URL}/discord/user-lookup?username=${encodeURIComponent(username)}`;
        const apiRes = await fetch(apiUrl, {
            headers: { 'x-bot-secret': process.env.BOT_SECRET! },
        });

        if (apiRes.status === 404) {
            return sendFollowUp(token, { content: `❌ User **${username}** not found on AniVault.` });
        }

        if (!apiRes.ok) throw new Error(`Relay error: ${apiRes.status}`);

        const data = await apiRes.json() as any;
        if (!data.user) throw new Error('No user in response');

        const profile: ProfileInfo = data.user;
        await sendFollowUp(token, { embeds: [buildUserEmbed(profile)] });
    } catch (err: any) {
        console.error('[/user]', err?.message);
        await sendFollowUp(token, { content: '❌ Failed to fetch user info. Try again later.' });
    }
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp  = req.headers['x-signature-timestamp'] as string;
    const rawBody    = await getRawBody(req);

    const isValid = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY!);
    if (!isValid) return res.status(401).send('Bad request signature');

    const interaction = JSON.parse(rawBody.toString());

    if (interaction.type === InteractionType.Ping) {
        return res.json({ type: InteractionResponseType.Pong });
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
        const cmd  = interaction as APIChatInputApplicationCommandInteraction;
        const name = cmd.data.name;

        switch (name) {
            case 'anime': return handleAnime(cmd, res);
            case 'user':  return handleUser(cmd, res);
            default:
                return res.json({
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: { content: '❓ Unknown command.', flags: 64 },
                });
        }
    }

    return res.status(400).json({ error: 'Unknown interaction type' });
}
