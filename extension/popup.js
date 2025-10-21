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
    return `# ${data.title || 'Boot.dev Content'}

**Type:** ${data.type}
**URL:** ${data.url}
**Extracted:** ${new Date(data.timestamp).toLocaleString()}

## Task/Description
${data.task || 'Not found'}

## Question/Problem
${data.question || 'Not found'}

## Given Solution/Starter Code
\`\`\`
${data.givenSolution || 'Not found'}
\`\`\`

## Actual Solution
\`\`\`
${data.actualSolution || 'Not found'}
\`\`\`

---
*Extracted with Boot.dev Content Extractor*
`;
  } else if (format === 'text') {
    return `${data.title || 'Boot.dev Content'}
${'='.repeat(50)}

Type: ${data.type}
URL: ${data.url}
Extracted: ${new Date(data.timestamp).toLocaleString()}

TASK/DESCRIPTION:
${data.task || 'Not found'}

QUESTION/PROBLEM:
${data.question || 'Not found'}

GIVEN SOLUTION/STARTER CODE:
${data.givenSolution || 'Not found'}

ACTUAL SOLUTION:
${data.actualSolution || 'Not found'}

${'='.repeat(50)}
Extracted with Boot.dev Content Extractor
`;
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
      preview.textContent = `Title: ${currentData.title || 'N/A'}\nType: ${currentData.type}`;

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
