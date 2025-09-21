
document.addEventListener('DOMContentLoaded', function() {
  const submitButton = document.getElementById('submit');
  const promptInput = document.getElementById('prompt');
  const responseDiv = document.getElementById('response');

  submitButton.addEventListener('click', async function() {
    const prompt = promptInput.value;
    responseDiv.textContent = 'Loading...';

    try {
      const session = await chrome.ai.createTextSession();
      const result = await session.prompt(prompt);
      responseDiv.textContent = result;
    } catch (error) {
      responseDiv.textContent = 'Error: ' + error.message;
    }
  });
});
