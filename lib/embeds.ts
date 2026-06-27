import type { APIEmbed } from 'discord-api-types/v10';

export interface UserInfo {
    id: number;
    display_id?: number;
    username: string;
    email?: string;
    uid?: string;
    avatar_url?: string;
}

const SITE_URL = 'https://www.anivault.co';

const METHOD_LABEL: Record<string, string> = {
    email:   '📧 Email',
    google:  '🔵 Google',
    discord: '🎮 Discord',
};

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return 'N/A';
    const masked = local.slice(0, 2) + '*'.repeat(Math.max(1, local.length - 2));
    return `${masked}@${domain}`;
}

function profileUrl(username: string): string {
    return `${SITE_URL}/u/${encodeURIComponent(username)}`;
}

// ── New registration embed (green) ──────────────────────────
export function buildRegisterEmbed(user: UserInfo, method: string): APIEmbed {
    const url = profileUrl(user.username);
    const displayId = user.display_id ?? user.id;
    return {
        title:       '🎉 New User Joined AniVault!',
        description: `**[${user.username}](${url})** just created an account.`,
        color:       0x57F287,
        url,
        fields: [
            { name: 'Username',      value: `\`${user.username}\``,                              inline: true },
            { name: 'User ID',       value: `\`#${displayId}\``,                                 inline: true },
            { name: 'Email',         value: `\`${user.email ? maskEmail(user.email) : 'N/A'}\``, inline: true },
            { name: 'Signed up via', value: METHOD_LABEL[method] ?? method,                      inline: true },
        ],
        thumbnail: user.avatar_url ? { url: user.avatar_url } : undefined,
        footer:    { text: 'AniVault • New Registration' },
        timestamp: new Date().toISOString(),
    };
}

// ── Login embed (blurple) ────────────────────────────────────
export function buildLoginEmbed(user: UserInfo, method: string): APIEmbed {
    const url = profileUrl(user.username);
    const displayId = user.display_id ?? user.id;
    return {
        title:       '👤 User Logged In',
        description: `**[${user.username}](${url})** just signed in.`,
        color:       0x5865F2,
        url,
        fields: [
            { name: 'Username',  value: `\`${user.username}\``,          inline: true },
            { name: 'User ID',   value: `\`#${displayId}\``,             inline: true },
            { name: 'Login via', value: METHOD_LABEL[method] ?? method,  inline: true },
        ],
        thumbnail: user.avatar_url ? { url: user.avatar_url } : undefined,
        footer:    { text: 'AniVault • Login Event' },
        timestamp: new Date().toISOString(),
    };
}

// ── /anime result embed ──────────────────────────────────────
export interface AnimeInfo {
    mal_id: number;
    title: string;
    title_english?: string;
    synopsis?: string;
    mean?: number;
    rank?: number;
    num_episodes?: number;
    status?: string;
    media_type?: string;
    rating?: string;
    genres?: { name: string }[];
    studios?: { name: string }[];
    images?: { jpg?: { large_image_url?: string; image_url?: string } };
    source?: string;
}

const STATUS_EMOJI: Record<string, string> = {
    'currently_airing': '🟢 Airing',
    'finished_airing':  '✅ Finished',
    'not_yet_aired':    '🔜 Upcoming',
};

const RATING_LABEL: Record<string, string> = {
    'g':     'G – All Ages',
    'pg':    'PG – Children',
    'pg_13': 'PG-13',
    'r':     'R – 17+',
    'r+':    'R+ – Mild Nudity',
    'rx':    'Rx – Hentai',
};

