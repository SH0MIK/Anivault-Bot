import type { APIEmbed } from 'discord-api-types/v10';

export interface UserInfo {
    id: number;
    display_id?: number;   // sequential number from PHP (stable even after deletions)
    username: string;
    email?: string;
    uid?: string;
    avatar_url?: string;
}

const SITE_URL = 'https://www.anivault.co';

const METHOD_LABEL: Record<string, string> = {
    email:   '📧 Email / Password',
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
    return `${SITE_URL}/user?u=${encodeURIComponent(username)}`;
}

function profileLink(username: string): string {
    const url = profileUrl(username);
    return `[u/${username}](${url})`;
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
            { name: 'ID',            value: `\`#${displayId}\``,                                 inline: true },
            { name: 'Profile',       value: profileLink(user.username),                           inline: true },
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
            { name: 'Username',  value: `\`${user.username}\``,         inline: true },
            { name: 'ID',        value: `\`#${displayId}\``,            inline: true },
            { name: 'Profile',   value: profileLink(user.username),      inline: true },
            { name: 'Login via', value: METHOD_LABEL[method] ?? method,  inline: true },
        ],
        thumbnail: user.avatar_url ? { url: user.avatar_url } : undefined,
        footer:    { text: 'AniVault • Login Event' },
        timestamp: new Date().toISOString(),
    };
}
