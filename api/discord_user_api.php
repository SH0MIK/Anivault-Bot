<?php
// api/discord_user.php
// Internal API called by the Discord bot to fetch a user profile + stats.
// Protected by BOT_SECRET so it's not publicly accessible.

require_once __DIR__ . '/../includes/bootstrap.php';

header('Content-Type: application/json');

// Verify bot secret
$secret = trim($_GET['secret'] ?? '');
if (!defined('BOT_SECRET') || $secret !== BOT_SECRET) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$username = trim($_GET['username'] ?? '');
if (!$username) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing username']);
    exit;
}

// Fetch user
$user = Database::fetchOne(
    'SELECT id, username, avatar_url, role, created_at FROM users WHERE username = ? AND deleted_at IS NULL',
    [$username]
);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// Sequential display ID (same logic as admin panel)
$row = Database::fetchOne(
    'SELECT COUNT(*) as cnt FROM users WHERE id <= ? AND deleted_at IS NULL',
    [$user['id']]
);
$user['display_id'] = $row['cnt'] ?? $user['id'];

// Watch stats from anime_list
$statsRows = Database::fetchAll(
    'SELECT status, COUNT(*) as cnt, SUM(episodes_watched) as ep_sum, AVG(score) as avg_score
     FROM anime_list WHERE user_id = ? GROUP BY status',
    [$user['id']]
);

$stats = [
    'watching'      => 0,
    'completed'     => 0,
    'on_hold'       => 0,
    'dropped'       => 0,
    'plan_to_watch' => 0,
    'total_episodes'=> 0,
    'avg_score'     => 0,
    'total'         => 0,
];

$scoreTotal = $scoreCount = 0;
foreach ($statsRows as $r) {
    $key = $r['status'];
    if (isset($stats[$key])) $stats[$key] = (int)$r['cnt'];
    $stats['total']          += (int)$r['cnt'];
    $stats['total_episodes'] += (int)$r['ep_sum'];
    if ($r['avg_score']) {
        $scoreTotal += $r['avg_score'] * $r['cnt'];
        $scoreCount += $r['cnt'];
    }
}
$stats['avg_score'] = $scoreCount ? round($scoreTotal / $scoreCount, 1) : 0;

$user['stats'] = $stats;

echo json_encode(['user' => $user]);
