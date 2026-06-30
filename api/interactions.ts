// api/interactions.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyKey } from 'discord-interactions';
import {
    InteractionType,
    InteractionResponseType,
    type APIChatInputApplicationCommandInteraction,
} from 'discord-api-types/v10';
import { buildAnimeEmbed, type AnimeInfo } from '../lib/embeds';

export const config = { api: { bodyParser: false } };

const MAL_CLIENT  = process.env.MAL_CLIENT_ID!;
const RAILWAY_URL = process.env.RAILWAY_URL!;

async function getRawBody(req: VercelRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ── /anime handler (fast, no defer needed) ──
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

// ── /user handler ──
// Defer instantly, hand off the slow work (FlareSolverr + PHP) to Railway
// entirely, and let Railway send the final Discord message itself —
// Vercel's 10s function limit can't survive FlareSolverr's solve time.
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

    // 1. Tell Discord "thinking..." immediately
    res.json({ type: InteractionResponseType.DeferredChannelMessageWithSource });

    // 2. Fire-and-forget to Railway — don't await the slow part,
    //    just confirm Railway accepted the job
    try {
        await fetch(`${RAILWAY_URL}/discord/user-lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bot-secret': process.env.BOT_SECRET!,
            },
            body: JSON.stringify({ username, token }),
        });
    } catch (err: any) {
        console.error('[/user] Failed to hand off to Railway:', err?.message);
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
