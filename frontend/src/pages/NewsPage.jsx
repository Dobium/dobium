import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../store/storage';

// Fallback news items when API is unavailable
const SAMPLE_NEWS = [
  { id: 1, title: 'Global markets react to latest central bank decisions', category: 'finance', source: 'Financial Times', publishedAt: new Date(Date.now() - 3600000).toISOString(), description: 'Central banks worldwide are navigating a delicate balance between inflation control and economic growth.' },
  { id: 2, title: 'AI breakthrough: new model surpasses human performance on reasoning tasks', category: 'technology', source: 'Tech Insider', publishedAt: new Date(Date.now() - 7200000).toISOString(), description: 'Researchers announce a significant leap in AI capabilities with implications for prediction markets.' },
  { id: 3, title: 'Climate summit reaches landmark agreement on emissions', category: 'environment', source: 'Reuters', publishedAt: new Date(Date.now() - 14400000).toISOString(), description: 'World leaders have signed a new framework committing to more aggressive emission reduction targets.' },
  { id: 4, title: 'Sports: upcoming championship creates surge in prediction activity', category: 'sports', source: 'ESPN', publishedAt: new Date(Date.now() - 21600000).toISOString(), description: 'Prediction markets see record volumes as major sporting events approach.' },
  { id: 5, title: 'Election forecasts: key swing states remain too close to call', category: 'politics', source: 'Politico', publishedAt: new Date(Date.now() - 28800000).toISOString(), description: 'Polling aggregators show neck-and-neck races in several battleground states.' },
  { id: 6, title: 'Crypto market analysis: Bitcoin consolidates near resistance levels', category: 'crypto', source: 'CoinDesk', publishedAt: new Date(Date.now() - 36000000).toISOString(), description: 'Analysts are watching critical price levels as institutional interest continues to grow.' },
];

const CATEGORY_COLORS_LOCAL = { finance: '#f59e0b', technology: '#a855f7', environment: '#10b981', sports: '#22c55e', politics: '#6366f1', crypto: '#f97316' };

export default function NewsPage() {
  const [news, setNews] = useState(SAMPLE_NEWS);
  const [filter, setFilter] = useState('all');
  const categories = ['all', ...new Set(SAMPLE_NEWS.map(n => n.category))];

  const filtered = filter === 'all' ? news : news.filter(n => n.category === filter);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">News Feed</h1>
        <p className="text-slate-400">Latest headlines relevant to prediction markets</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${filter === cat
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map(item => {
          const color = CATEGORY_COLORS_LOCAL[item.category] || '#6366f1';
          return (
            <div key={item.id} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${color}1a`, color }}
                    >
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.source} · {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5 leading-snug">{item.title}</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
