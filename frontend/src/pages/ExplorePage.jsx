import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../components/MarketCard';
import { useMarkets } from '../hooks/useMarkets';

function TrendingMiniChart({ market }) {
  const width = 400;
  const height = 100;
  const outcomes = market.outcomes || [];
  const priceHistory = market.price_history || [];

  const sortedOutcomes = [...outcomes].sort((a, b) => (b.probability || 0) - (a.probability || 0));

  const trends = sortedOutcomes.slice(0, 4).map((o, idx) => {
    let data;

    if (priceHistory.length > 0) {
      // Use real price history
      data = priceHistory.map(snapshot => snapshot.prices[o.id] || o.probability || 20);

      // Ensure minimum 2 points
      if (data.length < 2) {
        data = [o.probability || 20, o.probability || 20];
      }
    } else {
      // No history - flat line
      data = [o.probability || 20, o.probability || 20];
    }

    return {
      data: data,
      color: o.title?.toLowerCase() === 'yes' ? '#22c55e' : o.title?.toLowerCase() === 'no' ? '#ef4444' : ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'][idx % 4]
    };
  });

  const allValues = trends.flatMap(t => t.data);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const getY = (val) => ((maxVal - val) / range) * height;
  const getX = (idx, total) => (idx / (total - 1)) * width;

  return (
    <svg className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {trends.map((trend, idx) => {
        const points = trend.data.map((val, i) => ({
          x: getX(i, trend.data.length),
          y: getY(val)
        }));
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

        return (
          <path
            key={idx}
            d={path}
            fill="none"
            stroke={trend.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

const CATEGORIES = ['all', 'politics', 'international', 'environment', 'climate', 'science', 'health', 'finance', 'technology'];

export default function ExplorePage() {
  const { markets, loading } = useMarkets();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All Markets');
  const [search, setSearch] = useState('');
  const [trendingIndex, setTrendingIndex] = useState(0);

  const trending = [...markets].filter(m => m.status === 'active' && m.is_trending);

  const filtered = markets.filter(m => {
    const categoryMatch = selectedCategory === 'All Markets' || m.category === selectedCategory.toLowerCase();
    const searchMatch = !search || m.title?.toLowerCase().includes(search.toLowerCase());

    // If the user typed a search query, show all matching markets (including resolved)
    if (search.trim().length > 0) {
      return categoryMatch && searchMatch;
    }

    // Otherwise, only show active markets
    return categoryMatch && searchMatch && m.status === 'active';
  });

  useEffect(() => {
    if (trending.length === 0) return;
    const interval = setInterval(() => {
      setTrendingIndex(prev => (prev + 1) % trending.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [trending.length]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-12">
        <div className="flex items-center justify-end mb-4 lg:mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full sm:w-auto gap-2.5">
            <div className="relative search-container w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input w-full pl-10 pr-3 py-2.5 lg:pl-12 lg:pr-4 lg:py-3 text-sm lg:text-base bg-slate-900/50 border border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2" style={{ color: 'rgb(212, 175, 55)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
            </div>
            <div className="relative category-dropdown-container w-full sm:w-auto group z-20">
              <button className="w-full sm:w-auto justify-between sm:justify-start px-4 py-2.5 lg:py-3 text-sm lg:text-base bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-semibold rounded-xl hover:brightness-110 transition flex items-center gap-2 whitespace-nowrap">
                <span>{selectedCategory}</span>
                <span className="text-sm">▼</span>
              </button>
              <div className="absolute right-0 mt-2 w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 hidden group-hover:block">
                {['All Markets', ...CATEGORIES.filter(c => c !== 'all').map(c => c.charAt(0).toUpperCase() + c.slice(1))].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800 transition ${selectedCategory === cat ? 'text-white' : 'text-slate-300'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Markets Slideshow */}
      {trending.length > 0 && (
        <div className="mb-6 lg:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
              <span style={{ color: 'rgb(212, 175, 55)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </span>
              Trending
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {trending.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTrendingIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === trendingIndex ? 'bg-yellow-400 w-6' : 'bg-slate-600'
                      }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setTrendingIndex(prev => (prev - 1 + trending.length) % trending.length)}
                className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-800/80 border border-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-700 hover:border-yellow-500/50 transition-all"
              >
                ←
              </button>
              <button
                onClick={() => setTrendingIndex(prev => (prev + 1) % trending.length)}
                className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-800/80 border border-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-700 hover:border-yellow-500/50 transition-all"
              >
                →
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-slate-800">
            {trending.length > 0 && trending[trendingIndex] && (
              <div className="p-4 lg:p-6 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                  {/* Left: Info & Chart */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block text-[10px] lg:text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                        {trending[trendingIndex].category}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] lg:text-xs text-green-400 font-medium">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Live
                      </span>
                    </div>
                    <h3 className="text-lg lg:text-2xl font-bold text-white mb-2 lg:mb-3 cursor-pointer hover:text-yellow-400 transition-colors" onClick={() => navigate(`/markets/${trending[trendingIndex].id}`)}>
                      {trending[trendingIndex].title}
                    </h3>
                    <p className="text-slate-400 text-xs lg:text-sm mb-3 lg:mb-4 line-clamp-2 lg:line-clamp-none">{trending[trendingIndex].description}</p>

                    {/* Mini Chart */}
                    <div className="bg-slate-800/30 rounded-xl p-3 lg:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] lg:text-xs text-slate-400">30-Day Trend</span>
                      </div>
                      <TrendingMiniChart market={trending[trendingIndex]} />
                    </div>
                  </div>

                  {/* Right: Outcome Buttons */}
                  <div className="flex flex-col justify-center">
                    <h4 className="text-xs lg:text-sm font-semibold text-slate-400 mb-2 lg:mb-3">Trade Outcomes</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                      {[...(trending[trendingIndex].outcomes || [])]
                        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
                        .slice(0, 4)
                        .map((outcome, idx) => {
                          const isYes = outcome.title?.toLowerCase() === 'yes';
                          const isNo = outcome.title?.toLowerCase() === 'no';
                          const colorClass = isYes ? 'bg-green-500/10 border-green-500/50 hover:border-green-500 text-green-400' : isNo ? 'bg-red-500/10 border-red-500/50 hover:border-red-500 text-red-400' : 'bg-blue-500/10 border-blue-500/50 hover:border-blue-500 text-blue-400';

                          return (
                            <button
                              key={outcome.id}
                              onClick={() => navigate(`/markets/${trending[trendingIndex].id}`)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg border transition-all ${colorClass}`}
                            >
                              <span className="text-white font-medium text-xs lg:text-sm truncate pr-2 text-left">{outcome.title}</span>
                              <span className="text-sm lg:text-lg font-bold shrink-0">{Math.round(outcome.probability || 0)}¢</span>
                            </button>
                          );
                        })}
                    </div>
                    {trending[trendingIndex].outcomes?.length > 4 && (
                      <p className="text-xs text-slate-500 text-center mt-2">+{trending[trendingIndex].outcomes.length - 4} more options</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Markets Section */}
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2">
          <span style={{ color: 'rgb(212, 175, 55)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </span>
          All Markets
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-slate-700 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 auto-rows-auto">
          {filtered.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  );
}
