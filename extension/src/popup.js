// Popup script - Cross-browser compatible with multiple-choice support
// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);

let currentData = null;

// Check if we're on a valid page
async function checkPage() {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!Validator.isValidBootdevPage(tab.url)) {
    document.getElementById('statusText').textContent = Config.MESSAGES.NOT_ON_BOOTDEV;
    document.getElementById('extractBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('notionBtn').disabled = true;
    return false;
  }

  document.getElementById('statusText').textContent = Config.MESSAGES.READY_TO_EXTRACT;
  document.getElementById('status').classList.add('ready');

  // Check if Notion is configured
  await checkNotionConfig();

  return true;
}

// Check Notion configuration
async function checkNotionConfig() {
  const settings = await api.storage.sync.get({
    notionEnabled: Config.DEFAULTS.NOTION_ENABLED,
    notionToken: '',
    databases: []
  });

  const notionBtn = document.getElementById('notionBtn');

  const validation = Validator.validateNotionSettings(settings);

  if (!validation.valid) {
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

// Get file extension for language - NOW USES CONFIG
function getFileExtension(language) {
  return Config.getFileExtension(language);
}

// Format data for download
function formatData(data, format) {
  const includeMetadata = data.includeMetadata !== false;
  const isInterview = data.exerciseType === Config.EXERCISE_TYPES.INTERVIEW;
  const isMultipleChoice = data.exerciseType === Config.EXERCISE_TYPES.MULTIPLE_CHOICE;
  const version = Config.getExtensionVersion();

  if (format === Config.FORMATS.JSON) {
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

    if (isMultipleChoice) {
      jsonData.multipleChoice = data.multipleChoice || null;
    } else if (isInterview) {
      jsonData.interviewMessages = data.interviewMessages || [];
      jsonData.expectedPoints = data.expectedPoints || [];
      jsonData.solution = data.solution || '';
    } else {
      jsonData.allFiles = data.allFiles || [];
      jsonData.userCode = data.userCode || '';
      jsonData.solution = data.solution || '';
    }

    if (includeMetadata) {
      jsonData.url = data.url;
      jsonData.timestamp = data.timestamp;
    }

    return JSON.stringify(jsonData, null, 2);
  } else if (format === Config.FORMATS.MARKDOWN) {
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

    // Multiple-choice specific content
    if (isMultipleChoice && data.multipleChoice) {
      markdown += `## Question\n\n${data.multipleChoice.question}\n\n`;
      markdown += `## Options\n\n`;
      data.multipleChoice.options.forEach(option => {
        const marker = option.isSelected ? '✓' : ' ';
        markdown += `${option.index}. [${marker}] ${option.text}\n`;
      });
      markdown += '\n';

      if (data.multipleChoice.selectedAnswer) {
        markdown += `**Selected Answer:** Option ${data.multipleChoice.selectedAnswer}\n\n`;
      }
    }
    // Interview-specific content
    else if (isInterview) {
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
      }

      if (data.userCode && data.userCode.trim() !== 'pass') {
        const lang = data.language || 'python';
        markdown += `## My Solution Attempt\n\`\`\`${lang}\n${data.userCode}\n\`\`\`\n\n`;
      }

      if (data.solution && !data.solution.includes('not available')) {
        const lang = data.language || 'python';
        markdown += `## Official Solution\n\`\`\`${lang}\n${data.solution}\n\`\`\`\n\n`;
      }
    }

    markdown += `---\n*Extracted with ${Config.EXTENSION_NAME} v${version}*\n`;
    return markdown;
  } else if (format === Config.FORMATS.TEXT) {
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

    // Multiple-choice specific content
    if (isMultipleChoice && data.multipleChoice) {
      text += `QUESTION:\n${data.multipleChoice.question}\n\n`;
      text += `OPTIONS:\n`;
      data.multipleChoice.options.forEach(option => {
        const marker = option.isSelected ? '[X]' : '[ ]';
        text += `${option.index}. ${marker} ${option.text}\n`;
      });
      text += '\n';

      if (data.multipleChoice.selectedAnswer) {
        text += `SELECTED ANSWER: Option ${data.multipleChoice.selectedAnswer}\n\n`;
      }
    }
    // Interview-specific content
    else if (isInterview) {
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
      }

      if (data.userCode && data.userCode.trim() !== 'pass') {
        text += `MY SOLUTION ATTEMPT:\n${data.userCode}\n\n`;
      }

      if (data.solution && !data.solution.includes('not available')) {
        text += `OFFICIAL SOLUTION:\n${data.solution}\n\n`;
      }
    }

    text += `${'='.repeat(50)}\nExtracted with ${Config.EXTENSION_NAME} v${version}\n`;
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
      document.getElementById('statusText').textContent = Config.MESSAGES.EXTRACTION_SUCCESS;

      const preview = document.getElementById('preview');
      preview.style.display = 'block';

      let previewText = `Title: ${currentData.title || 'N/A'}\nType: ${currentData.type}\nExercise Type: ${currentData.exerciseType}\nLanguage: ${currentData.language || 'Unknown'}`;

      if (currentData.exerciseType === Config.EXERCISE_TYPES.MULTIPLE_CHOICE) {
        const optCount = currentData.multipleChoice?.options?.length || 0;
        previewText += `\nQuestion: ${currentData.multipleChoice?.question?.substring(0, 50) || 'N/A'}...\nOptions: ${optCount}`;
      } else if (currentData.exerciseType === Config.EXERCISE_TYPES.INTERVIEW) {
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
    Logger.error('Extraction error:', error);
    document.getElementById('error').textContent = Config.MESSAGES.EXTRACTION_ERROR;
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
    notionEnabled: Config.DEFAULTS.NOTION_ENABLED,
    notionToken: '',
    databases: []
  });

  // Validate settings
  const validation = Validator.validateNotionSettings(settings);
  if (!validation.valid) {
    document.getElementById('error').textContent = Config.MESSAGES.NOTION_NOT_CONFIGURED;
    document.getElementById('error').style.display = 'block';
    Logger.warn('Notion validation failed:', validation.errors);
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
      currentData
    );

    // Show success
    document.getElementById('statusText').textContent = Config.MESSAGES.NOTION_SUCCESS;
    notionBtn.textContent = '✓ Sent to Notion!';

    setTimeout(() => {
      notionBtn.textContent = originalText;
      notionBtn.disabled = false;
      document.getElementById('statusText').textContent = Config.MESSAGES.READY_TO_EXTRACT;
    }, 3000);

  } catch (error) {
    Logger.error('Notion export error:', error);
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

  const settings = await api.storage.sync.get({ format: Config.DEFAULTS.FORMAT });
  const format = settings.format;

  const content = formatData(currentData, format);
  const extensions = {
    [Config.FORMATS.JSON]: 'json',
    [Config.FORMATS.MARKDOWN]: 'md',
    [Config.FORMATS.TEXT]: 'txt'
  };
  const ext = extensions[format] || 'txt';

  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedTitle = Validator.sanitizeFilename(currentData.title || 'bootdev-content');
  const filename = `${sanitizedTitle}-${timestamp}.${ext}`;

  downloadFile(content, filename, format);

  document.getElementById('statusText').textContent = Config.MESSAGES.DOWNLOADED;
  setTimeout(() => {
    document.getElementById('statusText').textContent = Config.MESSAGES.READY_TO_EXTRACT;
  }, 2000);
}

// Copy to clipboard handler
async function handleCopy() {
  if (!currentData) {
    const extracted = await extractContent();
    if (!extracted) return;
  }

  const settings = await api.storage.sync.get({ format: Config.DEFAULTS.FORMAT });
  const format = settings.format;
  const content = formatData(currentData, format);

  try {
    await navigator.clipboard.writeText(content);
    document.getElementById('statusText').textContent = Config.MESSAGES.COPIED_TO_CLIPBOARD;
    setTimeout(() => {
      document.getElementById('statusText').textContent = Config.MESSAGES.READY_TO_EXTRACT;
    }, 2000);
  } catch (error) {
    Logger.error('Copy to clipboard failed:', error);
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
