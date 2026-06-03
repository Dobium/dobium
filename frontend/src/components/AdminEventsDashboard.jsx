import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

// Helper to properly format UTC database dates for the local datetime input
const formatDateTimeLocal = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

export default function AdminEventsDashboard({ adminEmail }) {
  const [events, setEvents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create/Edit Event Form
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    icon: '🏆',
    status: 'upcoming',
    event_date: '',
    season_start: '',
    season_end: ''
  });

  // Assign Markets
  const [assigningEvent, setAssigningEvent] = useState(null); // the event object
  const [marketSearch, setMarketSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsData, marketsData] = await Promise.all([
        api.adminGetEvents(adminEmail),
        api.getMarkets()
      ]);
      setEvents(eventsData);
      setMarkets(marketsData);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load events data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      icon: '🏆',
      status: 'upcoming',
      event_date: '',
      season_start: '',
      season_end: ''
    });
  };

  const handleEditClick = (event) => {
    setIsEditing(true);
    setEditingId(event.id);
    setFormData({
      name: event.name || '',
      description: event.description || '',
      image_url: event.image_url || '',
      icon: event.icon || '🏆',
      status: event.status || 'upcoming',
      event_date: formatDateTimeLocal(event.event_date),
      season_start: formatDateTimeLocal(event.season_start),
      season_end: formatDateTimeLocal(event.season_end),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        adminEmail,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
        season_start: formData.season_start ? new Date(formData.season_start).toISOString() : null,
        season_end: formData.season_end ? new Date(formData.season_end).toISOString() : null,
      };

      if (isEditing) {
        await api.adminUpdateEvent(editingId, payload);
      } else {
        await api.adminCreateEvent(payload);
      }
      
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save event');
      setLoading(false);
    }
  };

  const handleCloseEvent = async (id) => {
    if (!window.confirm('Are you sure you want to close this event? This will also close all leagues based on this event.')) return;
    try {
      setLoading(true);
      await api.adminCloseEvent(id, adminEmail);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to close event');
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await api.adminDeleteEvent(id, adminEmail);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
      setLoading(false);
    }
  };

  const handleAddMarket = async (marketId) => {
    try {
      await api.adminAddEventMarket(assigningEvent.id, { market_id: marketId, adminEmail });
      await fetchData();
      // Update local state to reflect new assignment immediately without refetching assigningEvent from server
      setAssigningEvent(prev => ({
        ...prev,
        event_markets: [...(prev.event_markets || []), { market_id: marketId }]
      }));
    } catch (err) {
      setError(err.message || 'Failed to add market to event');
    }
  };

  const handleRemoveMarket = async (marketId) => {
    try {
      await api.adminRemoveEventMarket(assigningEvent.id, marketId, adminEmail);
      await fetchData();
      setAssigningEvent(prev => ({
        ...prev,
        event_markets: prev.event_markets.filter(em => em.market_id !== marketId)
      }));
    } catch (err) {
      setError(err.message || 'Failed to remove market from event');
    }
  };

  if (loading && events.length === 0) {
    return <div className="text-dobium-text-secondary">Loading events...</div>;
  }

  // Filter out markets that are already in the assigning event
  const assignedMarketIds = assigningEvent?.event_markets?.map(em => em.market_id) || [];
  const searchLower = marketSearch.toLowerCase();
  
  const availableMarkets = markets.filter(m => 
    !assignedMarketIds.includes(m.id) &&
    (m.title.toLowerCase().includes(searchLower) || m.id.toLowerCase().includes(searchLower))
  );

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}

      {/* CREATE/EDIT FORM */}
      <div className="bg-dobium-panel border border-dobium-border rounded-xl p-6">
        <h3 className="text-xl font-bold text-dobium-text mb-6">
          {isEditing ? 'Edit Main Event' : 'Create New Main Event'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Event Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. 2026 World Cup"
                className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  placeholder="🏆"
                  className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text text-center"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Description (optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="2"
                className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Image URL (optional)</label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
              />
            </div>

            {/* TIMING CONFIG */}
            <div className="md:col-span-2 border-t border-dobium-border pt-4 mt-2">
              <h4 className="text-md font-semibold text-dobium-text mb-4">League Timing Configurations</h4>
              <p className="text-sm text-dobium-text-secondary mb-4">
                Leagues created under this event will automatically inherit these dates.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Event Start / Season Start</label>
                  <input
                    type="datetime-local"
                    name="season_start"
                    value={formData.season_start}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Event Date (Optional)</label>
                  <input
                    type="datetime-local"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dobium-text-secondary mb-1">Season End (Leagues automatically close)</label>
                  <input
                    type="datetime-local"
                    name="season_end"
                    value={formData.season_end}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-dobium-bg border border-dobium-border rounded-lg text-dobium-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-dobium-bg hover:bg-dobium-border text-dobium-text rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-dobium-accent hover:bg-dobium-accent-hover text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>

      {/* ASSIGN MARKETS MODAL / PANEL */}
      {assigningEvent && (
        <div className="bg-dobium-panel border border-dobium-accent rounded-xl p-6 relative">
          <button 
            onClick={() => setAssigningEvent(null)}
            className="absolute top-4 right-4 text-dobium-text-secondary hover:text-white"
          >
            ✕ Close
          </button>
          <h3 className="text-xl font-bold text-dobium-text mb-2">
            Assign Markets: {assigningEvent.name}
          </h3>
          <p className="text-dobium-text-secondary mb-6 text-sm">
            Markets assigned here become immediately available for prediction in all leagues associated with this event.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Assigned Markets */}
            <div>
              <h4 className="text-md font-semibold text-dobium-text mb-3">
                Assigned ({assigningEvent.event_markets?.length || 0})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {assigningEvent.event_markets?.map(em => {
                  const market = markets.find(m => m.id === em.market_id);
                  if (!market) return null;
                  return (
                    <div key={market.id} className="flex items-center justify-between p-3 bg-dobium-bg border border-dobium-border rounded-lg">
                      <span className="text-sm font-medium text-dobium-text">{market.title}</span>
                      <button 
                        onClick={() => handleRemoveMarket(market.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-900/20 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {(!assigningEvent.event_markets || assigningEvent.event_markets.length === 0) && (
                  <div className="text-dobium-text-secondary text-sm italic p-4 text-center border border-dashed border-dobium-border rounded-lg">
                    No markets assigned yet
                  </div>
                )}
              </div>
            </div>

            {/* Available Markets */}
            <div>
              <h4 className="text-md font-semibold text-dobium-text mb-3">Available Markets</h4>
              <input
                type="text"
                placeholder="Search markets..."
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                className="w-full p-2 mb-3 bg-dobium-bg border border-dobium-border rounded-lg text-sm text-dobium-text placeholder-dobium-text-secondary"
              />
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {availableMarkets.map(market => (
                  <div key={market.id} className="flex items-center justify-between p-3 bg-dobium-bg border border-dobium-border rounded-lg hover:border-dobium-accent/50 transition-colors">
                    <span className="text-sm text-dobium-text">{market.title}</span>
                    <button 
                      onClick={() => handleAddMarket(market.id)}
                      className="text-dobium-accent hover:text-white text-xs font-bold px-3 py-1 bg-dobium-accent/10 hover:bg-dobium-accent rounded transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
                {availableMarkets.length === 0 && (
                  <div className="text-dobium-text-secondary text-sm italic p-4 text-center border border-dashed border-dobium-border rounded-lg">
                    No available markets found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVENTS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.map(event => (
          <div key={event.id} className="bg-dobium-panel border border-dobium-border rounded-xl p-5 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl bg-dobium-bg p-2 rounded-lg border border-dobium-border">
                  {event.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-dobium-text leading-tight">{event.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      event.status === 'completed' ? 'bg-dobium-border text-dobium-text-secondary' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {event.status.toUpperCase()}
                    </span>
                    <span className="text-dobium-text-secondary">
                      {event.league_count} Leagues
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(event)}
                  className="p-2 bg-dobium-bg hover:bg-dobium-border rounded text-dobium-text-secondary hover:text-white transition-colors"
                  title="Edit Event"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-2 bg-dobium-bg hover:bg-red-900/30 text-dobium-text-secondary hover:text-red-400 rounded transition-colors"
                  title="Delete Event"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {event.description && (
              <p className="text-sm text-dobium-text-secondary line-clamp-2 mb-4 flex-grow">
                {event.description}
              </p>
            )}

            <div className="bg-dobium-bg rounded-lg p-3 border border-dobium-border flex flex-col gap-2">
              <div>
                <span className="block font-medium mb-0.5 text-xs text-dobium-text-secondary">Event Date</span>
                <span className="text-dobium-text text-sm">
                  {event.event_date ? new Date(event.event_date).toLocaleString() : 'Not Set'}
                </span>
              </div>
              <div>
                <span className="block font-medium mb-0.5 text-xs text-dobium-text-secondary">Season End</span>
                <span className="text-dobium-text text-sm">
                  {event.season_end ? new Date(event.season_end).toLocaleString() : 'Not Set'}
                </span>
              </div>
            </div>

            <div className="mt-auto flex gap-3 pt-4 border-t border-dobium-border">
              <button
                onClick={() => setAssigningEvent(events.find(e => e.id === event.id))}
                className="flex-1 py-2 bg-dobium-accent/10 hover:bg-dobium-accent/20 text-dobium-accent font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Markets ({event.market_count || 0})</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              
              {event.status !== 'completed' && (
                <button
                  onClick={() => handleCloseEvent(event.id)}
                  className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold rounded-lg transition-colors"
                >
                  Close Event
                </button>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="lg:col-span-2 text-center py-12 text-dobium-text-secondary bg-dobium-bg border border-dashed border-dobium-border rounded-xl">
            No Main Events found. Create one above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
