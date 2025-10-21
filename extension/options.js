// Options page script - Cross-browser compatible
// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);

// Load saved settings
async function loadSettings() {
  const settings = await api.storage.sync.get({
    format: 'markdown',
    extractSolution: true,
    includeMetadata: true,
    notionEnabled: false,
    notionToken: '',
    notionDatabaseId: ''
  });

  document.getElementById('format').value = settings.format;
  document.getElementById('extractSolution').checked = settings.extractSolution;
  document.getElementById('includeMetadata').checked = settings.includeMetadata;
  document.getElementById('notionEnabled').checked = settings.notionEnabled;
  document.getElementById('notionToken').value = settings.notionToken;
  document.getElementById('notionDatabaseId').value = settings.notionDatabaseId;
}

// Save settings
async function saveSettings() {
  const settings = {
    format: document.getElementById('format').value,
    extractSolution: document.getElementById('extractSolution').checked,
    includeMetadata: document.getElementById('includeMetadata').checked,
    notionEnabled: document.getElementById('notionEnabled').checked,
    notionToken: document.getElementById('notionToken').value.trim(),
    notionDatabaseId: document.getElementById('notionDatabaseId').value.trim()
  };

  try {
    await api.storage.sync.set(settings);

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
    showError('Error saving settings');
  }
}

// Test Notion connection
async function testConnection() {
  const token = document.getElementById('notionToken').value.trim();
  const databaseId = document.getElementById('notionDatabaseId').value.trim();

  if (!token || !databaseId) {
    showError('Please enter both Integration Token and Database ID');
    return;
  }

  // Show testing status
  const status = document.getElementById('status');
  status.textContent = '⏳ Testing connection...';
  status.className = 'status';
  status.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
  status.style.color = '#5865f2';
  status.style.border = '1px solid #4752c4';
  status.style.display = 'block';

  try {
    const result = await NotionAPI.testConnection(token, databaseId);

    if (result.success) {
      status.textContent = `✓ Connected successfully to: ${result.database.title[0]?.plain_text || 'Database'}`;
      status.className = 'status success';
    } else {
      status.textContent = `✗ Connection failed: ${result.error}`;
      status.className = 'status error';
    }
  } catch (error) {
    status.textContent = `✗ Connection failed: ${error.message}`;
    status.className = 'status error';
  }
}

// Show error message
function showError(message) {
  const status = document.getElementById('status');
  status.textContent = `✗ ${message}`;
  status.className = 'status error';
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('testBtn').addEventListener('click', testConnection);

// Load settings on page load
loadSettings();
