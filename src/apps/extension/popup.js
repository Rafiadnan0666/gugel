document.addEventListener('DOMContentLoaded', function() {
  const collectTabsButton = document.getElementById('collectTabs');
  const statusDiv = document.getElementById('status');

  collectTabsButton.addEventListener('click', function() {
    statusDiv.textContent = 'Collecting tabs...';

    chrome.tabs.query({currentWindow: true}, function(tabs) {
      const collectedTabs = tabs.map(tab => ({
        url: tab.url,
        title: tab.title
      }));

      console.log('Collected Tabs:', collectedTabs);
      statusDiv.textContent = `Collected ${collectedTabs.length} tabs. Sending to Tabwise...`;

      // Implement sending collectedTabs to the Tabwise backend
      fetch('http://localhost:3000/api/collect-tabs', { // Assuming Tabwise runs on localhost:3000
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': 'Bearer YOUR_AUTH_TOKEN' // Authentication would be needed for a real app
        },
        body: JSON.stringify({ tabs: collectedTabs })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Tabs sent to Tabwise:', data);
        statusDiv.textContent = 'Tabs sent to Tabwise successfully!';
      })
      .catch(error => {
        console.error('Error sending tabs to Tabwise:', error);
        statusDiv.textContent = 'Failed to send tabs to Tabwise.';
      });
    });
  });
});