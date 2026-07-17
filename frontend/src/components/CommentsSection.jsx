import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

// Terminal-mock palette (shared with MarketDetailPage)
const PANEL_BG = '#001F43';
const PANEL_LINE = '#1C304F';
const INSET_BG = '#00132D';
const INPUT_LINE = '#394666';
const LABEL = '#6B82A6';
const GOLD = '#FFDF9B';
const GOLD_TEXT = '#D9C089';

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 6, flexShrink: 0,
      background: INSET_BG,
      border: `1px solid ${INPUT_LINE}`,
      color: '#9FB1C9', fontWeight: 700, fontSize: 13,
      fontFamily: 'var(--mono)',
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

  const handle = (name) => `@${String(name || 'trader').replace(/^@/, '')}`;

  const renderComment = (c, isReply = false) => (
    <div key={c.id} style={{
      marginTop: isReply ? 10 : 14,
      marginLeft: isReply ? 26 : 0,
      background: 'rgba(255,255,255,.025)',
      border: `1px solid ${PANEL_LINE}`,
      borderRadius: 4,
      padding: '10px 14px 11px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', color: GOLD_TEXT, fontWeight: 700, fontSize: 11 }}>{handle(c.username)}</span>
        <span style={{ fontFamily: 'var(--mono)', color: LABEL, fontSize: 9.5 }}>{timeAgo(c.created_at)}</span>
      </div>
      <p style={{ color: '#C2CFE2', fontSize: 12.5, lineHeight: 1.6, margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {c.body}
      </p>
      {!isReply && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <button
            onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(''); }}
            style={{ background: 'none', border: 'none', color: LABEL, fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', padding: 0 }}
          >
            REPLY{repliesOf(c.id).length > 0 ? ` (${repliesOf(c.id).length})` : ''}
          </button>
          {repliesOf(c.id).length > 0 && (
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
              style={{ background: 'none', border: 'none', color: LABEL, fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', padding: 0 }}
            >
              {collapsed[c.id] ? `SHOW ${repliesOf(c.id).length}` : `HIDE ${repliesOf(c.id).length}`}
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
            placeholder={`Reply to ${handle(c.username)}...`}
            style={{ flex: 1, background: INSET_BG, border: `1px solid ${INPUT_LINE}`, borderRadius: 4, padding: '8px 11px', color: '#E6EDF9', fontSize: 12.5, outline: 'none' }}
          />
          <button
            onClick={() => post(c.id)}
            disabled={posting || !replyBody.trim()}
            style={{ background: GOLD, color: '#0A1A33', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 9.5, letterSpacing: '0.1em', border: 'none', borderRadius: 3, padding: '8px 14px', cursor: 'pointer', opacity: posting || !replyBody.trim() ? 0.5 : 1 }}
          >
            REPLY
          </button>
        </div>
      )}
      {!collapsed[c.id] && repliesOf(c.id).map(r => renderComment(r, true))}
    </div>
  );

  return (
    <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_LINE}`, borderRadius: 6 }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${PANEL_LINE}` }}>
        <h3 style={{ color: '#F2F6FF', fontWeight: 700, fontSize: 14, margin: 0 }}>
          Comments {comments.length > 0 && <span style={{ color: LABEL, fontWeight: 500, fontSize: 12 }}>({comments.length})</span>}
        </h3>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Avatar name={session ? displayName : '?'} />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && post(null)}
            placeholder={session ? 'Share your read on this market...' : 'Sign in to join the discussion'}
            onFocus={() => { if (!session) openAuthModal(); }}
            style={{ flex: 1, background: INSET_BG, border: `1px solid ${INPUT_LINE}`, borderRadius: 4, padding: '10px 13px', color: '#E6EDF9', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={() => post(null)}
            disabled={posting || !body.trim()}
            style={{ background: GOLD, color: '#0A1A33', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 10, letterSpacing: '0.12em', border: 'none', borderRadius: 3, padding: '8px 18px', cursor: 'pointer', opacity: posting || !body.trim() ? 0.5 : 1 }}
          >
            {posting ? '...' : 'POST'}
          </button>
        </div>

        {topLevel.length === 0 ? (
          <p style={{ color: LABEL, fontSize: 12, marginTop: 14, marginBottom: 2 }}>
            No comments yet — be the first to make a call on this market.
          </p>
        ) : (
          topLevel.map(c => renderComment(c))
        )}
      </div>
    </div>
  );
}
