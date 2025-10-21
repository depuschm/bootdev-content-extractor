// Options page script

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    format: 'markdown',
    extractSolution: true,
    includeMetadata: true
  });

  document.getElementById('format').value = settings.format;
  document.getElementById('extractSolution').checked = settings.extractSolution;
  document.getElementById('includeMetadata').checked = settings.includeMetadata;
}

// Save settings
async function saveSettings() {
  const settings = {
    format: document.getElementById('format').value,
    extractSolution: document.getElementById('extractSolution').checked,
    includeMetadata: document.getElementById('includeMetadata').checked
  };

  try {
    await chrome.storage.sync.set(settings);

    // Show success message
    const status = document.getElementById('status');
    status.textContent = '✓ Settings saved successfully!';
    status.className = 'status success';
    status.style.display = 'block';

    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    const status = document.getElementById('status');
    status.textContent = '✗ Error saving settings';
    status.className = 'status';
    status.style.backgroundColor = '#f8d7da';
    status.style.color = '#721c24';
    status.style.border = '1px solid #f5c6cb';
    status.style.display = 'block';
  }
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);

// Load settings on page load
loadSettings();
