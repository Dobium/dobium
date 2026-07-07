// Dobium's three-bucket category system.
// We are a music & media prediction market: only Music and Media get topical labels.
// Everything else (sports, tech, politics, elections, finance…) is simply "Trending" —
// hot markets ride the news cycle without cluttering the taxonomy.

const MEDIA_CATEGORIES = new Set([
  'entertainment', 'movies', 'movies & tv', 'tv', 'streaming',
  'awards', 'media', 'celebrity', 'culture', 'gaming',
]);

export function categoryBucket(category) {
  const c = (category || '').toLowerCase().trim();
  if (c === 'music') return 'music';
  if (MEDIA_CATEGORIES.has(c)) return 'media';
  return 'trending';
}

export const BUCKET_LABELS = {
  trending: 'Trending',
  music: 'Music',
  media: 'Media',
};

export const BUCKET_ICONS = {
  trending: 'trending_up',
  music: 'music_note',
  media: 'movie',
};

export function bucketLabel(category) {
  return BUCKET_LABELS[categoryBucket(category)];
}

export function bucketIcon(category) {
  return BUCKET_ICONS[categoryBucket(category)];
}
