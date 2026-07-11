// Category icon tiles (Kalshi-style) rendered CLIENT-SIDE, independent of
// whatever image_url is stored in the database. Old markets carry stale
// generated images from earlier badge systems; rather than depending on a
// data-regeneration pass, every surface that shows a market icon derives it
// live from the market's category + title. Stored data can never make the
// UI show the wrong thing again.

const TILE_COLORS = {
  mic: ['#7F1D3A', '#FFB4CE'],
  film: ['#1D3A5C', '#8FC6FF'],
  trophy: ['#5C3A1D', '#FFD68F'],
  tv: ['#1D5C3A', '#8FFFC6'],
  rocket: ['#3A1D5C', '#D6B4FF'],
  mask: ['#5C1D2E', '#FF9EB8'],
  coin: ['#5C4A1D', '#FFE68F'],
  controller: ['#1D4A5C', '#8FE3FF'],
};

const ICON_PATHS = {
  mic: '<rect x="40" y="18" width="20" height="38" rx="10"/><path d="M28 46a22 22 0 0 0 44 0" fill="none" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="68" x2="50" y2="82" stroke-width="6" stroke-linecap="round"/><line x1="36" y1="82" x2="64" y2="82" stroke-width="6" stroke-linecap="round"/>',
  film: '<rect x="16" y="26" width="68" height="48" rx="4" fill="none" stroke-width="5"/><rect x="16" y="26" width="14" height="48" fill-opacity="0.35"/><rect x="70" y="26" width="14" height="48" fill-opacity="0.35"/><circle cx="23" cy="34" r="2.5"/><circle cx="23" cy="50" r="2.5"/><circle cx="23" cy="66" r="2.5"/><circle cx="77" cy="34" r="2.5"/><circle cx="77" cy="50" r="2.5"/><circle cx="77" cy="66" r="2.5"/><path d="M38 38l22 12-22 12z"/>',
  trophy: '<path d="M32 22h36v18a18 18 0 0 1-36 0z" fill="none" stroke-width="6"/><path d="M32 26H18a10 10 0 0 0 12 16" fill="none" stroke-width="5"/><path d="M68 26h14a10 10 0 0 1-12 16" fill="none" stroke-width="5"/><rect x="46" y="58" width="8" height="14"/><rect x="36" y="72" width="28" height="8" rx="2"/>',
  tv: '<rect x="16" y="24" width="68" height="46" rx="5" fill="none" stroke-width="6"/><line x1="38" y1="82" x2="62" y2="82" stroke-width="6" stroke-linecap="round"/><line x1="50" y1="70" x2="50" y2="82" stroke-width="6"/>',
  rocket: '<path d="M50 14c12 8 16 24 12 40l-24 0c-4-16 0-32 12-40z" fill="none" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="34" r="6" fill="none" stroke-width="5"/><path d="M38 54l-10 16 16-6" fill="none" stroke-width="5" stroke-linejoin="round"/><path d="M62 54l10 16-16-6" fill="none" stroke-width="5" stroke-linejoin="round"/><path d="M44 70l6 14 6-14z"/>',
  mask: '<circle cx="36" cy="42" r="18" fill="none" stroke-width="6"/><circle cx="64" cy="42" r="18" fill="none" stroke-width="6"/><path d="M50 30a14 14 0 0 0 0 24" fill="none" stroke-width="5"/><path d="M28 62c4 8 14 12 22 6M50 62c8 6 18 2 22-6" fill="none" stroke-width="5" stroke-linecap="round"/>',
  coin: '<circle cx="50" cy="50" r="30" fill="none" stroke-width="6"/><path d="M50 34v32M42 42a8 8 0 0 1 16 0c0 6-16 6-16 12a8 8 0 0 0 16 0" fill="none" stroke-width="5" stroke-linecap="round"/>',
  controller: '<rect x="18" y="36" width="64" height="30" rx="15" fill="none" stroke-width="6"/><line x1="24" y1="45" x2="24" y2="57" stroke-width="6" stroke-linecap="round"/><line x1="18" y1="51" x2="30" y2="51" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="46" r="3.5"/><circle cx="74" cy="54" r="3.5"/>',
};

export function pickIcon(title, category) {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (c === 'music') return /award|grammy|vma/.test(t) ? 'trophy' : 'mic';
  if (c === 'awards') return 'trophy';
  if (c === 'entertainment' || c === 'media' || c === 'movies') {
    if (/game|gta|nintendo|playstation|xbox|steam|esports/.test(t)) return 'controller';
    if (/netflix top|top 10|streaming numbers|renew|season \d|episodes/.test(t)) return 'tv';
    if (/award|oscar|emmy|golden globe|nominat/.test(t)) return 'trophy';
    return 'film';
  }
  if (c === 'trending') {
    if (/game|gta|nintendo|playstation|xbox|steam/.test(t)) return 'controller';
    if (/ipo|valuation|funding|billion|stock/.test(t)) return 'coin';
    return 'rocket';
  }
  if (/album|single|song|mixtape|billboard|tour|concert|headlin/.test(t)) return 'mic';
  if (/oscar|academy award|emmy|golden globe|award|nominat/.test(t)) return 'trophy';
  if (/netflix|hbo|streaming|top 10|renew/.test(t)) return 'tv';
  if (/box office|gross|movie|film|sequel|biopic|documentary|letterboxd/.test(t)) return 'film';
  if (/ipo|acqui|valuation|billion|funding/.test(t)) return 'coin';
  if (/game|nintendo|playstation|xbox|steam|gta/.test(t)) return 'controller';
  if (/launch|rocket|starship|spacex|ai model|gpt/.test(t)) return 'rocket';
  return 'mask';
}

export default function MarketIcon({ market, size = 40, radius = 10 }) {
  const icon = pickIcon(market?.title, market?.category);
  const [bg, fg] = TILE_COLORS[icon];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ flexShrink: 0, borderRadius: radius, display: 'block' }}
      aria-hidden="true"
    >
      <rect width="100" height="100" fill={bg} />
      <g
        fill={fg}
        stroke={fg}
        strokeLinecap="round"
        dangerouslySetInnerHTML={{ __html: ICON_PATHS[icon] }}
      />
    </svg>
  );
}
