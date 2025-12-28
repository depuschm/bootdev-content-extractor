// Options page script - Cross-browser compatible
// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);

// Default database types
const DEFAULT_DATABASE_TYPES = [
  { type: Config.CONTENT_TYPES.CHALLENGE, id: '' },
  { type: Config.CONTENT_TYPES.LESSON, id: '' },
  { type: 'other', id: '' }
];

// Database list state
let databases = [];

// Load saved settings
async function loadSettings() {
  const settings = await api.storage.sync.get({
    format: Config.DEFAULTS.FORMAT,
    extractSolution: Config.DEFAULTS.EXTRACT_SOLUTION,
    extractChats: Config.DEFAULTS.EXTRACT_CHATS,
    includeMetadata: Config.DEFAULTS.INCLUDE_METADATA,
    notionEnabled: Config.DEFAULTS.NOTION_ENABLED,
    notionToken: '',
    databases: [...DEFAULT_DATABASE_TYPES]
  });

  document.getElementById('format').value = settings.format;
  document.getElementById('extractSolution').checked = settings.extractSolution;
  document.getElementById('extractChats').checked = settings.extractChats;
  document.getElementById('includeMetadata').checked = settings.includeMetadata;
  document.getElementById('notionEnabled').checked = settings.notionEnabled;
  document.getElementById('notionToken').value = settings.notionToken;

  // Load databases - filter out old default types that shouldn't exist anymore
  const oldDefaultTypes = ['yes-no', 'multiple-choice', 'free-text'];
  const loadedDatabases = settings.databases || [];

  // Check if we have the old defaults with empty IDs - if so, use new defaults
  const hasOldEmptyDefaults = oldDefaultTypes.some(type =>
    loadedDatabases.some(db => db.type === type && !db.id)
  );

  if (hasOldEmptyDefaults && loadedDatabases.every(db => !db.id)) {
    // User has old empty defaults, replace with new defaults
    databases = [...DEFAULT_DATABASE_TYPES];
  } else {
    // Keep user's configuration
    databases = loadedDatabases;
  }

  renderDatabases();
}

// Render database list
function renderDatabases() {
  const container = document.getElementById('databaseList');

  if (databases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No databases configured yet.<br>
        Click "+ Add Database" below to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  databases.forEach((db, index) => {
    const dbField = document.createElement('div');
    dbField.className = 'db-field';

    const isFallback = db.type.toLowerCase() === 'other';
    const badge = isFallback
      ? '<span class="db-field-badge fallback">Fallback</span>'
      : '';

    dbField.innerHTML = `
      <div class="db-field-header">
        <div class="db-field-type">
          <input 
            type="text" 
            placeholder="Type name (e.g., challenge)" 
            value="${db.type}"
            data-index="${index}"
            data-field="type"
            style="width: 100%; font-size: 13px; padding: 8px 10px;"
          >
        </div>
        <div class="db-field-id">
          <input 
            type="text" 
            placeholder="Database ID" 
            value="${db.id}"
            data-index="${index}"
            data-field="id"
            style="width: 100%; font-size: 13px; padding: 8px 10px;"
          >
        </div>
        ${badge}
        <button class="db-field-remove" data-index="${index}">Remove</button>
      </div>
      <p class="description" style="margin-top: 8px;">
        ${isFallback
        ? 'This is the fallback database for content types that don\'t have a specific database configured.'
        : `Content with type "${db.type}" will be sent to this database.`
      }
      </p>
    `;

    container.appendChild(dbField);
  });

  // Add event listeners for inputs with validation
  container.querySelectorAll('input[data-field="type"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      const newType = e.target.value.trim();
      const oldType = databases[index].type;

      // Check for duplicates
      const duplicate = databases.find((db, i) =>
        i !== index && db.type.toLowerCase() === newType.toLowerCase()
      );

      if (duplicate && newType) {
        e.target.style.borderColor = 'var(--red-500)';
        e.target.title = 'This type name already exists!';
      } else {
        e.target.style.borderColor = '';
        e.target.title = '';
        databases[index].type = newType;

        // Re-render if type changed to/from "other" to update fallback badge
        const wasOther = oldType.toLowerCase() === 'other';
        const isOther = newType.toLowerCase() === 'other';

        if (wasOther !== isOther) {
          renderDatabases();
        }
      }
    });
  });

  container.querySelectorAll('input[data-field="id"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      const newId = e.target.value.trim();

      // No validation for duplicate IDs - allow same database for multiple types
      e.target.style.borderColor = '';
      e.target.title = '';
      databases[index].id = newId;
    });
  });

  // Add event listeners for remove buttons
  container.querySelectorAll('.db-field-remove').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeDatabase(index);
    });
  });
}

// Add new database
function addDatabase() {
  databases.push({ type: '', id: '' });
  renderDatabases();
}

// Remove database
function removeDatabase(index) {
  databases.splice(index, 1);
  renderDatabases();
}

// Restore default database types
function restoreDefaults() {
  // Show confirmation modal
  document.getElementById('confirmModal').classList.add('show');
}

