import React, { useState, useEffect } from 'react';

const App = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [status, setStatus] = useState('');

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const sessions = await response.json();
      setSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSession(sessions[0].id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setStatus('Error fetching sessions. Make sure you are logged in.');
    }
  };

  const collectTab = async () => {
    setStatus('Collecting...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !selectedSession) {
        throw new Error('Could not get tab or session ID');
      }

      const response = await fetch(`${API_URL}/api/tabs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: selectedSession,
          url: tab.url,
          title: tab.title,
          content: '' // Content will be fetched later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to collect tab');
      }

      setStatus(`Tab '${tab.title}' collected successfully!`);
      setTimeout(() => { setStatus('') }, 3000);
    } catch (error) {
      console.error('Error collecting tab:', error);
      setStatus(error.message);
    }
  };

  const summarizeTab = async () => {
    setStatus('Summarizing...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !selectedSession) {
        throw new Error('Could not get tab or session ID');
      }

      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tab_id: null,
          url: tab.url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize tab');
      }

      const summary = await response.json();

      const updateResponse = await fetch(`${API_URL}/api/tabs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: selectedSession,
          url: tab.url,
          title: tab.title,
          content: summary.summary
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update tab with summary');
      }

      setStatus(`Tab '${tab.title}' summarized and collected successfully!`);
      setTimeout(() => { setStatus('') }, 3000);
    } catch (error) {
      console.error('Error summarizing tab:', error);
      setStatus(error.message);
    }
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      setStatus('Please enter a name for the new session.');
      return;
    }
    setStatus('Creating session...');
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newSessionName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const newSession = await response.json();
      await fetchSessions();
      setSelectedSession(newSession[0].id);
      await collectTab();
    } catch (error) {
      console.error('Error creating session:', error);
      setStatus(error.message);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Gugel</h1>
        <a href="http://localhost:3000/dashboard" target="_blank" id="go-to-app">Go to App</a>
      </div>
      <div className="form-group">
        <label htmlFor="session">Select Research Session:</label>
        <select id="session" value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
          {sessions.map(session => (
            <option key={session.id} value={session.id}>{session.title}</option>
          ))}
        </select>
      </div>
      <div className="button-group">
        <button onClick={collectTab}>Collect Tab</button>
        <button onClick={summarizeTab}>Summarize</button>
      </div>
      <div className="divider"></div>
      <div className="form-group">
        <label htmlFor="new-session-name">Or create a new session:</label>
        <input type="text" id="new-session-name" placeholder="New session name..." value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} />
      </div>
      <button onClick={createSession}>Create and Collect</button>
      <div id="status">{status}</div>
    </div>
  );
};

export default App;
