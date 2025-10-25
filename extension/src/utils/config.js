// Configuration and Constants
// Centralized configuration for the Boot.dev Content Extractor

const Config = {
  // Extension metadata
  EXTENSION_NAME: 'Boot.dev Content Extractor',

  // DOM Selectors - Update these if website structure changes
  SELECTORS: {
    // Main containers
    VIEWER: '.viewer',
    INTERVIEW_SIDE: '#interview-side',

    // Content elements
    TITLE: 'h1',
    CODE_EDITOR: '.cm-content[role="textbox"]',
    CODE_BLOCK: 'pre code',
    COPY_BUTTON: 'button',

    // Interview specific
    INTERVIEW_GRID: 'div',  // Filtered by having img and .viewer
    PROFILE_IMAGE: 'img',

    // Solution
    SOLUTION_BUTTON: 'button', // Contains text "Solution"
    BORDERED_DIV: 'div[class*="border"]',

    // Editor
    EDITOR_ROOT: '.cm-editor, .CodeMirror',
    EDITOR_SCROLLER: '.cm-scroller, .CodeMirror-scroll',
    CODE_LINE: '.CodeMirror-line, .cm-line',
    MERGE_VIEW: '.cm-mergeView',
    MERGE_EDITOR: '.cm-mergeViewEditor .cm-editor',

    // Tabs
    TAB_LIST: 'ul[role="tablist"] button',
  },

  // URL patterns
  URL_PATTERNS: {
    CHALLENGE: '/challenges/',
    LESSON: '/lessons/',
  },

  // Language detection patterns
  LANGUAGES: {
    PYTHON: ['python', '/learn-python'],
    JAVASCRIPT: ['javascript', '/learn-javascript'],
    TYPESCRIPT: ['typescript', '/learn-typescript'],
    GO: ['go', 'golang', '/learn-go'],
    SQL: ['sql', '/learn-sql'],
    C: ['c', '/learn-c'],
    CPP: ['cpp', '/learn-cpp'],
    RUST: ['rust', '/learn-rust'],
    JAVA: ['java', '/learn-java'],
    SHELL: ['shell', '/learn-shell'],
  },

  // File extensions
  FILE_EXTENSIONS: {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    go: 'go',
    sql: 'sql',
    c: 'c',
    cpp: 'cpp',
    rust: 'rs',
    java: 'java',
    shell: 'sh',
    json: 'json',
    yaml: 'yaml',
    markdown: 'md',
    html: 'html',
    css: 'css',
  },

  // Extraction settings
  EXTRACTION: {
    // Code editor scrolling parameters
    SETTLE_AFTER_APPEAR: 220,
    STEP_PX: 200,
    WAIT_MS: 160,
    FORCED_OVERSHOOT: 4000,
    WIGGLE_COUNT: 3,
    WIGGLE_DELAY: 120,
    EDITOR_APPEAR_TIMEOUT: 3000,
    VISIBILITY_POLL_INTERVAL: 80,

    // Tab switching delay
    TAB_SWITCH_DELAY: 400,

    // Text formatting
    INDENT_SPACES: 3,  // Spaces per nesting level
    MAX_NOTION_CHUNK: 1900,  // Notion has 2000 char limit, use 1900 for safety
  },

  // Default values
  DEFAULTS: {
    FORMAT: 'markdown',
    EXTRACT_SOLUTION: true,
    INCLUDE_METADATA: true,
    NOTION_ENABLED: false,
    LANGUAGE: 'python',
  },

  // Export formats
  FORMATS: {
    MARKDOWN: 'markdown',
    JSON: 'json',
    TEXT: 'text',
  },

  // Exercise types
  EXERCISE_TYPES: {
    CODING: 'coding',
    INTERVIEW: 'interview',
  },

  // Content types
  CONTENT_TYPES: {
    CHALLENGE: 'challenge',
    LESSON: 'lesson',
  },

  // Speaker identification
  SPEAKERS: {
    BOOTS: 'Boots',
    USER: 'User',
  },

  // Messages
  MESSAGES: {
    NOT_ON_BOOTDEV: 'Not on a Boot.dev challenge or lesson page',
    READY_TO_EXTRACT: 'Ready to extract!',
    EXTRACTION_SUCCESS: 'Content extracted successfully!',
    EXTRACTION_ERROR: 'Error extracting content. Try refreshing the page.',
    SOLUTION_NOT_AVAILABLE: 'Solution not available (not opened yet)',
    SOLUTION_EXTRACTION_FAILED: 'Solution extraction failed',
    NOTION_NOT_CONFIGURED: 'Notion not configured. Please configure in Options.',
    NOTION_SUCCESS: 'Sent to Notion successfully!',
    COPIED_TO_CLIPBOARD: 'Copied to clipboard!',
    DOWNLOADED: 'Downloaded!',
  },

  // Status messages for logging
  LOG: {
    DETECTED_CODING: '💻 Detected coding exercise',
    DETECTED_INTERVIEW: '📝 Detected interview exercise',
    EXTRACTING_INTERVIEW: '🗣️ Extracting interview messages...',
    LOOKING_FOR_SOLUTION: '\n💡 Looking for interview solution...',
    PROCESSING_TAB: '\n🔓 Processing tab #',
    RETURNING_TO_TAB: '\n🔙 Returning to initial tab...',
    SOLUTION_VIEW_DETECTED: '\n💡 Solution view detected – capturing right-side editor...',
  },
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
