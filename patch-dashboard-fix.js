const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/AdminDashboard.jsx', 'utf8');

c = c.replace(
\`      </div>
      </div>

                  <div key={m.id} className={\`p-4 rounded border transition-colors \${m.is_trending ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-900/50 border-slate-700'}\`}>\`,

\`      </div>
      </div>

      {/* Active Markets Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg mt-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Manage Active Markets</h2>
        {!resolvingMarket && !editingMarket ? (
          <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar">
            {activeMarkets.length === 0 ? (
              <p className="text-slate-400 text-sm">No active markets available.</p>
            ) : (
              activeMarkets.map(m => {
                const mPreds = allPredictions.filter(p => p.market_id === m.id && p.status === 'active');
                const traderCount = new Set(mPreds.map(p => p.user_id).filter(Boolean)).size;
                const topOutcome = (m.outcomes || []).slice().sort((a, b) => b.probability - a.probability)[0];
                return (
                  <div key={m.id} className={\`p-4 rounded border transition-colors \${m.is_trending ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-900/50 border-slate-700'}\`}>\`
);

fs.writeFileSync('frontend/src/pages/AdminDashboard.jsx', c);
console.log("Restored missing lines.");
