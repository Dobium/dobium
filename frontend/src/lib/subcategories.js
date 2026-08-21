// ── Subcategories, by sector ───────────────────────────────────────────────
//
// The landing page keeps these as separate constants next to their sections.
// The category page needs the same lists to render its sidebar, so they're
// collected here by sector id rather than duplicated per page.
//
// Each entry is a display label. The first in every list is the "all" option
// and carries no filter. Matching for the rest is by title, same heuristic the
// landing page uses — no per-market subcategory field exists yet.

export const SUBCATEGORIES = {
  // No dropdown on the homepage sidebar (removed in f1af21d) — but the
  // category page has room for the full rail, which is where these belong.
  sportsfutures: ['All Futures', 'NFL Futures', 'NBA Futures', 'College Football Futures', 'Soccer Futures', 'MLB Futures', 'NHL Futures'],
  tech: ['All Tech', 'Prediction Markets', 'OpenAI', 'Anthropic', 'Google / Gemini', 'AI Models', 'Big Tech', 'Startup Raises and Funding', 'Open Source AI & Github Repos', 'Startup Acquisitions', 'Space Tech'],
  music: ['All Music', 'R&B', 'Hip Hop', 'Rap', 'Pop', 'Electronic', 'Latin', 'Country', 'Rock', 'K-Pop'],
  trends: ['All Trends', 'Google Trends', 'Instagram', 'Reddit', 'X/Twitter', 'Tiktok', 'YouTube'],
  movies: ['All Movies & TV', 'Box Office Hits', 'New Releases', 'Franchises', 'Awards', 'TV Shows', 'Industry Deals'],
  celebrities: ['All Creators', 'YouTube Milestones', 'Twitch Live Streaming', 'Kick Live Streaming', 'Viral Streamers and Events'],
  gaming: ['All Gaming', 'Console', 'Esports Odds', 'Studio Deals', 'Gaming Hardware'],
  streaming: ['All Streaming', 'Netflix', 'Disney+', 'HBO/Max Releases', 'Prime Video', 'Apple TV', 'Hulu', 'Streaming Charts'],
  elonmusk: ['All Elon Musk', 'Tesla', 'SpaceX', 'X (Twitter)', 'xAI', 'Neuralink',
    'The Boring Company', 'Global Influence'],
  science: ['All Science', 'AI & Leading Research', 'Biotech & Longevity', 'FDA',
    'Physics & Math', 'Fusion', 'Space Exploration', 'NASA', 'Biology & Health'],
  moviecharts: ['All Movie Charts', 'Box Office (Domestic)', 'Box Office (Global)', 'Opening Weekend',
    'Rotten Tomatoes', 'Critics Score', 'Audience Score', 'Streaming Charts', 'Franchise Performance'],
  awards: ['All Awards', 'The Oscars', 'The Grammys', 'The Emmys', 'The Golden Globes', 'BAFTA', 'Film Festivals'],
};

