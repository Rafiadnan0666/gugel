document.addEventListener('DOMContentLoaded', async function() {
  const submitButton = document.getElementById('submit');
  const promptInput = document.getElementById('prompt');
  const responseDiv = document.getElementById('response');
  const statusDiv = document.getElementById('status');
  const historyDiv = document.getElementById('history');

  // Load and display conversation history
  chrome.storage.local.get('history', function(data) {
    if (data.history) {
      data.history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.innerHTML = `<b>You:</b> ${item.prompt}<br><b>AI:</b> ${item.response}`;
        historyDiv.appendChild(historyItem);
      });
    }
  });

  try {
    const sessionCheck = await chrome.ai.canCreateTextSession();
    statusDiv.textContent = `Model availability: ${sessionCheck}`;

    if (sessionCheck === 'readily') {
      submitButton.disabled = false;
    } else {
      submitButton.disabled = true;
      if (sessionCheck === 'after-download') {
        statusDiv.textContent = 'Model is being downloaded. Please wait.';
      } else {
        statusDiv.innerHTML = '<b>Error:</b> The chrome.ai API is not available. Please ensure you are using Chrome 127 or later and have enabled the following flags in chrome://flags:<br><ul><li>#prompt-api-for-gemini-nano</li><li>#optimization-guide-on-device-model</li></ul>';
      }
    }
  } catch (error) {
    statusDiv.textContent = 'Error: ' + error.message;
  }

  submitButton.addEventListener('click', async function() {
    const prompt = promptInput.value;
    responseDiv.textContent = 'Loading...';

    try {
      const session = await chrome.ai.createTextSession();
      const result = await session.prompt(prompt);
      responseDiv.textContent = result;

      // Save to history
      chrome.storage.local.get('history', function(data) {
        const history = data.history || [];
        history.push({ prompt: prompt, response: result });
        chrome.storage.local.set({ history: history });

        // Update history display
        const historyItem = document.createElement('div');
        historyItem.innerHTML = `<b>You:</b> ${prompt}<br><b>AI:</b> ${result}`;
        historyDiv.appendChild(historyItem);
      });

    } catch (error) {
      responseDiv.textContent = 'Error: ' + error.message;
    }
  });
});