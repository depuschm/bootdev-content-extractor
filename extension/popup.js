// Popup script - Cross-browser compatible with interview support
// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);

let currentData = null;

// Check if we're on a valid page
async function checkPage() {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab.url.includes('boot.dev/challenges/') && !tab.url.includes('boot.dev/lessons/')) {
    document.getElementById('statusText').textContent = 'Not on a Boot.dev challenge or lesson page';
    document.getElementById('extractBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('notionBtn').disabled = true;
    return false;
  }

  document.getElementById('statusText').textContent = 'Ready to extract!';
  document.getElementById('status').classList.add('ready');

  // Check if Notion is configured
  await checkNotionConfig();

  return true;
}

// Check Notion configuration
async function checkNotionConfig() {
  const settings = await api.storage.sync.get({
    notionEnabled: false,
    notionToken: '',
    databases: []
  });

  const notionBtn = document.getElementById('notionBtn');

  // Check if at least one database is configured
  const hasAnyDatabase = settings.databases && settings.databases.length > 0;

  if (!settings.notionEnabled || !settings.notionToken || !hasAnyDatabase) {
    notionBtn.disabled = true;
    notionBtn.textContent = '🔗 Configure Notion in Options';
  } else {
    notionBtn.disabled = false;
    notionBtn.textContent = '🔗 Send to Notion';
  }
}

// Get the appropriate database ID for the content type
function getDatabaseIdForType(type, databases) {
  if (!databases || databases.length === 0) {
    return null;
  }

  const normalizedType = type?.toLowerCase().trim();

  // Try exact match first
  let match = databases.find(db => db.type.toLowerCase().trim() === normalizedType);
  if (match && match.id) {
    return match.id;
  }

  // Try partial match (e.g., "multiple-choice" matches "multiple choice")
  const typeWords = normalizedType.replace(/[-_]/g, ' ').split(' ');
  match = databases.find(db => {
    const dbType = db.type.toLowerCase().trim().replace(/[-_]/g, ' ');
    return typeWords.some(word => dbType.includes(word)) ||
      dbType.split(' ').some(word => normalizedType.includes(word));
  });
  if (match && match.id) {
    return match.id;
  }

  // Fall back to any database with "other" type (case-insensitive)
  const fallback = databases.find(db => db.type.toLowerCase().trim() === 'other');
  return fallback ? fallback.id : null;
}

// Get file extension for language
function getFileExtension(language) {
  const languageMap = {
    'python': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'go': 'go',
    'sql': 'sql',
    'c': 'c',
    'cpp': 'cpp',
    'rust': 'rs',
    'java': 'java',
    'shell': 'sh',
    'json': 'json',
    'yaml': 'yaml',
    'markdown': 'md',
    'html': 'html',
    'css': 'css'
  };

  return languageMap[language?.toLowerCase()] || 'txt';
}