// Title patterns for the non-"all" entries. Anything without a pattern simply
// shows everything in the sector rather than an empty list.
export const SUBCATEGORY_RE = {
  'NFL Futures': /\bnfl\b|super bowl|afc\b|nfc\b/i,
  'NBA Futures': /\bnba\b|finals mvp|eastern conference|western conference/i,
  'College Football Futures': /college football|\bcfb\b|\bncaa\b|heisman|bowl game|\bsec\b|big ten|big 12|\bacc\b/i,
  'Soccer Futures': /soccer|premier league|champions league|world cup|\bfifa\b|la liga|serie a|bundesliga|golden boot|golden ball/i,
  'MLB Futures': /\bmlb\b|world series|\bpennant\b|baseball/i,
  'NHL Futures': /\bnhl\b|stanley cup|hockey/i,

  'Prediction Markets': /kalshi|polymarket|manifold|prediction market|event contract|cftc/i,
  OpenAI: /openai|\bchatgpt\b|\bgpt-?\d|sam altman|\bsora\b/i,
  Anthropic: /anthropic|\bclaude\b|dario amodei/i,
  'Google / Gemini': /\bgemini\b|deepmind|\bbard\b|sundar pichai|google ai/i,
  'AI Models': /\bgpt\b|\bllm\b|claude|gemini|llama|benchmark|model release/i,
  'Big Tech': /\bapple\b|\bgoogle\b|alphabet|\bmeta\b|\bmicrosoft\b|\bamazon\b|\bnvidia\b|\btesla\b|waymo|\buber\b|big tech/i,
  'Startup Raises and Funding': /raise|funding|series [a-e]\b|valuation|\bipo\b/i,
  'Open Source AI & Github Repos': /open source|github|repo|weights|hugging face/i,
  'Startup Acquisitions': /acquire|acquisition|buyout|merger|\bm&a\b/i,
  'Space Tech': /spacex|starship|blue origin|nasa|rocket|orbit|satellite/i,

  'R&B': /\br&b\b|rnb|sza|the weeknd|summer walker|brent faiyaz/i,
  'Hip Hop': /hip hop|hip-hop|drake|kendrick|travis scott|\bjid\b/i,
  Rap: /\brap\b|rapper|playboi carti|21 savage|lil \w+/i,
  Pop: /\bpop\b|taylor swift|sabrina carpenter|olivia rodrigo|ariana grande/i,
  Electronic: /electronic|\bedm\b|house music|techno|fred again|skrillex/i,
  Latin: /latin|bad bunny|karol g|peso pluma|reggaeton/i,
  Country: /country music|morgan wallen|zach bryan|luke combs/i,
  Rock: /\brock\b|indie|alternative|foo fighters|arctic monkeys/i,
  'K-Pop': /k-pop|kpop|\bbts\b|blackpink|newjeans|stray kids/i,

  'Google Trends': /google trends|search volume|trending search/i,
  Instagram: /instagram|\breels?\b|\big\b|most followed/i,
  Reddit: /reddit|subreddit/i,
  'X/Twitter': /twitter|\bx\/twitter\b|elon musk/i,
  Tiktok: /tiktok/i,
  YouTube: /youtube|mrbeast/i,

  'Box Office Hits': /box office|opening weekend|gross|domestic total/i,
  'New Releases': /premiere|release date|debut|opens in theaters/i,
  Franchises: /marvel|\bdc\b|star wars|sequel|franchise|cinematic universe/i,
  Awards: /oscar|academy award|golden globe|\bemmy\b|best picture/i,
  'TV Shows': /\bseason\b|episode|series finale|renewed|cancelled/i,
  'Industry Deals': /studio|acquire|merger|distribution deal|licensing/i,

  'YouTube Milestones': /subscriber|\bviews\b|youtube|milestone/i,
  'Twitch Live Streaming': /twitch|subathon|streamer/i,
  'Kick Live Streaming': /\bkick\b|adin ross/i,
  'Viral Streamers and Events': /ishowspeed|kai cenat|xqc|viral stream/i,


  Console: /playstation|\bps5\b|xbox|nintendo|switch|console/i,
  'Esports Odds': /esports|\bleague of legends\b|valorant|\bcs2\b|dota/i,
  'Studio Deals': /studio|acquire|publisher|rockstar|ubisoft|\bea\b/i,
  'Gaming Hardware': /\bgpu\b|hardware|handheld|steam deck|graphics card/i,

  Netflix: /netflix/i,
  'Disney+': /disney\+|disney plus/i,
  'HBO/Max Releases': /\bhbo\b|\bmax\b/i,
  'Prime Video': /prime video|amazon prime/i,
  'Apple TV': /apple tv/i,
  Hulu: /hulu/i,
  'Streaming Charts': /viewership|weekly views|streaming chart|top 10/i,

  'The Oscars': /oscar|academy award|best picture|best actor|best actress|best director/i,
  'The Grammys': /grammy|album of the year|record of the year|song of the year/i,
  'The Emmys': /\bemmy\b|\bemmys\b|outstanding drama|outstanding comedy|primetime emmy/i,
  'The Golden Globes': /golden globe|globes\b/i,
  BAFTA: /\bbafta\b|british academy/i,
  'Film Festivals': /cannes|sundance|venice film|toronto international|\btiff\b|berlinale|palme d'or|golden lion/i,

  // Movie Charts. 'Streaming Charts' deliberately has no entry here — the key
  // already exists above for the Streaming sector and this map is flat, so the
  // two labels share one pattern.
  'Box Office (Domestic)': /domestic (box office|gross|total|opening)|north american (box office|gross)|\bdomestic\b/i,
  'Box Office (Global)': /(global|worldwide|international) (box office|gross|total)|\bworldwide\b|overseas gross/i,
  'Opening Weekend': /opening weekend|opening day|debut weekend|three[- ]day (opening|weekend)|biggest opening/i,
  'Rotten Tomatoes': /rotten tomatoes|tomatometer|\brt score\b|certified fresh/i,
  'Critics Score': /critics? score|metacritic|critical (score|rating|reception)|review score/i,
  'Audience Score': /audience score|popcornmeter|cinemascore|audience (rating|reception)/i,
  'Franchise Performance': /franchise|sequel|prequel|spin[- ]?off|cinematic universe|\bmcu\b|\bdcu\b|installment|trilogy|reboot/i,

  'AI & Leading Research': /artificial intelligence|\bagi\b|\bllm\b|\bgpt\b|openai|anthropic|deepmind|neural net|research (lab|breakthrough)|\bai\b/i,
  'Biotech & Longevity': /biotech|longevity|anti[- ]?aging|lifespan|gene (therapy|editing)|\bcrispr\b|stem cell|clinical trial|fda approval/i,
  'Physics & Math': /physics|\bcern\b|higgs|particle collider|quantum (comput|mechanics|supremacy)|superconduct|dark matter|\bneutrino\b|mathematic|\bmaths?\b|riemann|millennium prize|\btheorem\b|\bconjecture\b/i,
  Fusion: /nuclear fusion|fusion (energy|reactor|ignition|milestone)|\btokamak\b|\biter\b|net energy gain|inertial confinement/i,
  FDA: /\bfda\b|food and drug administration|drug approval/i,
  NASA: /\bnasa\b|artemis|\bjpl\b|jet propulsion|james webb/i,
  'Space Exploration': /\bnasa\b|\besa\b|artemis|lunar landing|moon landing|\bmars\b|asteroid|\bcomet\b|telescope|james webb|exoplanet|black hole|supernova|orbital|crewed (mission|flight)|space station|\bstarship\b|rocket launch/i,
  'Biology & Health': /vaccine|\bpandemic\b|antibiotic|\bgenome\b|\bvirus\b|outbreak|life expectancy|cancer (drug|treatment|screening)|\bbiology\b/i,

  Tesla: /\btesla\b|cybertruck|robotaxi|\boptimus\b|full self[- ]driving|\bfsd\b|model [3sxy]\b|gigafactory/i,
  SpaceX: /\bspacex\b|\bstarship\b|starlink|falcon (9|heavy)|crew dragon|\braptor engine\b/i,
  'X (Twitter)': /\btwitter\b|\bx\.com\b|\bx corp\b|\btweet/i,
  xAI: /\bxai\b|\bgrok\b/i,
  Neuralink: /neuralink|brain[- ]computer interface|\bbci\b|brain implant/i,
  'The Boring Company': /boring company|hyperloop|vegas loop|tunnel/i,
  'Global Influence': /endorse|politic|net worth|richest|\bdoge\b|government efficiency|lawsuit|antitrust|feud|controvers|influence/i,
};

export function subcategoriesFor(sectorId) {
  return SUBCATEGORIES[sectorId] || null;
}

// null means "no filter" — the "all" entry, or a label with no pattern.
export function matchesSubcategory(title, sub) {
  const re = SUBCATEGORY_RE[sub];
  if (!re) return true;
  return re.test(title || '');
}
