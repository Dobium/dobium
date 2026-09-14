import { useNavigate } from 'react-router-dom';
import QuoteCard from './QuoteCard';

// Kept as a named file so existing imports keep working, but there is no
// longer a separate design here. Every market surface renders QuoteCard, which
// is the only place card styling lives now. Editing this file will not change
// how the card looks — edit QuoteCard.jsx.
export default function HomeFeedCard({ market, compact = false }) {
  const navigate = useNavigate();
  return (
    <QuoteCard
      market={market}
      compact={compact}
      onOpen={(id) => navigate(`/markets/${id}`)}
    />
  );
}
