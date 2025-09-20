document.addEventListener('DOMContentLoaded', function() {
  const submitButton = document.getElementById('submit');
  const promptInput = document.getElementById('prompt');
  const responseDiv = document.getElementById('response');

  submitButton.addEventListener('click', function() {
    const prompt = promptInput.value;
    
    // For now, just display a mock response.
    // TODO: Integrate with the actual nano gemini model.
    responseDiv.innerText = `You entered: ${prompt}`;
  });
});