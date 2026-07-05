import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `about ${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 999, flexShrink: 0,
      background: 'linear-gradient(135deg, #1f2b52, #101a3d)',
      border: '1px solid var(--line)',
      color: 'var(--gold)', fontWeight: 700, fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {(name || 't').charAt(0).toUpperCase()}
    </div>
  );
}

export default function CommentsSection({ marketId }) {
  const { session, openAuthModal } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null); // comment id being replied to
  const [replyBody, setReplyBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await api.getComments(marketId);
      setComments(Array.isArray(data) ? data : []);
    } catch { setComments([]); }
  }, [marketId]);

  useEffect(() => { load(); }, [load]);

  const displayName =
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.display_name ||
    (session?.user?.email ? session.user.email.split('@')[0] : 'trader');

  const post = async (parentId = null) => {
    const text = (parentId ? replyBody : body).trim();
    if (!text) return;
    if (!session?.user?.id) { openAuthModal(); return; }
    setPosting(true);
    try {
      await api.postComment(marketId, {
        user_id: session.user.id,
        username: displayName,
        body: text,
        parent_id: parentId,
      });
      if (parentId) { setReplyBody(''); setReplyTo(null); } else { setBody(''); }
      await load();
    } catch { /* keep text so the user can retry */ }
    setPosting(false);
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesOf = (id) => comments.filter(c => c.parent_id === id);

  const renderComment = (c, isReply = false) => (
    <div key={c.id} style={{ display: 'flex', gap: 12, marginTop: isReply ? 14 : 22 }}>
      <Avatar name={c.username} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>{c.username}</span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{timeAgo(c.created_at)}</span>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.55, margin: '4px 0 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {c.body}
        </p>
        {!isReply && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              ← Reply{repliesOf(c.id).length > 0 ? ` (${repliesOf(c.id).length})` : ''}
            </button>
            {repliesOf(c.id).length > 0 && (
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer', padding: 0 }}
              >
                {collapsed[c.id] ? `Show ${repliesOf(c.id).length} replies` : `Hide ${repliesOf(c.id).length} replies`}
              </button>
            )}
          </div>
        )}
        {replyTo === c.id && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && post(c.id)}
              placeholder={`Reply to ${c.username}...`}
              style={{ flex: 1, background: 'rgba(10,17,40,.65)', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: 13.5, outline: 'none' }}
            />
            <button
              onClick={() => post(c.id)}
              disabled={posting || !replyBody.trim()}
              style={{ background: 'linear-gradient(180deg,#F7D573,var(--gold-2))', color: '#1a1405', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', opacity: posting || !replyBody.trim() ? 0.5 : 1 }}
            >
              Reply
            </button>
          </div>
        )}
        {!collapsed[c.id] && repliesOf(c.id).map(r => renderComment(r, true))}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5" style={{ fontFamily: 'inherit' }}>
      <h3 style={{ color: 'var(--text)', fontWeight: 800, fontSize: 17, margin: '0 0 14px' }}>
        Comments {comments.length > 0 && <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14 }}>({comments.length})</span>}
      </h3>

      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar name={session ? displayName : '?'} />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && post(null)}
          placeholder={session ? 'Share your read on this market...' : 'Sign in to join the discussion'}
          onFocus={() => { if (!session) openAuthModal(); }}
          style={{ flex: 1, background: 'rgba(10,17,40,.65)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 13px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={() => post(null)}
          disabled={posting || !body.trim()}
          style={{ background: 'linear-gradient(180deg,#F7D573,var(--gold-2))', color: '#1a1405', fontWeight: 700, fontSize: 13.5, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', opacity: posting || !body.trim() ? 0.5 : 1 }}
        >
          {posting ? '...' : 'Post'}
        </button>
      </div>

      {topLevel.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 18, marginBottom: 4 }}>
          No comments yet — be the first to make a call on this market.
        </p>
      ) : (
        topLevel.map(c => renderComment(c))
      )}
    </div>
  );
}
