document.addEventListener('DOMContentLoaded', function () {
    const sessionSelect = document.getElementById('session');
    const collectButton = document.getElementById('collect');
    const statusDiv = document.getElementById('status');

    const API_URL = 'http://localhost:3000';

    async function fetchSessions() {
        try {
            const response = await fetch(`${API_URL}/api/sessions`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const sessions = await response.json();

            if (sessions.length === 0) {
                sessionSelect.innerHTML = '<option>No sessions found</option>';
                collectButton.disabled = true;
            } else {
                sessionSelect.innerHTML = sessions.map(session => `<option value="${session.id}">${session.title}</option>`).join('');
                collectButton.disabled = false;
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
            statusDiv.textContent = 'Error fetching sessions. Make sure you are logged in.';
            collectButton.disabled = true;
        }
    }

    collectButton.addEventListener('click', async () => {
        collectButton.disabled = true;
        statusDiv.textContent = 'Collecting...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const sessionId = sessionSelect.value;

            if (!tab || !sessionId) {
                throw new Error('Could not get tab or session ID');
            }

            const response = await fetch(`${API_URL}/api/tabs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    session_id: sessionId,
                    url: tab.url,
                    title: tab.title,
                    content: '' // Content will be fetched later
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to collect tab');
            }

            statusDiv.textContent = `Tab '${tab.title}' collected successfully!`;
            setTimeout(() => { statusDiv.textContent = '' }, 3000);

        } catch (error) {
            console.error('Error collecting tab:', error);
            statusDiv.textContent = error.message;
        } finally {
            collectButton.disabled = false;
        }
    });

    fetchSessions();
});
