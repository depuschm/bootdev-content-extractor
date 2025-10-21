// Content script that extracts data from Boot.dev pages
// Cross-browser compatible version

// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || browser || chrome;

// Extract code from a single editor using advanced scrolling technique
async function extractCodeFromEditor(editor, config = {}) {
  const {
    settleAfterAppear = 220,
    stepPx = 200,
    waitMs = 160,
    forcedOvershoot = 4000,
    wiggleCount = 3,
    wiggleDelay = 120,
    editorAppearTimeout = 3000,
    visibilityPollInterval = 80
  } = config;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const now = () => performance.now();

  let code = '';

  // Method 1: Access CodeMirror 6 state directly (BEST - no scrolling needed!)
  try {
    let editorView = null;

    // Try multiple ways to find the EditorView instance
    if (editor.cmView) {
      editorView = editor.cmView.view;
    } else if (editor.CodeMirror) {
      editorView = editor.CodeMirror;
    } else if (editor.parentElement) {
      editorView = editor.parentElement.cmView?.view;
    }

    // Walk up the DOM tree to find the EditorView
    if (!editorView) {
      let element = editor;
      while (element && !editorView) {
        if (element.cmView && element.cmView.view) {
          editorView = element.cmView.view;
          break;
        }
        element = element.parentElement;
      }
    }

    if (editorView && editorView.state && editorView.state.doc) {
      code = editorView.state.doc.toString();
      console.log('✅ EditorView.state.doc:', code.length, 'characters');
      return code;
    }
  } catch (e) {
    console.log('Method 1 (EditorView.state.doc) failed:', e);
  }

  // Method 2: Advanced force-scroll extraction
  console.log('Using advanced scroll extraction...');

  const root = editor.closest('.cm-editor, .CodeMirror') || editor;
  const scrollEl = root.querySelector('.cm-scroller, .CodeMirror-scroll') || root;

  // Reset scroll position
  scrollEl.scrollTop = 0;
  await sleep(settleAfterAppear);

  // Wait for editor to appear if needed
  const startWait = now();
  while ((scrollEl.clientHeight || 0) <= 2 && now() - startWait < editorAppearTimeout) {
    await sleep(visibilityPollInterval);
  }

  // Calculate scroll range
  const reportedMax = Math.max(0, (scrollEl.scrollHeight || 0) - (scrollEl.clientHeight || 0));
  const maxScroll = Math.max(reportedMax, forcedOvershoot);

  console.log(`    → Scrolling: clientHeight=${scrollEl.clientHeight}, maxScroll=${maxScroll}`);

  // Helper to capture rendered lines
  const captureLines = () => {
    const lines = Array.from(root.querySelectorAll('.CodeMirror-line, .cm-line'));
    return lines.map(el => el.textContent ?? '');
  };

  // Scroll through editor to render all lines
  let prevCount = -1, stableCounter = 0, lastCaptured = [];
  const maxStable = 2;

  for (let y = 0; y <= maxScroll; y += stepPx) {
    scrollEl.scrollTop = Math.min(y, maxScroll);
    await sleep(waitMs);

    const lines = captureLines();
    if (lines.length !== prevCount) {
      prevCount = lines.length;
      stableCounter = 0;
    } else if (++stableCounter >= maxStable) {
      lastCaptured = lines;
      break;
    }
    lastCaptured = lines;
  }

  // Wiggle scroll to finalize rendering
  scrollEl.scrollTop = maxScroll;
  for (let i = 0; i < wiggleCount; i++) {
    scrollEl.scrollTop = Math.max(0, maxScroll - 50 * (i + 1));
    await sleep(wiggleDelay);
    lastCaptured = captureLines();
    scrollEl.scrollTop = maxScroll;
    await sleep(wiggleDelay);
    lastCaptured = captureLines();
  }

  // Sort lines by visual order
  const nodes = Array.from(root.querySelectorAll('.CodeMirror-line, .cm-line'));
  const ordered = nodes
    .map(n => ({ text: n.textContent ?? '', y: n.offsetTop || 0 }))
    .sort((a, b) => a.y - b.y)
    .map(o => o.text);

  code = (ordered.length ? ordered : lastCaptured).join('\n');

  // Reset scroll position
  scrollEl.scrollTop = 0;

  console.log('✅ Scroll extraction:', code.split('\n').length, 'lines,', code.length, 'characters');
  return code;
}

async function extractContent() {
  const url = window.location.href;
  const isChallenge = url.includes('/challenges/');
  const isLesson = url.includes('/lessons/');

  if (!isChallenge && !isLesson) {
    return null;
  }

  // Get settings - use Promise-based API
  const settings = await api.storage.sync.get({
    extractSolution: true,
    includeMetadata: true
  });

  const data = {
    type: isChallenge ? 'challenge' : 'lesson',
    url: settings.includeMetadata ? url : '',
    timestamp: settings.includeMetadata ? new Date().toISOString() : '',
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
    language: 'python',
    includeMetadata: settings.includeMetadata
  };

  // Detect programming language
  data.language = detectLanguage(url);

  // Extract viewer content (left side)
  await extractViewerContent(data);

  // Extract code from all tabs
  await extractAllTabs(data);

  // Extract solution if enabled and available
  if (settings.extractSolution) {
    await extractSolution(data);
  }

  return data;
}