// Confirm restore defaults
function confirmRestoreDefaults() {
  // Hide modal
  document.getElementById('confirmModal').classList.remove('show');

  // Get existing database IDs to preserve them if types match
  const existingIds = {};
  databases.forEach(db => {
    if (db.id) {
      existingIds[db.type.toLowerCase()] = db.id;
    }
  });

  // Create defaults, preserving existing IDs where types match
  databases = DEFAULT_DATABASE_TYPES.map(defaultDb => ({
    type: defaultDb.type,
    id: existingIds[defaultDb.type.toLowerCase()] || ''
  }));

  renderDatabases();

  // Show feedback
  const status = document.getElementById('status');
  status.textContent = '✔ Default database types restored! Don\'t forget to save.';
  status.className = 'status';
  status.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
  status.style.color = '#5865f2';
  status.style.border = '1px solid #4752c4';
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// Cancel restore defaults
function cancelRestoreDefaults() {
  document.getElementById('confirmModal').classList.remove('show');
}

// Save settings
async function saveSettings() {
  // Validate databases
  const validation = Validator.validateDatabases(databases);

  // Show validation results
  if (validation.errors.length > 0) {
    showError(validation.errors.join(', '));
    Logger.error('Database validation errors:', validation.errors);
    return;
  }

  if (validation.warnings.length > 0) {
    Logger.warn('Database validation warnings:', validation.warnings);
  }

  // Filter out empty databases
  const validDatabases = databases.filter(db => db.type || db.id);

  const settings = {
    format: document.getElementById('format').value,
    extractSolution: document.getElementById('extractSolution').checked,
    extractChats: document.getElementById('extractChats').checked,
    includeMetadata: document.getElementById('includeMetadata').checked,
    notionEnabled: document.getElementById('notionEnabled').checked,
    notionToken: document.getElementById('notionToken').value.trim(),
    databases: validDatabases
  };

  try {
    await api.storage.sync.set(settings);

    // Update local state with validated databases
    databases = validDatabases;
    renderDatabases();

    // Show success message
    const status = document.getElementById('status');
    status.textContent = '✔ Settings saved successfully!';
    status.className = 'status success';
    status.style.display = 'block';
    // Reset any custom styles from other operations
    status.style.backgroundColor = '';
    status.style.color = '';
    status.style.border = '';

    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  } catch (error) {
    Logger.error('Error saving settings:', error);
    showError('Error saving settings');
  }
}

// Test Notion connection
async function testConnection() {
  const token = document.getElementById('notionToken').value.trim();

  // Get valid databases
  const validDatabases = databases.filter(db => db.type && db.id);

  if (!token) {
    showError('Please enter Integration Token');
    return;
  }

  if (validDatabases.length === 0) {
    showError('Please add at least one database with both type and ID filled');
    return;
  }

  // Show testing status
  const status = document.getElementById('status');
  status.textContent = '⏳ Testing connections...';
  status.className = 'status';
  status.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
  status.style.color = '#5865f2';
  status.style.border = '1px solid #4752c4';
  status.style.display = 'block';

  try {
    const results = [];
    const testedDatabases = new Set();

    // Test each unique database (skip duplicates)
    for (const db of validDatabases) {
      if (testedDatabases.has(db.id)) {
        // Already tested this database ID, reuse the result
        const existingResult = results.find(r => r.id === db.id);
        if (existingResult) {
          results.push({
            type: db.type,
            id: db.id,
            success: existingResult.success,
            title: existingResult.title,
            error: existingResult.error
          });
        }
        continue;
      }

      testedDatabases.add(db.id);
      const result = await NotionAPI.testConnection(token, db.id);
      results.push({
        type: db.type,
        id: db.id,
        success: result.success,
        title: result.database?.title[0]?.plain_text || 'Unknown',
        error: result.error
      });
    }

    // Display results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (failed.length === 0) {
      // Group by database ID to show which types share databases
      const byDatabase = {};
      successful.forEach(s => {
        if (!byDatabase[s.id]) {
          byDatabase[s.id] = { title: s.title, types: [] };
        }
        byDatabase[s.id].types.push(s.type);
      });

      const dbSummary = Object.entries(byDatabase)
        .map(([id, info]) => `${info.title} (${info.types.join(', ')})`)
        .join('<br>');

      status.innerHTML = `
        <strong>✔ All ${successful.length} database(s) connected successfully!</strong><br>
        <small style="opacity: 0.8; margin-top: 8px; display: block;">
          ${dbSummary}
        </small>
      `;
      status.className = 'status success';
    } else if (successful.length > 0) {
      status.innerHTML = `
        <strong>⚠️ Partial Success:</strong><br>
        ${successful.length} connected, ${failed.length} failed<br>
        <small style="opacity: 0.8; margin-top: 8px; display: block;">
          ✔ Connected: ${successful.map(s => s.type).join(', ')}<br>
          ✗ Failed: ${failed.map(f => f.type).join(', ')}
        </small>
      `;
      status.className = 'status';
      status.style.backgroundColor = 'rgba(239, 187, 3, 0.1)';
      status.style.color = '#efbb03';
      status.style.border = '1px solid #c18500';
    } else {
      status.innerHTML = `
        <strong>✗ All connections failed</strong><br>
        <small style="opacity: 0.8; margin-top: 8px; display: block;">
          ${failed[0].error}
        </small>
      `;
      status.className = 'status error';
    }
  } catch (error) {
    Logger.error('Connection test error:', error);
    status.textContent = `✗ Connection test failed: ${error.message}`;
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
document.getElementById('addDatabaseBtn').addEventListener('click', addDatabase);
document.getElementById('restoreDefaultsBtn').addEventListener('click', restoreDefaults);
document.getElementById('confirmRestore').addEventListener('click', confirmRestoreDefaults);
document.getElementById('cancelRestore').addEventListener('click', cancelRestoreDefaults);

// Close modal when clicking outside
document.getElementById('confirmModal').addEventListener('click', (e) => {
  if (e.target.id === 'confirmModal') {
    cancelRestoreDefaults();
  }
});

// Load settings on page load
loadSettings();
