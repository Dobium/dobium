const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/AdminDashboard.jsx', 'utf8');

const stateBlock = `
  // Layout Management state
  const [layoutMarkets, setLayoutMarkets] = useState([]);
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutMessage, setLayoutMessage] = useState('');

  useEffect(() => {
    const sorted = [...activeMarkets].sort((a, b) => {
      if ((b.display_order || 0) !== (a.display_order || 0)) {
        return (b.display_order || 0) - (a.display_order || 0);
      }
      return (b.total_volume || 0) - (a.total_volume || 0);
    });
    setLayoutMarkets(sorted);
  }, [activeMarkets]);

  const moveLayoutMarket = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === layoutMarkets.length - 1) return;
    const newLayout = [...layoutMarkets];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index + direction];
    newLayout[index + direction] = temp;
    setLayoutMarkets(newLayout);
    setLayoutMessage('');
  };

  const handleSaveLayout = async () => {
    setSavingLayout(true);
    setLayoutMessage('');
    try {
      const updates = layoutMarkets.map((m, idx) => ({
        id: m.id,
        display_order: layoutMarkets.length - idx
      }));
      const res = await fetch(\`\${API_URL}/api/admin/markets/reorder\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        setLayoutMessage('Layout saved successfully!');
        fetchMarkets();
      } else {
        const data = await res.json();
        setLayoutMessage(\`Error: \${data.error}\`);
      }
    } catch (e) {
      setLayoutMessage('Failed to save layout.');
    }
    setSavingLayout(false);
  };

  // Market Edit state`;

c = c.replace(/  \/\/ Market Edit state/g, stateBlock);

const uiBlock = `
      {/* Explore Page Layout Section */}
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Explore Page Layout</h2>
            <p className="text-slate-400 text-sm mt-1">Visually arrange the order of active markets on the Explore page.</p>
          </div>
          <div className="flex items-center gap-3">
            {layoutMessage && (
              <span className={\`text-sm font-medium \${layoutMessage.includes('Error') || layoutMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}\`}>
                {layoutMessage}
              </span>
            )}
            <button 
              onClick={handleSaveLayout}
              disabled={savingLayout || layoutMarkets.length === 0}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingLayout ? (
                <><div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"/> Saving...</>
              ) : 'Save Layout Order'}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {layoutMarkets.length === 0 ? (
            <p className="text-slate-500 text-sm">No active markets to arrange.</p>
          ) : (
            layoutMarkets.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => moveLayoutMarket(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                  </button>
                  <button 
                    onClick={() => moveLayoutMarket(idx, 1)}
                    disabled={idx === layoutMarkets.length - 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 w-6">#{idx + 1}</span>
                    <h4 className="text-white font-medium truncate">{m.title}</h4>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex gap-3">
                    <span className="uppercase text-amber-500/80">{m.category}</span>
                    <span>Vol: $\{(m.total_volume || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Markets Section */}`;

c = c.replace(/      \{\/\* Active Markets Section \*\/\}/g, uiBlock);

fs.writeFileSync('frontend/src/pages/AdminDashboard.jsx', c);
console.log('Patched AdminDashboard.jsx');