// Format data for download
function formatData(data, format) {
  const includeMetadata = data.includeMetadata !== false;
  const isInterview = data.exerciseType === 'interview';
  const version = api.runtime.getManifest().version;

  if (format === 'json') {
    const jsonData = {
      title: data.title || 'Boot.dev Content',
      type: data.type,
      exerciseType: data.exerciseType,
      language: data.language || 'Unknown',
      description: data.description || 'Not found',
      requirements: data.requirements || [],
      notes: data.notes || [],
      examples: data.examples || []
    };

    if (isInterview) {
      jsonData.interviewMessages = data.interviewMessages || [];
      jsonData.expectedPoints = data.expectedPoints || [];
      jsonData.solution = data.solution || '';
    } else {
      jsonData.allFiles = data.allFiles || [];
      jsonData.starterCode = data.starterCode || 'Not found';
      jsonData.testCode = data.testCode || 'Not found';
      jsonData.userCode = data.userCode || '';
      jsonData.solution = data.solution || '';
    }

    if (includeMetadata) {
      jsonData.url = data.url;
      jsonData.timestamp = data.timestamp;
    }

    return JSON.stringify(jsonData, null, 2);
  } else if (format === 'markdown') {
    let markdown = `# ${data.title || 'Boot.dev Content'}\n\n`;

    if (includeMetadata) {
      markdown += `**Type:** ${data.type}\n`;
      markdown += `**Exercise Type:** ${data.exerciseType}\n`;
      markdown += `**Language:** ${data.language || 'Unknown'}\n`;
      markdown += `**URL:** ${data.url}\n`;
      markdown += `**Extracted:** ${new Date(data.timestamp).toLocaleString()}\n\n`;
    } else {
      markdown += `**Type:** ${data.type}\n`;
      markdown += `**Exercise Type:** ${data.exerciseType}\n`;
      markdown += `**Language:** ${data.language || 'Unknown'}\n\n`;
    }

    markdown += `## Description\n${data.description || 'Not found'}\n\n`;

    if (data.requirements && data.requirements.length > 0) {
      markdown += `## Requirements\n\n`;
      data.requirements.forEach((req, i) => {
        markdown += `${i + 1}. ${req}\n`;
      });
      markdown += '\n';
    }

    // Interview-specific content
    if (isInterview) {
      if (data.interviewMessages && data.interviewMessages.length > 0) {
        markdown += `## Interview Transcript\n\n`;
        data.interviewMessages.forEach(msg => {
          markdown += `### ${msg.speaker}\n\n`;
          markdown += `${msg.content}\n\n`;
        });
      }

      if (data.expectedPoints && data.expectedPoints.length > 0) {
        markdown += `## Official Solution\n\n`;
        data.expectedPoints.forEach(point => {
          markdown += `${point.index}. ${point.point}\n`;
        });
        markdown += '\n';
      } else if (data.solution && !data.solution.includes('not available')) {
        markdown += `## Official Solution\n\n${data.solution}\n\n`;
      }
    } else {
      // Coding exercise content
      if (data.allFiles && data.allFiles.length > 0) {
        markdown += `## Code Files\n\n`;
        data.allFiles.forEach(file => {
          const lang = file.language || data.language || '';
          markdown += `### ${file.fileName}\n\n`;
          markdown += `\`\`\`${lang}\n${file.code}\n\`\`\`\n\n`;
        });
      } else {
        const lang = data.language || 'python';
        markdown += `## Starter Code\n\`\`\`${lang}\n${data.starterCode || 'Not found'}\n\`\`\`\n\n`;
        markdown += `## Test Code\n\`\`\`${lang}\n${data.testCode || 'Not found'}\n\`\`\`\n\n`;
      }

      if (data.userCode && data.userCode !== data.starterCode && data.userCode.trim() !== 'pass') {
        const lang = data.language || 'python';
        markdown += `## My Solution Attempt\n\`\`\`${lang}\n${data.userCode}\n\`\`\`\n\n`;
      }

      if (data.solution && !data.solution.includes('not available')) {
        const lang = data.language || 'python';
        markdown += `## Official Solution\n\`\`\`${lang}\n${data.solution}\n\`\`\`\n\n`;
      }
    }

    markdown += `---\n*Extracted with Boot.dev Content Extractor v${version}*\n`;
    return markdown;
  } else if (format === 'text') {
    let text = `${data.title || 'Boot.dev Content'}\n${'='.repeat(50)}\n\n`;

    if (includeMetadata) {
      text += `Type: ${data.type}\n`;
      text += `Exercise Type: ${data.exerciseType}\n`;
      text += `Language: ${data.language || 'Unknown'}\n`;
      text += `URL: ${data.url}\n`;
      text += `Extracted: ${new Date(data.timestamp).toLocaleString()}\n\n`;
    } else {
      text += `Type: ${data.type}\n`;
      text += `Exercise Type: ${data.exerciseType}\n`;
      text += `Language: ${data.language || 'Unknown'}\n\n`;
    }

    text += `DESCRIPTION:\n${data.description || 'Not found'}\n\n`;

    if (data.requirements && data.requirements.length > 0) {
      text += `REQUIREMENTS:\n`;
      data.requirements.forEach((req, i) => {
        text += `${i + 1}. ${req}\n`;
      });
      text += '\n';
    }

    // Interview-specific content
    if (isInterview) {
      if (data.interviewMessages && data.interviewMessages.length > 0) {
        text += `INTERVIEW TRANSCRIPT:\n\n`;
        data.interviewMessages.forEach(msg => {
          text += `[${msg.speaker}]\n${msg.content}\n\n`;
        });
      }

      if (data.expectedPoints && data.expectedPoints.length > 0) {
        text += `OFFICIAL SOLUTION:\n`;
        data.expectedPoints.forEach(point => {
          text += `${point.index}. ${point.point}\n`;
        });
        text += '\n';
      } else if (data.solution && !data.solution.includes('not available')) {
        text += `OFFICIAL SOLUTION:\n${data.solution}\n\n`;
      }
    } else {
      // Coding exercise content
      if (data.allFiles && data.allFiles.length > 0) {
        text += `CODE FILES:\n\n`;
        data.allFiles.forEach(file => {
          text += `${file.fileName}:\n${file.code}\n\n`;
        });
      } else {
        text += `STARTER CODE:\n${data.starterCode || 'Not found'}\n\n`;
        text += `TEST CODE:\n${data.testCode || 'Not found'}\n\n`;
      }

      if (data.userCode && data.userCode !== data.starterCode && data.userCode.trim() !== 'pass') {
        text += `MY SOLUTION ATTEMPT:\n${data.userCode}\n\n`;
      }

      if (data.solution && !data.solution.includes('not available')) {
        text += `OFFICIAL SOLUTION:\n${data.solution}\n\n`;
      }
    }

    text += `${'='.repeat(50)}\nExtracted with Boot.dev Content Extractor v${version}\n`;
    return text;
  }
}

