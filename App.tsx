import React, { useState, useEffect } from 'react';
import { Event, Item, Suggestion, ViewState } from './types';
import { StorageService } from './services/storage';
import { GeminiService } from './services/gemini';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Modal } from './components/Modal';

// --- Shared Components ---

const Header: React.FC<{
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogoClick: () => void;
}> = ({ darkMode, toggleDarkMode, onLogoClick }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div
          onClick={onLogoClick}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <img
            src="/bringwhat-sm.png"
            alt="BringWhat Logo"
            className="w-8 h-8 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform"
          />
          <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">BringWhat</span>
        </div>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="py-8 px-4 text-center border-t border-gray-200 dark:border-gray-800 mt-auto bg-gray-50 dark:bg-gray-900/50 transition-colors duration-200">
      <div className="max-w-md mx-auto flex flex-col items-center space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Made with ❤️ by TQ for simple gatherings.
        </p>
        <div className="flex space-x-6 text-sm font-medium">
          <a href="https://bringwhat.dev" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Website
          </a>
          <a href="https://github.com/tquizzle/bringwhat" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            GitHub
          </a>
          <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Privacy
          </a>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
          © {new Date().getFullYear()} BringWhat App
        </p>
      </div>
    </footer>
  );
};

// --- Sub-components for pages ---

