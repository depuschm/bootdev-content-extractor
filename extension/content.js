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
    description: '',
    requirements: [],
    examples: [],
    starterCode: '',
    testCode: '',
    notes: [],
    allFiles: [],
    userCode: '',
    solution: '',
    language: 'python' // default fallback
  };

  // Detect programming language from URL or page content
  data.language = detectLanguage(url);

  // Extract from the viewer div (markdown content on the left side)
  const viewerDiv = document.querySelector('.viewer');
  if (viewerDiv) {
    // Get title (h1)
    const titleElement = viewerDiv.querySelector('h1');
    if (titleElement) {
      data.title = titleElement.textContent.trim();
    }

    // Get all paragraphs for description and requirements
    const paragraphs = viewerDiv.querySelectorAll('p');
    const paragraphTexts = [];
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text && text.length > 0) {
        paragraphTexts.push(text);
      }
    });

    if (paragraphTexts.length > 0) {
      // First paragraph is usually the main description
      data.description = paragraphTexts[0];
    }

    // Get requirements/ordered lists
    const orderedLists = viewerDiv.querySelectorAll('ol');
    orderedLists.forEach(ol => {
      const listItems = ol.querySelectorAll('li');
      const requirements = [];
      listItems.forEach(li => {
        const text = li.textContent.trim();
        if (text) {
          requirements.push(text);
        }
      });
      if (requirements.length > 0) {
        data.requirements.push(...requirements);
      }
    });

    // Get unordered lists (notes)
    const unorderedLists = viewerDiv.querySelectorAll('ul');
    unorderedLists.forEach(ul => {
      const listItems = ul.querySelectorAll('li');
      listItems.forEach(li => {
        const text = li.textContent.trim();
        if (text) {
          data.notes.push(text);
        }
      });
    });

    // Get code examples from pre/code blocks and detect their language
    const codeBlocks = viewerDiv.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock, index) => {
      const code = codeBlock.textContent.trim();
      if (code) {
        // Try to detect language from class name
        const className = codeBlock.className;
        let exampleLang = data.language; // default to detected language

        if (className) {
          const langMatch = className.match(/language-(\w+)/);
          if (langMatch) {
            exampleLang = langMatch[1];
          }
        }

        data.examples.push({
          index: index + 1,
          code: code,
          language: exampleLang
        });
      }
    });
  }

  // Extract code from all CodeMirror editors (multiple tabs)
  const allEditors = document.querySelectorAll('.cm-content[role="textbox"]');
  const codeFiles = [];

  allEditors.forEach((editor, index) => {
    let code = '';

    // Method 1: Try to get from CodeMirror state (most reliable)
    try {
      const cmView = editor.cmView?.view;
      if (cmView && cmView.state && cmView.state.doc) {
        code = cmView.state.doc.toString();
      }
    } catch (e) {
      console.log('Method 1 failed:', e);
    }

    // Method 2: Get from visible lines (fallback)
    if (!code) {
      const lines = editor.querySelectorAll('.cm-line');
      const codeLines = [];
      lines.forEach(line => {
        codeLines.push(line.textContent);
      });
      code = codeLines.join('\n');
    }

    // Method 3: Try innerText (last resort)
    if (!code || code.trim() === '') {
      code = editor.innerText || editor.textContent || '';
    }

    // Try to determine which file this is based on the tab
    const tabs = document.querySelectorAll('[role="tab"]');
    let fileName = `file_${index}`;
    let fileLanguage = data.language;

    if (tabs[index]) {
      const tabText = tabs[index].textContent.trim();
      if (tabText) {
        fileName = tabText;
        // Detect language from file extension
        fileLanguage = detectLanguageFromFilename(fileName) || data.language;
      }
    }

    codeFiles.push({
      fileName: fileName,
      code: code,
      language: fileLanguage,
      isActive: editor.closest('.w-full')?.style.display !== 'none'
    });
  });

  // Separate starter code and test code
  const starterFile = codeFiles.find(f =>
    (f.fileName.includes('main') || f.fileName.includes('index') || f.fileName.includes('solution'))
    && !f.fileName.includes('test')
  );
  const testFile = codeFiles.find(f => f.fileName.includes('test'));

  if (starterFile) {
    data.starterCode = starterFile.code;
    data.userCode = starterFile.code;
    data.language = starterFile.language;
  }

  if (testFile) {
    data.testCode = testFile.code;
  }

  // Store all files for reference
  data.allFiles = codeFiles;

  // Try to extract solution if available
  try {
    // Check localStorage for solution
    const storageKey = Object.keys(localStorage).find(key =>
      key.includes('solution') || key.includes('answer')
    );
    if (storageKey) {
      data.solution = localStorage.getItem(storageKey);
    }

    // Check for solution in DOM (might be hidden)
    const solutionElement = document.querySelector('[data-solution], .solution-code, #solution');
    if (solutionElement) {
      data.solution = solutionElement.textContent || solutionElement.innerText;
    }
  } catch (e) {
    console.log('Could not extract solution:', e);
    data.solution = 'Solution not available (click "Solution" button first)';
  }

  return data;
}

// Detect programming language from URL or page content
function detectLanguage(url) {
  // Check URL for course indicators
  if (url.includes('/learn-python') || url.includes('python')) return 'python';
  if (url.includes('/learn-javascript') || url.includes('javascript')) return 'javascript';
  if (url.includes('/learn-typescript') || url.includes('typescript')) return 'typescript';
  if (url.includes('/learn-go') || url.includes('golang')) return 'go';
  if (url.includes('/learn-sql') || url.includes('sql')) return 'sql';
  if (url.includes('/learn-c')) return 'c';
  if (url.includes('/learn-cpp')) return 'cpp';
  if (url.includes('/learn-rust')) return 'rust';
  if (url.includes('/learn-java')) return 'java';
  if (url.includes('/learn-shell')) return 'shell';

  // Try to detect from page title
  const titleElement = document.querySelector('title');
  if (titleElement) {
    const title = titleElement.textContent.toLowerCase();
    if (title.includes('python')) return 'python';
    if (title.includes('javascript')) return 'javascript';
    if (title.includes('typescript')) return 'typescript';
    if (title.includes('golang') || title.includes('go ')) return 'go';
    if (title.includes('sql')) return 'sql';
    if (title.includes('rust')) return 'rust';
    if (title.includes('java')) return 'java';
  }

  // Default to python if can't detect
  return 'python';
}

// Detect language from filename
function detectLanguageFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();

  const extensionMap = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'go': 'go',
    'sql': 'sql',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'rs': 'rust',
    'java': 'java',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'html': 'html',
    'css': 'css'
  };

  return extensionMap[ext] || null;
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

  return languageMap[language.toLowerCase()] || 'txt';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    setTimeout(() => {
      const content = extractContent();
      sendResponse({ success: true, data: content });
    }, 100);
    return true;
  }
});

// Store extracted content automatically
function autoExtract() {
  setTimeout(() => {
    const content = extractContent();
    if (content && (content.title || content.description || content.starterCode)) {
      chrome.storage.local.set({
        lastExtracted: content,
        lastExtractedTime: Date.now()
      });
      console.log('Boot.dev Extractor: Content extracted and stored', content);
    }
  }, 2000);
}

// Auto-extract when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoExtract);
} else {
  autoExtract();
}

// Re-extract when content changes (for SPAs)
let extractTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(extractTimeout);
  extractTimeout = setTimeout(autoExtract, 2000);
});

setTimeout(() => {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}, 2000);
