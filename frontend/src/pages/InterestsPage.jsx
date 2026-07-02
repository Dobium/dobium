import { useState } from 'react';
import { storage } from '../store/storage';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const TOPICS = {
  Technology: ['Artificial Intelligence', 'Cybersecurity', 'Big Tech', 'Social Media', 'Electric Vehicles'],
  Sports: ['NBA / Basketball', 'Champions League / Soccer', 'NFL / Football', 'World Cup', 'Tennis'],
  Entertainment: ['Music', 'Film', 'Award Shows', 'Celebrity News'],
};

export default function InterestsPage() {
  const [selected, setSelected] = useState(() => storage.load('interests', []));
  const navigate = useNavigate();
  const { session } = useAuth();

  const toggle = (topic) => {
    const next = selected.includes(topic)
      ? selected.filter(t => t !== topic)
      : [...selected, topic];
    setSelected(next);
    storage.save('interests', next);
  };

  const isSelected = (t) => selected.includes(t);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Your Interests</h1>
        <p className="page-subtitle">Select topics to personalize your feed ({selected.length} selected)</p>
      </div>

      {Object.entries(TOPICS).map(([category, topics]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div className="section-title">{category}</div>
          <div className="filter-bar">
            {topics.map(topic => (
              <button
                key={topic}
                className={`filter-chip${isSelected(topic) ? ' active' : ''}`}
                onClick={() => toggle(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={() => navigate('/explore')}>
          Explore Markets →
        </button>
        <button className="btn btn-secondary" onClick={() => { setSelected([]); storage.save('interests', []); }}>
          Clear all
        </button>
      </div>
    </div>
  );
}