const CreateEventView: React.FC<{
  onCancel: () => void;
  onCreated: (id: string) => void;
}> = ({ onCancel, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hostName, setHostName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !hostName || !date) return;

    setLoading(true);
    try {
      const event = await StorageService.createEvent({
        title,
        description,
        hostName,
        date,
        time
      });
      onCreated(event.id);
    } catch (error) {
      console.error("Failed to create event", error);
      alert("Something went wrong creating the event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full animate-fade-in">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Create Event</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Start a new list for your gathering.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Event Title"
          placeholder="e.g., Summer BBQ, Game Night"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>

        <Input
          label="Host Name"
          placeholder="Your name"
          value={hostName}
          onChange={e => setHostName(e.target.value)}
          required
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
            Description (Optional)
          </label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-200 h-24 resize-none"
            placeholder="What's the plan?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} className="flex-1">
            Create Link
          </Button>
        </div>
      </form>
    </div>
  );
};

const EventView: React.FC<{
  eventId: string;
  onBack: () => void;
}> = ({ eventId, onBack }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  // Add Item State
  const [newItemName, setNewItemName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load Data
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoadingEvent(true);
      try {
        const loadedEvent = await StorageService.getEventById(eventId);
        if (mounted && loadedEvent) {
          setEvent(loadedEvent);
          const loadedItems = await StorageService.getItemsByEventId(eventId);
          if (mounted) setItems(loadedItems);

          const savedName = localStorage.getItem('bringwhat_username');
          if (mounted && savedName) setGuestName(savedName);
        } else if (mounted) {
          // Handle not found
          setEvent(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoadingEvent(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [eventId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !guestName) return;

    setIsSubmitting(true);
    try {
      await StorageService.addItem({
        eventId,
        guestName,
        itemName: newItemName,
        category: 'other'
      });

      localStorage.setItem('bringwhat_username', guestName);

      // Refresh list
      const updatedItems = await StorageService.getItemsByEventId(eventId);
      setItems(updatedItems);

      setIsAddModalOpen(false);
      setNewItemName('');
    } catch (e) {
      console.error(e);
      alert("Could not add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSuggestions = async () => {
    if (!event) return;
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    const results = await GeminiService.getSuggestions(event, items);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  const acceptSuggestion = (suggestion: Suggestion) => {
    setNewItemName(suggestion.itemName);
    setIsAddModalOpen(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: event?.title || 'Join my party',
      text: `Join the list for ${event?.title}!`,
      url: url
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="flex justify-center items-center h-64 text-indigo-500">
        <svg className="animate-spin h-8 w-8 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p className="mb-4">Event not found.</p>
        <Button onClick={onBack} variant="secondary">Go Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-12 animate-fade-in w-full">
      {/* Header Card */}
      <div className="bg-indigo-600 dark:bg-indigo-900 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg shadow-indigo-200 dark:shadow-none">
        <div className="flex justify-between items-start mb-4 max-w-md mx-auto">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={handleShare} className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-2 leading-tight">{event.title}</h1>
          <div className="flex items-center text-indigo-100 text-sm mb-4">
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{event.date} {event.time && `• ${event.time}`}</span>
            <span className="mx-2">•</span>
            <span>Hosted by {event.hostName}</span>
          </div>
          <p className="text-indigo-5 opacity-90 leading-relaxed max-w-lg">
            {event.description}
          </p>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-md mx-auto px-4 -mt-6">

        {/* AI Suggestion Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-indigo-100 dark:border-gray-700 p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9.8 19c-.88 0-1.6.72-1.6 1.6S8.92 22.2 9.8 22.2s1.6-.72 1.6-1.6-.72-1.6-1.6-1.6zM20 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm8.8-3.2L16 2.6 13.8 11l-8.4 2.2 8.4 2.2L16 23.8l2.2-8.4 8.4-2.2-8.4-2.2z" />
              </svg>
              Party Assistant
            </div>
            {!showSuggestions && (
              <button
                onClick={loadSuggestions}
                className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                What to bring?
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="animate-fade-in">
              {loadingSuggestions ? (
                <div className="space-y-2">
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse delay-75"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => acceptSuggestion(s)}
                      className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-white dark:from-gray-700 dark:to-gray-800 border border-indigo-100 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{s.itemName}</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Add +</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.reason}</p>
                    </button>
                  ))}
                  {suggestions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">I think you have everything covered!</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* List Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Who's bringing what</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">{items.length} items</span>
        </div>

        {/* List Items */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
              <p className="text-gray-400 mb-2">The list is empty.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Be the first to bring something!
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.itemName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">brought by <span className="text-indigo-600 dark:text-indigo-400 font-medium">{item.guestName}</span></p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Prominent CTA Button - Static Position */}
        <div className="mt-10 mb-6 flex justify-center">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl shadow-gray-400/40 dark:shadow-black/40 rounded-full px-8 py-4 flex items-center font-bold text-lg hover:scale-105 active:scale-95 transition-transform"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            I'm bringing...
          </button>
        </div>

      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="What are you bringing?"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="I'm bringing"
            placeholder="e.g. Potato Salad, Cups"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="My Name"
            placeholder="Your name"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            required
          />
          <div className="pt-2">
            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Add to List
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

const App: React.FC = () => {
  // Initialize from localStorage immediately to prevent flash
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' ||
          (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    } catch (e) {
      return false;
    }
    return false;
  });

  const [viewState, setViewState] = useState<ViewState>({ type: 'HOME' });

  // Sync class on mount and change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Simple Router
  const handleUrlChange = () => {
    const path = window.location.pathname;
    // Route: /event/:id
    const eventMatch = path.match(/^\/event\/([^/]+)$/);
    if (eventMatch) {
      setViewState({ type: 'EVENT_DETAILS', eventId: eventMatch[1] });
      return;
    }
    // Route: /create
    if (path === '/create') {
      setViewState({ type: 'CREATE_EVENT' });
      return;
    }
    // Default: Home
    setViewState({ type: 'HOME' });
  };

  useEffect(() => {
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    handleUrlChange();
  };

  let content;
  if (viewState.type === 'CREATE_EVENT') {
    content = <CreateEventView onCancel={() => navigate('/')} onCreated={(id) => navigate(`/event/${id}`)} />;
  } else if (viewState.type === 'EVENT_DETAILS') {
    content = <EventView eventId={viewState.eventId} onBack={() => navigate('/')} />;
  } else {
    // Home View
    content = (
      <div className="flex flex-col items-center justify-center pt-20 pb-12 px-4 text-center animate-fade-in">
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <h1 className="relative text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
            Potlucks, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Simplified.</span>
          </h1>
        </div>

        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Create an event, share the link, and let your friends tell you what they're bringing. No login required. AI-assisted suggestions included.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Button
            onClick={() => navigate('/create')}
            fullWidth
            className="text-lg py-4 shadow-xl shadow-indigo-200/50 dark:shadow-none"
          >
            Create Event
          </Button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl w-full text-left">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Instant Setup</h3>
            <p className="text-gray-500 dark:text-gray-400">No registration needed. Create an event in seconds.</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Suggestions</h3>
            <p className="text-gray-500 dark:text-gray-400">Stuck on what to bring? Let Gemini AI suggest items.</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Real-time List</h3>
            <p className="text-gray-500 dark:text-gray-400">See who is bringing what instantly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogoClick={() => navigate('/')}
      />
      <main className="flex-grow flex flex-col max-w-5xl mx-auto w-full">
        {content}
      </main>
      <Footer />
    </div>
  );
};

export default App;