import WaitlistCard from '../components/WaitlistCard';

// Dedicated home for the real-money waitlist — the reference mock's nav links
// to "Waitlist" and the homepage no longer embeds the card.
export default function WaitlistPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10" style={{ paddingTop: 48 }}>
      <WaitlistCard />
    </div>
  );
}