// Download file
function downloadFile(content, filename, format) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Extract content
async function extractContent() {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  try {
    const response = await api.tabs.sendMessage(tab.id, { action: 'extract' });

    if (response && response.success && response.data) {
      currentData = response.data;
      document.getElementById('statusText').textContent = 'Content extracted successfully!';

      const preview = document.getElementById('preview');
      preview.style.display = 'block';

      let previewText = `Title: ${currentData.title || 'N/A'}\nType: ${currentData.type}\nExercise Type: ${currentData.exerciseType}\nLanguage: ${currentData.language || 'Unknown'}`;

      if (currentData.exerciseType === 'interview') {
        const msgCount = currentData.interviewMessages?.length || 0;
        previewText += `\nInterview Messages: ${msgCount}`;
        if (currentData.expectedPoints?.length > 0) {
          previewText += `\nExpected Points: ${currentData.expectedPoints.length}`;
        }
      } else if (currentData.allFiles && currentData.allFiles.length > 0) {
        previewText += `\nFiles: ${currentData.allFiles.map(f => f.fileName).join(', ')}`;
      }

      preview.textContent = previewText;

      return true;
    } else {
      throw new Error('Failed to extract content');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    document.getElementById('error').textContent = 'Error extracting content. Try refreshing the page.';
    document.getElementById('error').style.display = 'block';
    return false;
  }
}

// Send to Notion
async function handleNotionExport() {
  // Extract content if not already done
  if (!currentData) {
    const extracted = await extractContent();
    if (!extracted) return;
  }

  // Get Notion settings
  const settings = await api.storage.sync.get({
    notionEnabled: false,
    notionToken: '',
    databases: []
  });

  if (!settings.notionEnabled || !settings.notionToken) {
    document.getElementById('error').textContent = 'Notion not configured. Please configure in Options.';
    document.getElementById('error').style.display = 'block';
    return;
  }

  // Determine which database to use
  const databaseId = getDatabaseIdForType(currentData.type, settings.databases);

  if (!databaseId) {
    document.getElementById('error').textContent = `No database configured for type "${currentData.type}". Please add a database for this type or add an "other" database as fallback in Options.`;
    document.getElementById('error').style.display = 'block';
    return;
  }

  // Show loading state
  const notionBtn = document.getElementById('notionBtn');
  const originalText = notionBtn.textContent;
  notionBtn.textContent = '⏳ Sending to Notion...';
  notionBtn.disabled = true;

  try {
    // Send to Notion
    const result = await NotionAPI.createPage(
      settings.notionToken,
      databaseId,
      currentData,
      api.runtime.getManifest().version
    );

    // Show success
    document.getElementById('statusText').textContent = 'Sent to Notion successfully!';
    notionBtn.textContent = '✓ Sent to Notion!';

    setTimeout(() => {
      notionBtn.textContent = originalText;
      notionBtn.disabled = false;
      document.getElementById('statusText').textContent = 'Ready to extract!';
    }, 3000);

  } catch (error) {
    console.error('Notion export error:', error);
    document.getElementById('error').textContent = `Failed to send to Notion: ${error.message}`;
    document.getElementById('error').style.display = 'block';

    notionBtn.textContent = originalText;
    notionBtn.disabled = false;

    setTimeout(() => {
      document.getElementById('error').style.display = 'none';
    }, 5000);
  }
}

// Download handler
async function handleDownload() {
  if (!currentData) {
    const extracted = await extractContent();
    if (!extracted) return;
  }

  const settings = await api.storage.sync.get({ format: 'markdown' });
  const format = settings.format;

  const content = formatData(currentData, format);
  const extensions = { json: 'json', markdown: 'md', text: 'txt' };
  const ext = extensions[format] || 'txt';

  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedTitle = (currentData.title || 'bootdev-content').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${sanitizedTitle}-${timestamp}.${ext}`;

  downloadFile(content, filename, format);

  document.getElementById('statusText').textContent = 'Downloaded!';
  setTimeout(() => {
    document.getElementById('statusText').textContent = 'Ready to extract!';
  }, 2000);
}

// Copy to clipboard handler
async function handleCopy() {
  if (!currentData) {
    const extracted = await extractContent();
    if (!extracted) return;
  }

  const settings = await api.storage.sync.get({ format: 'markdown' });
  const format = settings.format;
  const content = formatData(currentData, format);

  try {
    await navigator.clipboard.writeText(content);
    document.getElementById('statusText').textContent = 'Copied to clipboard!';
    setTimeout(() => {
      document.getElementById('statusText').textContent = 'Ready to extract!';
    }, 2000);
  } catch (error) {
    document.getElementById('error').textContent = 'Failed to copy to clipboard';
    document.getElementById('error').style.display = 'block';
  }
}

// Event listeners
document.getElementById('extractBtn').addEventListener('click', extractContent);
document.getElementById('notionBtn').addEventListener('click', handleNotionExport);
document.getElementById('downloadBtn').addEventListener('click', handleDownload);
document.getElementById('copyBtn').addEventListener('click', handleCopy);
document.getElementById('optionsBtn').addEventListener('click', () => {
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  } else {
    // Fallback for browsers that don't support openOptionsPage
    window.open(api.runtime.getURL('options.html'));
  }
});

// Initialize
checkPage();