// Extract content from the viewer div
async function extractViewerContent(data) {
  const viewerDiv = document.querySelector('.viewer');
  if (!viewerDiv) return;

  // Get title
  const titleElement = viewerDiv.querySelector('h1');
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Get paragraphs
  const paragraphs = viewerDiv.querySelectorAll('p');
  const paragraphTexts = [];
  paragraphs.forEach(p => {
    const text = p.textContent.trim();
    if (text && text.length > 0) {
      paragraphTexts.push(text);
    }
  });

  if (paragraphTexts.length > 0) {
    data.description = paragraphTexts[0];
  }

  // Get requirements (ordered lists)
  const orderedLists = viewerDiv.querySelectorAll('ol');
  orderedLists.forEach(ol => {
    const listItems = ol.querySelectorAll('li');
    listItems.forEach(li => {
      const text = li.textContent.trim();
      if (text) data.requirements.push(text);
    });
  });

  // Get notes (unordered lists)
  const unorderedLists = viewerDiv.querySelectorAll('ul');
  unorderedLists.forEach(ul => {
    const listItems = ul.querySelectorAll('li');
    listItems.forEach(li => {
      const text = li.textContent.trim();
      if (text) data.notes.push(text);
    });
  });

  // Get code examples
  const codeBlocks = viewerDiv.querySelectorAll('pre code');
  codeBlocks.forEach((codeBlock, index) => {
    const code = codeBlock.textContent.trim();
    if (code) {
      const className = codeBlock.className;
      let exampleLang = data.language;

      if (className) {
        const langMatch = className.match(/language-(\w+)/);
        if (langMatch) exampleLang = langMatch[1];
      }

      data.examples.push({
        index: index + 1,
        code: code,
        language: exampleLang
      });
    }
  });
}

// Extract code from all editor tabs
async function extractAllTabs(data) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Find all tab buttons
  const tabButtons = Array.from(document.querySelectorAll('ul[role="tablist"] button'));
  const initialTab = tabButtons.find(b => b.getAttribute('aria-selected') === 'true') || tabButtons[0];

  console.log(`Found ${tabButtons.length} tabs`);

  const codeFiles = [];
  const processed = new Set();

  // Process each tab
  for (let i = 0; i < tabButtons.length; i++) {
    const btn = tabButtons[i];
    console.log(`\n🔒 Processing tab #${i + 1}...`);

    // Click tab to activate it
    btn.click();
    await sleep(400); // Wait for tab to activate

    // Find visible editor
    const allEditors = document.querySelectorAll('.cm-content[role="textbox"]');
    let editor = null;

    for (const ed of allEditors) {
      if (!processed.has(ed) && isEditorVisible(ed)) {
        editor = ed;
        break;
      }
    }

    if (!editor && allEditors[i] && !processed.has(allEditors[i])) {
      editor = allEditors[i];
    }

    if (!editor) continue;

    processed.add(editor);

    // Extract code from this editor
    const code = await extractCodeFromEditor(editor);

    // Get tab name
    let fileName = `file_${i}`;
    let fileLanguage = data.language;

    if (tabButtons[i]) {
      const tabText = tabButtons[i].textContent.trim();
      if (tabText) {
        fileName = tabText;
        fileLanguage = detectLanguageFromFilename(fileName) || data.language;
      }
    }

    codeFiles.push({
      fileName: fileName,
      code: code,
      language: fileLanguage,
      isActive: i === tabButtons.findIndex(b => b === initialTab)
    });

    console.log(`  ✅ Captured: ${fileName} (${code.split('\n').length} lines)`);
  }

  // Return to initial tab
  if (initialTab) {
    console.log('\n🔙 Returning to initial tab...');
    initialTab.click();
    await sleep(400);
  }

  // Store all files
  data.allFiles = codeFiles;

  // Separate starter and test code
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
}

// Extract solution code if available
async function extractSolution(data) {
  try {
    // Check for solution in merge view (split view)
    const mergeView = document.querySelector('.cm-mergeView');
    if (mergeView) {
      const editors = mergeView.querySelectorAll('.cm-mergeViewEditor .cm-editor');
      if (editors.length >= 2) {
        console.log('\n💡 Solution view detected – capturing right-side editor...');
        const rightEditor = editors[1];
        const solutionCode = await extractCodeFromEditor(rightEditor);

        if (solutionCode && solutionCode.trim()) {
          data.solution = solutionCode;
          console.log(`  ✅ Captured solution: ${solutionCode.split('\n').length} lines`);
          return;
        }
      }
    }

    // Fallback: Check localStorage
    const storageKey = Object.keys(localStorage).find(key =>
      key.includes('solution') || key.includes('answer')
    );
    if (storageKey) {
      const storedSolution = localStorage.getItem(storageKey);
      if (storedSolution) {
        data.solution = storedSolution;
        return;
      }
    }

    // Fallback: Check DOM
    const solutionElement = document.querySelector('[data-solution], .solution-code, #solution');
    if (solutionElement) {
      const solutionText = solutionElement.textContent || solutionElement.innerText;
      if (solutionText && solutionText.trim()) {
        data.solution = solutionText;
        return;
      }
    }

    data.solution = 'Solution not available (open solution view first)';
  } catch (e) {
    console.log('Could not extract solution:', e);
    data.solution = 'Solution extraction failed';
  }
}

// Check if editor is visible
function isEditorVisible(editor) {
  if (!editor) return false;
  const rect = editor.getBoundingClientRect();
  const style = window.getComputedStyle(editor);

  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  if (rect.width <= 2 || rect.height <= 2) {
    return false;
  }

  return true;
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

// Listen for messages from popup - cross-browser compatible
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    // Use async function and sendResponse
    extractContent().then(content => {
      sendResponse({ success: true, data: content });
    }).catch(error => {
      console.error('Extraction error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});
