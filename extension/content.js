// Content script that extracts data from Boot.dev pages

function extractContent() {
  const url = window.location.href;
  const isChallenge = url.includes('/challenges/');
  const isLesson = url.includes('/lessons/');

  if (!isChallenge && !isLesson) {
    return null;
  }

  const data = {
    type: isChallenge ? 'challenge' : 'lesson',
    url: url,
    timestamp: new Date().toISOString(),
    title: '',
    task: '',
    question: '',
    givenSolution: '',
    actualSolution: '',
    additionalInfo: {}
  };

  // Extract title
  const titleElement = document.querySelector('h1, h2, [class*="title"]');
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Try to find task/instructions
  const taskSelectors = [
    '[class*="instruction"]',
    '[class*="description"]',
    '[class*="task"]',
    '[class*="prompt"]',
    '.challenge-description',
    '.lesson-content'
  ];

  for (const selector of taskSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      data.task = element.textContent.trim();
      break;
    }
  }

  // Try to find question/problem statement
  const questionSelectors = [
    '[class*="question"]',
    '[class*="problem"]',
    'p'
  ];

  for (const selector of questionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      const questionText = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 20)
        .join('\n\n');
      if (questionText) {
        data.question = questionText;
        break;
      }
    }
  }

  // Extract code blocks (given solution, starter code, etc.)
  const codeBlocks = document.querySelectorAll('pre, code, [class*="editor"], [class*="code"]');
  const codeContents = [];

  codeBlocks.forEach((block, index) => {
    const code = block.textContent.trim();
    if (code.length > 0) {
      codeContents.push({
        index: index,
        content: code,
        language: block.className || 'unknown'
      });
    }
  });

  if (codeContents.length > 0) {
    data.givenSolution = codeContents[0].content;
    if (codeContents.length > 1) {
      data.actualSolution = codeContents[codeContents.length - 1].content;
    }
  }

  // Try to find Monaco Editor or CodeMirror instances
  const editors = document.querySelectorAll('[class*="monaco"], [class*="CodeMirror"]');
  if (editors.length > 0) {
    editors.forEach((editor, index) => {
      const editorCode = editor.textContent.trim();
      if (editorCode) {
        if (index === 0) {
          data.givenSolution = editorCode;
        } else {
          data.actualSolution = editorCode;
        }
      }
    });
  }

  // Store all text content as fallback
  data.additionalInfo.allCodeBlocks = codeContents;
  data.additionalInfo.pageText = document.body.textContent.trim().substring(0, 5000);

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const content = extractContent();
    sendResponse({ success: true, data: content });
  }
  return true;
});

// Store extracted content automatically
function autoExtract() {
  const content = extractContent();
  if (content) {
    chrome.storage.local.set({
      lastExtracted: content,
      lastExtractedTime: Date.now()
    });
  }
}

// Auto-extract when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoExtract);
} else {
  autoExtract();
}

// Re-extract when content changes (for dynamic pages)
const observer = new MutationObserver(() => {
  clearTimeout(window.extractTimeout);
  window.extractTimeout = setTimeout(autoExtract, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