export function buildAnimeEmbed(anime: AnimeInfo): APIEmbed {
    const watchUrl  = `${SITE_URL}/watch/${anime.mal_id}`;
    const title     = anime.title_english || anime.title;
    const genres    = (anime.genres ?? []).map(g => g.name).join(', ') || 'N/A';
    const studios   = (anime.studios ?? []).map(s => s.name).join(', ') || 'N/A';
    const image     = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
    const status    = STATUS_EMOJI[anime.status ?? ''] ?? anime.status ?? 'N/A';
    const synopsis  = anime.synopsis
        ? (anime.synopsis.length > 300 ? anime.synopsis.slice(0, 297) + '…' : anime.synopsis)
        : 'No synopsis available.';

    return {
        title:       title,
        description: synopsis,
        color:       0xE84D4D,
        url:         watchUrl,
        thumbnail:   image ? { url: image } : undefined,
        fields: [
            { name: '⭐ Score',     value: anime.mean    ? `**${anime.mean}/10**` : 'N/A',           inline: true },
            { name: '🏆 Rank',     value: anime.rank    ? `#${anime.rank}`        : 'N/A',           inline: true },
            { name: '📺 Status',   value: status,                                                     inline: true },
            { name: '🎬 Type',     value: (anime.media_type ?? 'N/A').toUpperCase(),                 inline: true },
            { name: '📝 Episodes', value: anime.num_episodes ? `${anime.num_episodes}` : '?',        inline: true },
            { name: '🔞 Rating',   value: RATING_LABEL[anime.rating ?? ''] ?? anime.rating ?? 'N/A', inline: true },
            { name: '🎭 Genres',   value: genres,                                                     inline: false },
            { name: '🏢 Studio',   value: studios,                                                    inline: true },
            { name: '📖 Source',   value: anime.source ?? 'N/A',                                     inline: true },
        ],
        footer:    { text: `MAL ID: ${anime.mal_id} • Watch on AniVault` },
        timestamp: new Date().toISOString(),
    };
}

// ── /user profile embed ──────────────────────────────────────
export interface ProfileInfo {
    id: number;
    display_id?: number;
    username: string;
    avatar_url?: string;
    created_at?: string;
    role?: string;
    stats?: {
        watching?:      number;
        completed?:     number;
        on_hold?:       number;
        dropped?:       number;
        plan_to_watch?: number;
        total_episodes?:number;
        avg_score?:     number;
        total?:         number;
    };
}

const ROLE_BADGE: Record<string, string> = {
    OWNER: '👑 Owner',
    admin: '🛡️ Admin',
    mod:   '🔨 Mod',
    user:  '👤 User',
};

export function buildUserEmbed(profile: ProfileInfo): APIEmbed {
    const url       = profileUrl(profile.username);
    const displayId = profile.display_id ?? profile.id;
    const stats     = profile.stats ?? {};
    const joined    = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown';
    const avgScore  = stats.avg_score ? Number(stats.avg_score).toFixed(1) : 'N/A';

    return {
        title:       `${profile.username}'s Profile`,
        description: `[View full profile on AniVault](${url})`,
        color:       0xF59E0B,
        url,
        thumbnail:   profile.avatar_url ? { url: profile.avatar_url } : undefined,
        fields: [
            { name: '🆔 User #',          value: `\`#${displayId}\``,            inline: true },
            { name: '🎖️ Role',            value: ROLE_BADGE[profile.role ?? ''] ?? '👤 User', inline: true },
            { name: '📅 Joined',          value: joined,                          inline: true },
            { name: '▶️ Watching',        value: `${stats.watching    ?? 0}`,     inline: true },
            { name: '✅ Completed',       value: `${stats.completed   ?? 0}`,     inline: true },
            { name: '📋 Plan to Watch',   value: `${stats.plan_to_watch ?? 0}`,   inline: true },
            { name: '⏸️ On Hold',         value: `${stats.on_hold     ?? 0}`,     inline: true },
            { name: '❌ Dropped',         value: `${stats.dropped     ?? 0}`,     inline: true },
            { name: '⭐ Avg Score',       value: avgScore,                        inline: true },
            { name: '🎞️ Episodes Watched',value: `${stats.total_episodes ?? 0}`, inline: true },
            { name: '📚 Total Anime',     value: `${stats.total ?? 0}`,           inline: true },
        ],
        footer:    { text: 'AniVault • User Profile' },
        timestamp: new Date().toISOString(),
    };
}
