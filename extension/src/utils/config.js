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

    // Free-text specific
    FREE_TEXT_TEXTAREA: 'textarea[aria-label="Lesson answer"]',
    FREE_TEXT_CHECKS: 'ol.list-inside.list-decimal',
    FREE_TEXT_TOGGLE: 'button:has(.lucide-eye)',

    // Multiple-choice specific
    MULTIPLE_CHOICE_CONTAINER: '.viewer-mcq',

    // CLI specific
    CLI_COMMAND_CONTAINER: 'p.font-mono',
    CLI_CHECKS_LIST: 'ol.list-inside.list-decimal',
    CLI_CHECK_COMMAND: 'span.font-mono.font-bold',
    CLI_CHECK_EXPECTED: 'ul.ml-4.list-inside.list-disc',

    // Chat specific
    CHAT_BUTTONS: 'button.rounded-full.border.px-2\\.5.py-1',
    CHAT_CONTAINER: '.pb-4',
    CHAT_MESSAGE_GRID: '.grid.grid-cols-\\[50px_minmax\\(0\\,1fr\\)\\]',
    CHAT_VIEWER: '.viewer',
    CHAT_PROFILE_IMG: 'img[alt="Boots"]',
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

  // Language to file extension mapping (bidirectional)
  LANGUAGE_EXTENSIONS: {
    // Programming languages
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
    'bash': 'sh',
    // Markup/Data languages
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'markdown': 'md',
    'html': 'html',
    'css': 'css',
    'xml': 'xml',
  },

  // File extension to language mapping (reverse lookup)
  EXTENSION_TO_LANGUAGE: {
    'py': 'python',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'go': 'go',
    'sql': 'sql',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'rs': 'rust',
    'java': 'java',
    'sh': 'shell',
    'bash': 'bash',
    'zsh': 'shell',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'markdown': 'markdown',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'xml': 'xml',
  },

  // Notion API language mapping
  // Complete list of languages supported by Notion API (as of version 2022-06-28)
  NOTION_LANGUAGES: {
    // Boot.dev common languages
    'python': 'python',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'go': 'go',
    'sql': 'sql',
    'c': 'c',
    'cpp': 'c++',
    'c++': 'c++',
    'rust': 'rust',
    'java': 'java',
    'shell': 'shell',
    'bash': 'bash',
    'json': 'json',
    'yaml': 'yaml',
    'markdown': 'markdown',
    'html': 'html',
    'css': 'css',

    // Additional Notion-supported languages
    'abap': 'abap',
    'arduino': 'arduino',
    'basic': 'basic',
    'clojure': 'clojure',
    'coffeescript': 'coffeescript',
    'csharp': 'c#',
    'c#': 'c#',
    'dart': 'dart',
    'diff': 'diff',
    'docker': 'docker',
    'dockerfile': 'docker',
    'elixir': 'elixir',
    'elm': 'elm',
    'erlang': 'erlang',
    'flow': 'flow',
    'fortran': 'fortran',
    'fsharp': 'f#',
    'f#': 'f#',
    'gherkin': 'gherkin',
    'glsl': 'glsl',
    'graphql': 'graphql',
    'groovy': 'groovy',
    'haskell': 'haskell',
    'julia': 'julia',
    'kotlin': 'kotlin',
    'latex': 'latex',
    'tex': 'latex',
    'less': 'less',
    'lisp': 'lisp',
    'livescript': 'livescript',
    'lua': 'lua',
    'makefile': 'makefile',
    'make': 'makefile',
    'markup': 'markup',
    'matlab': 'matlab',
    'mermaid': 'mermaid',
    'nix': 'nix',
    'objective-c': 'objective-c',
    'objc': 'objective-c',
    'ocaml': 'ocaml',
    'pascal': 'pascal',
    'perl': 'perl',
    'php': 'php',
    'plaintext': 'plain text',
    'plain text': 'plain text',
    'text': 'plain text',
    'powershell': 'powershell',
    'ps1': 'powershell',
    'prolog': 'prolog',
    'protobuf': 'protobuf',
    'proto': 'protobuf',
    'r': 'r',
    'reason': 'reason',
    'ruby': 'ruby',
    'rb': 'ruby',
    'sass': 'sass',
    'scala': 'scala',
    'scheme': 'scheme',
    'scss': 'scss',
    'swift': 'swift',
    'vb.net': 'vb.net',
    'vbnet': 'vb.net',
    'verilog': 'verilog',
    'vhdl': 'vhdl',
    'visual basic': 'visual basic',
    'vb': 'visual basic',
    'webassembly': 'webassembly',
    'wasm': 'webassembly',
    'xml': 'xml',
    'java/c/c++/c#': 'java/c/c++/c#'
  },

  // Language display name special cases
  LANGUAGE_DISPLAY_NAMES: {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'c++': 'C++',
    'cpp': 'C++',
    'c#': 'C#',
    'csharp': 'C#',
    'f#': 'F#',
    'fsharp': 'F#',
    'sql': 'SQL',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'yaml': 'YAML',
    'xml': 'XML',
    'php': 'PHP',
    'graphql': 'GraphQL',
    'glsl': 'GLSL',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'vhdl': 'VHDL',
    'vb.net': 'VB.NET',
    'vbnet': 'VB.NET',
    'objective-c': 'Objective-C',
    'objc': 'Objective-C',
    'ocaml': 'OCaml',
    'webassembly': 'WebAssembly',
    'wasm': 'WebAssembly',
    'coffeescript': 'CoffeeScript',
    'livescript': 'LiveScript',
    'powershell': 'PowerShell',
    'ps1': 'PowerShell',
    'protobuf': 'Protocol Buffers',
    'proto': 'Protocol Buffers',
    'dockerfile': 'Dockerfile',
    'makefile': 'Makefile',
    'plain text': 'Plain Text',
    'plaintext': 'Plain Text',
    'text': 'Plain Text',
    'abap': 'ABAP',
    'matlab': 'MATLAB',
    'latex': 'LaTeX',
    'tex': 'LaTeX'
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
  },

  // Default values
  DEFAULTS: {
    FORMAT: 'markdown',
    EXTRACT_SOLUTION: true,
    INCLUDE_METADATA: true,
    EXTRACT_CHATS: true,
    NOTION_ENABLED: false,
    LANGUAGE: 'unknown',
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
    MULTIPLE_CHOICE: 'multiple-choice',
    FREE_TEXT: 'free-text',
    CLI: 'cli',
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
    DETECTED_INTERVIEW: '🎙️ Detected interview exercise',
    DETECTED_MULTIPLE_CHOICE: '✅ Detected multiple-choice exercise',
    DETECTED_FREE_TEXT: '📝 Detected free-text exercise',
    DETECTED_CLI: '⌨️ Detected CLI exercise',
    EXTRACTING_INTERVIEW: '🗣️ Extracting interview messages...',
    EXTRACTING_MULTIPLE_CHOICE: '📋 Extracting multiple-choice question...',
    EXTRACTING_FREE_TEXT: '✏️ Extracting free-text question...',
    EXTRACTING_CLI: '💻 Extracting CLI commands...',
    EXTRACTING_CHATS: '💬 Extracting chat conversations...',
    LOOKING_FOR_SOLUTION: '\n💡 Looking for interview solution...',
    PROCESSING_TAB: '\n📂 Processing tab #',
    RETURNING_TO_TAB: '\n🔙 Returning to initial tab...',
    SOLUTION_VIEW_DETECTED: '\n💡 Solution view detected – capturing right-side editor...',
  },

  // Helper functions
  /**
   * Get file extension for a language
   * @param {string} language - Language name
   * @returns {string} File extension
   */
  getFileExtension(language) {
    return this.LANGUAGE_EXTENSIONS[language?.toLowerCase()] || 'txt';
  },

  /**
   * Detect language from filename extension
   * @param {string} filename - Filename with extension
   * @returns {string|null} Language name or null if not found
   */
  detectLanguageFromFilename(filename) {
    if (!filename) return null;
    const ext = filename.split('.').pop()?.toLowerCase();
    return this.EXTENSION_TO_LANGUAGE[ext] || null;
  },

  /**
   * Map language name to Notion API format
   * @param {string} language - Language name
   * @returns {string} Notion API language identifier
   */
  mapLanguageToNotion(language) {
    return this.NOTION_LANGUAGES[language?.toLowerCase()] || 'plain text';
  },

  /**
   * Get display name for a language
   * @param {string} language - Language name
   * @returns {string} Properly capitalized display name
   */
  getLanguageDisplayName(language) {
    const lower = language?.toLowerCase();
    if (this.LANGUAGE_DISPLAY_NAMES[lower]) {
      return this.LANGUAGE_DISPLAY_NAMES[lower];
    }
    return language ? language.charAt(0).toUpperCase() + language.slice(1).toLowerCase() : 'Unknown';
  },

  /**
   * Get extension version from manifest
   * @returns {string} Extension version number
   */
  getExtensionVersion() {
    const api = window.browserAPI || (typeof browser !== 'undefined' ? browser : chrome);
    return api.runtime.getManifest().version;
  },
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
