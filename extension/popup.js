// Popup script
let currentData = null;

// Check if we're on a valid page
async function checkPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes('boot.dev/challenges/') && !tab.url.includes('boot.dev/lessons/')) {
    document.getElementById('statusText').textContent = 'Not on a Boot.dev challenge or lesson page';
    document.getElementById('extractBtn').disabled = true;
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('copyBtn').disabled = true;
    return false;
  }

  document.getElementById('statusText').textContent = 'Ready to extract!';
  return true;
}

// Format data for download
function formatData(data, format) {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else if (format === 'markdown') {
    let markdown = `# ${data.title || 'Boot.dev Content'}

**Type:** ${data.type}
**URL:** ${data.url}
**Extracted:** ${new Date(data.timestamp).toLocaleString()}

## Description
${data.description || 'Not found'}

`;

    if (data.requirements && data.requirements.length > 0) {
      markdown += `## Requirements\n\n`;
      data.requirements.forEach((req, i) => {
        markdown += `${i + 1}. ${req}\n`;
      });
      markdown += '\n';
    }

    if (data.notes && data.notes.length > 0) {
      markdown += `## Notes\n\n`;
      data.notes.forEach(note => {
        markdown += `- ${note}\n`;
      });
      markdown += '\n';
    }

    if (data.examples && data.examples.length > 0) {
      markdown += `## Examples\n\n`;
      data.examples.forEach(example => {
        markdown += `\`\`\`\n${example.code}\n\`\`\`\n\n`;
      });
    }

    // Add all code files if available
    if (data.allFiles && data.allFiles.length > 0) {
      markdown += `## Code Files\n\n`;
      data.allFiles.forEach(file => {
        markdown += `### ${file.fileName}\n\n`;
        markdown += `\`\`\`python\n${file.code}\n\`\`\`\n\n`;
      });
    } else {
      // Fallback to old format
      markdown += `## Starter Code
\`\`\`python
${data.starterCode || 'Not found'}
\`\`\`

## Test Code
\`\`\`python
${data.testCode || 'Not found'}
\`\`\`
`;
    }

    // Add user's current code if different from starter
    if (data.userCode && data.userCode !== data.starterCode && data.userCode.trim() !== 'pass') {
      markdown += `## My Solution Attempt
\`\`\`python
${data.userCode}
\`\`\`

`;
    }

    // Add official solution if available
    if (data.solution && !data.solution.includes('not available')) {
      markdown += `## Official Solution
\`\`\`python
${data.solution}
\`\`\`

`;
    }

    markdown += `---
*Extracted with Boot.dev Content Extractor*
`;
    return markdown;
  } else if (format === 'text') {
    let text = `${data.title || 'Boot.dev Content'}
${'='.repeat(50)}

Type: ${data.type}
URL: ${data.url}
Extracted: ${new Date(data.timestamp).toLocaleString()}

DESCRIPTION:
${data.description || 'Not found'}

`;

    if (data.requirements && data.requirements.length > 0) {
      text += `REQUIREMENTS:\n`;
      data.requirements.forEach((req, i) => {
        text += `${i + 1}. ${req}\n`;
      });
      text += '\n';
    }

    if (data.notes && data.notes.length > 0) {
      text += `NOTES:\n`;
      data.notes.forEach(note => {
        text += `- ${note}\n`;
      });
      text += '\n';
    }

    if (data.examples && data.examples.length > 0) {
      text += `EXAMPLES:\n\n`;
      data.examples.forEach(example => {
        text += `${example.code}\n\n`;
      });
    }

    // Add all code files if available
    if (data.allFiles && data.allFiles.length > 0) {
      text += `CODE FILES:\n\n`;
      data.allFiles.forEach(file => {
        text += `${file.fileName}:\n${file.code}\n\n`;
      });
    } else {
      // Fallback to old format
      text += `STARTER CODE:
${data.starterCode || 'Not found'}

TEST CODE:
${data.testCode || 'Not found'}
`;
    }

    // Add user's current code if different from starter
    if (data.userCode && data.userCode !== data.starterCode && data.userCode.trim() !== 'pass') {
      text += `\nMY SOLUTION ATTEMPT:
${data.userCode}

`;
    }

    // Add official solution if available
    if (data.solution && !data.solution.includes('not available')) {
      text += `\nOFFICIAL SOLUTION:
${data.solution}

`;
    }

    text += `${'='.repeat(50)}
Extracted with Boot.dev Content Extractor
`;
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });

    if (response && response.success && response.data) {
      currentData = response.data;
      document.getElementById('statusText').textContent = 'Content extracted successfully!';

      // Show preview
      const preview = document.getElementById('preview');
      preview.style.display = 'block';

      let previewText = `Title: ${currentData.title || 'N/A'}\nType: ${currentData.type}`;
      if (currentData.allFiles && currentData.allFiles.length > 0) {
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

// Download handler
async function handleDownload() {
  if (!currentData) {
    const extracted = await extractContent();
    if (!extracted) return;
  }

  // Get format preference from storage
  const settings = await chrome.storage.sync.get({ format: 'markdown' });
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

  const settings = await chrome.storage.sync.get({ format: 'markdown' });
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
document.getElementById('downloadBtn').addEventListener('click', handleDownload);
document.getElementById('copyBtn').addEventListener('click', handleCopy);
document.getElementById('optionsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Initialize
checkPage();
