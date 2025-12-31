// Content script that extracts data from Boot.dev pages
// Cross-browser compatible version with interview, multiple-choice, free-text, CLI, chat support, auto-open solution, and rating extraction

// Get the correct API (browser or chrome wrapped in Promise)
const api = window.browserAPI || browser || chrome;

// Helper function to wait for animation frames
async function waitForFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

// Helper function to wait for element to appear or change
async function waitForElement(selector, options = {}) {
  const {
    timeout = Config.TIMEOUTS.ELEMENT_APPEAR,
    checkInterval = Config.TIMEOUTS.VISIBILITY_POLL,
    condition = null
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = typeof selector === 'function' ? selector() : document.querySelector(selector);

    if (element) {
      // If there's a condition function, check it
      if (condition && !condition(element)) {
        await new Promise(r => setTimeout(r, checkInterval));
        continue;
      }
      return element;
    }

    await new Promise(r => setTimeout(r, checkInterval));
  }

  return null;
}

// Extract rating from the page (1-5 stars, or 0 if not rated yet)
function extractRating() {
  try {
    // Look for the rating container with aria-label="Rate this challenge"
    const ratingContainer = document.querySelector('[aria-label="Rate this challenge"]');
    if (!ratingContainer) {
      Logger.debug('Rating container not found');
      return 0;
    }

    // Count filled stars (stars with fill="currentColor")
    const filledStars = ratingContainer.querySelectorAll('span[fill="currentColor"]');
    const rating = filledStars.length;

    Logger.extraction('Rating', { stars: rating });
    return rating;
  } catch (e) {
    Logger.error('Error extracting rating:', e);
    return 0;
  }
}

// Helper function to find and click solution button
async function autoOpenSolution(exerciseType) {
  Logger.emoji(Config.LOG.AUTO_OPENING_SOLUTION);

  try {
    let solutionButton = null;
    let waitForCondition = null;

    if (exerciseType === Config.EXERCISE_TYPES.INTERVIEW) {
      // For interview exercises, look for "Show Solution" button
      const interviewSide = document.querySelector(Config.SELECTORS.INTERVIEW_SIDE);
      if (interviewSide) {
        const buttons = Array.from(interviewSide.querySelectorAll('button'));
        solutionButton = buttons.find(btn => {
          const text = btn.textContent.trim();
          return text.includes('Show Solution') || (text.includes('Solution') && text.includes('Show'));
        });

        // Wait for the solution div with acceptance criteria to appear
        waitForCondition = async () => {
          return await waitForElement(() => {
            const borderedDivs = interviewSide.querySelectorAll('.rounded-sm.border');
            for (const div of borderedDivs) {
              const text = div.textContent.trim();
              if (text.toLowerCase().includes('expecting') ||
                text.toLowerCase().includes('acceptance criteria')) {
                return div;
              }
            }
            return null;
          }, { timeout: Config.TIMEOUTS.SOLUTION_LOAD });
        };
      }
    } else if (exerciseType === Config.EXERCISE_TYPES.FREE_TEXT) {
      // For free-text exercises, look for eye icon toggle button
      solutionButton = document.querySelector(Config.SELECTORS.FREE_TEXT_TOGGLE);
      if (solutionButton) {
        const buttonText = solutionButton.textContent.trim();
        // Only click if it says "Show" (not "Hide")
        if (buttonText.includes('Hide')) {
          // Already visible
          solutionButton = null;
        } else {
          // Wait for checks list to appear
          waitForCondition = async () => {
            return await waitForElement(Config.SELECTORS.FREE_TEXT_CHECKS, {
              timeout: Config.TIMEOUTS.SOLUTION_LOAD
            });
          };
        }
      }
    } else if (exerciseType === Config.EXERCISE_TYPES.CODING) {
      // For coding exercises, look for "Solution" button in editor area
      const buttons = Array.from(document.querySelectorAll('button'));
      solutionButton = buttons.find(btn => {
        const text = btn.textContent.trim();
        return text === 'Solution' || text.includes('Show Solution') || text.includes('View Solution');
      });

      // Check if solution is already open by checking button class
      if (solutionButton && solutionButton.classList.contains('bg-texture-yellow')) {
        Logger.debug('Solution already open (button is yellow)');
        solutionButton = null; // Don't click - already open
      }

      // Wait for merge view (solution comparison) to appear
      waitForCondition = async () => {
        return await waitForElement(Config.SELECTORS.MERGE_VIEW, {
          timeout: Config.TIMEOUTS.SOLUTION_LOAD
        });
      };
    }

    if (solutionButton) {
      Logger.debug('Found solution button, clicking...');
      solutionButton.click();

      // Check if Seer Stone modal appeared after clicking
      // Look for the modal with Seer Stone image (more reliable than text)
      const seerStoneModal = await waitForElement('dialog[open]', {
        timeout: Config.TIMEOUTS.MODAL_APPEAR,
        condition: (modal) => modal.querySelector('img[src*="seer-stone"]') !== null
      });

      if (seerStoneModal) {
        Logger.warn('Seer Stone modal detected - exercise not yet completed. Closing modal and skipping solution.');

        // Try to find Cancel button first
        const cancelBtn = Array.from(seerStoneModal.querySelectorAll('button')).find(btn =>
          btn.textContent.trim() === 'Cancel'
        );
        if (cancelBtn) {
          cancelBtn.click();
        } else {
          // Fallback: click the X button
          const closeBtn = seerStoneModal.querySelector('button svg.lucide-x');
          if (closeBtn) {
            closeBtn.closest('button').click();
          }
        }

        return false; // Solution not available
      }

      // Wait for the solution content to actually appear
      if (waitForCondition) {
        const element = await waitForCondition();
        if (element) {
          Logger.extraction('Solution opened and content loaded successfully');
          return true;
        } else {
          Logger.warn('Solution button clicked but content did not appear within timeout');
          return true; // Still return true as we clicked the button
        }
      } else {
        Logger.extraction('Solution opened successfully');
        return true;
      }
    } else {
      Logger.debug('No solution button found or solution already open');
      return false;
    }
  } catch (e) {
    Logger.error('Error auto-opening solution:', e);
    return false;
  }
}

// Extract code from a single editor using advanced scrolling technique
async function extractCodeFromEditor(editor, config = {}) {
  const {
    settleAfterAppear = Config.TIMEOUTS.SETTLE_AFTER_APPEAR,
    stepPx = Config.EXTRACTION.STEP_PX,
    waitMs = Config.TIMEOUTS.SCROLL_WAIT,
    forcedOvershoot = Config.EXTRACTION.FORCED_OVERSHOOT,
    wiggleCount = Config.EXTRACTION.WIGGLE_COUNT,
    wiggleDelay = Config.TIMEOUTS.WIGGLE_DELAY,
    editorAppearTimeout = Config.TIMEOUTS.EDITOR_APPEAR,
    visibilityPollInterval = Config.TIMEOUTS.VISIBILITY_POLL
  } = config;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const now = () => performance.now();

  let code = '';

  // Method 1: Access CodeMirror 6 state directly (BEST - no scrolling needed!)
  try {
    let editorView = null;

    // Try multiple ways to find the EditorView instance
    // First check the element itself
    if (editor.cmView?.view) {
      editorView = editor.cmView.view;
    }
    // Check if the element IS the view
    else if (editor.state?.doc) {
      editorView = editor;
    }
    // Check CodeMirror property
    else if (editor.CodeMirror) {
      editorView = editor.CodeMirror;
    }
    // Check parent element
    else if (editor.parentElement?.cmView?.view) {
      editorView = editor.parentElement.cmView.view;
    }

    // Walk up the DOM tree to find the EditorView (up to MAX_DOM_DEPTH levels)
    if (!editorView) {
      let element = editor;
      let depth = 0;
      while (element && !editorView && depth < Config.EXTRACTION.MAX_DOM_DEPTH) {
        if (element.cmView?.view) {
          editorView = element.cmView.view;
          break;
        }
        // Also check if this element has state.doc directly
        if (element.state?.doc) {
          editorView = element;
          break;
        }
        element = element.parentElement;
        depth++;
      }
    }

    if (editorView?.state?.doc) {
      code = editorView.state.doc.toString();
      Logger.debug('✅ EditorView.state.doc:', code.length, 'characters (instant extraction)');
      return code;
    }
  } catch (e) {
    Logger.debug('Method 1 (EditorView.state.doc) failed:', e);
  }

  // Method 2: Advanced force-scroll extraction (FALLBACK)
  Logger.debug('Method 1 failed, using scroll extraction...');

  const root = editor.closest(Config.SELECTORS.EDITOR_ROOT) || editor;
  const scrollEl = root.querySelector(Config.SELECTORS.EDITOR_SCROLLER) || root;

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

  Logger.debug(`    ↓ Scrolling: clientHeight=${scrollEl.clientHeight}, maxScroll=${maxScroll}`);

  // Helper to capture rendered lines
  const captureLines = () => {
    const lines = Array.from(root.querySelectorAll(Config.SELECTORS.CODE_LINE));
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
  const nodes = Array.from(root.querySelectorAll(Config.SELECTORS.CODE_LINE));
  const ordered = nodes
    .map(n => ({ text: n.textContent ?? '', y: n.offsetTop || 0 }))
    .sort((a, b) => a.y - b.y)
    .map(o => o.text);

  code = (ordered.length ? ordered : lastCaptured).join('\n');

  // Reset scroll position
  scrollEl.scrollTop = 0;

  Logger.extraction('Scroll extraction', { lines: code.split('\n').length, chars: code.length });
  return code;
}

async function extractContent() {
  const url = window.location.href;

  // Validate URL
  if (!Validator.isValidBootdevPage(url)) {
    return null;
  }

  const isChallenge = url.includes(Config.URL_PATTERNS.CHALLENGE);
  const isLesson = url.includes(Config.URL_PATTERNS.LESSON);

  // Get settings - use Promise-based API
  const settings = await api.storage.sync.get({
    extractSolution: Config.DEFAULTS.EXTRACT_SOLUTION,
    autoOpenSolution: Config.DEFAULTS.AUTO_OPEN_SOLUTION,
    includeMetadata: Config.DEFAULTS.INCLUDE_METADATA,
    extractChats: Config.DEFAULTS.EXTRACT_CHATS
  });

  const data = {
    type: isChallenge ? Config.CONTENT_TYPES.CHALLENGE : Config.CONTENT_TYPES.LESSON,
    url: settings.includeMetadata ? url : '',
    timestamp: settings.includeMetadata ? new Date().toISOString() : '',
    title: '',
    description: '',
    requirements: [],
    examples: [],
    notes: [],
    allFiles: [],
    userCode: '',
    solution: '',
    language: Config.DEFAULTS.LANGUAGE,
    includeMetadata: settings.includeMetadata,
    exerciseType: Config.EXERCISE_TYPES.CODING,
    interviewMessages: [],
    expectedPoints: [],
    multipleChoice: null,
    freeText: null,
    cli: null,
    chats: [],
    rating: 0  // Add rating field
  };

  // Extract rating first (before any auto-open operations that might change the page)
  data.rating = extractRating();

  // Extract viewer content (left side)
  await extractViewerContent(data);

  // Detect exercise type - Check CLI and free-text FIRST before code editor
  const hasCLI = document.querySelector(Config.SELECTORS.CLI_COMMAND_CONTAINER);
  const hasFreeText = document.querySelector(Config.SELECTORS.FREE_TEXT_TEXTAREA);
  const hasCodeEditor = document.querySelector(Config.SELECTORS.CODE_EDITOR);
  const hasInterview = document.querySelector(Config.SELECTORS.INTERVIEW_SIDE);
  const hasMultipleChoice = document.querySelector(Config.SELECTORS.MULTIPLE_CHOICE_CONTAINER);

  if (hasCLI && !hasCodeEditor && !hasInterview && !hasMultipleChoice && !hasFreeText) {
    // This is a CLI exercise
    data.exerciseType = Config.EXERCISE_TYPES.CLI;
    Logger.emoji(Config.LOG.DETECTED_CLI);
    await extractCLI(data);
  } else if (hasFreeText) {
    // This is a free-text exercise
    data.exerciseType = Config.EXERCISE_TYPES.FREE_TEXT;
    Logger.emoji(Config.LOG.DETECTED_FREE_TEXT);

    // Auto-open solution if enabled
    if (settings.autoOpenSolution && settings.extractSolution) {
      await autoOpenSolution(data.exerciseType);
    }

    await extractFreeText(data, settings);
  } else if (hasMultipleChoice) {
    // This is a multiple-choice exercise
    data.exerciseType = Config.EXERCISE_TYPES.MULTIPLE_CHOICE;
    Logger.emoji(Config.LOG.DETECTED_MULTIPLE_CHOICE);
    await extractMultipleChoice(data, settings);
  } else if (hasInterview && !hasCodeEditor) {
    // This is an interview exercise
    data.exerciseType = Config.EXERCISE_TYPES.INTERVIEW;
    Logger.emoji(Config.LOG.DETECTED_INTERVIEW);

    // Auto-open solution if enabled
    if (settings.autoOpenSolution && settings.extractSolution) {
      await autoOpenSolution(data.exerciseType);
    }

    await extractInterview(data);
  } else {
    // This is a coding exercise
    data.exerciseType = Config.EXERCISE_TYPES.CODING;
    Logger.emoji(Config.LOG.DETECTED_CODING);

    // Auto-open solution if enabled (for coding exercises)
    if (settings.autoOpenSolution && settings.extractSolution) {
      await autoOpenSolution(data.exerciseType);
    }

    await extractAllTabs(data);

    // IMPROVED: After extracting all files, set the language from actual file extensions
    if (data.allFiles && data.allFiles.length > 0) {
      // Find the main file to determine the primary language
      const mainFile = data.allFiles.find(f =>
        (f.fileName.includes('main') || f.fileName.includes('index') || f.fileName.includes('solution'))
        && !f.fileName.includes('test')
      );

      if (mainFile && mainFile.language) {
        data.language = mainFile.language;
      } else if (data.allFiles[0].language) {
        // Fallback to first file's language
        data.language = data.allFiles[0].language;
      }

      // Set userCode from main file
      if (mainFile) {
        data.userCode = mainFile.code;
      }
    }
  }

  // Extract solution if enabled and available
  if (settings.extractSolution && data.exerciseType !== Config.EXERCISE_TYPES.MULTIPLE_CHOICE) {
    if (data.exerciseType === Config.EXERCISE_TYPES.INTERVIEW) {
      await extractInterviewSolution(data);
    } else if (data.exerciseType === Config.EXERCISE_TYPES.FREE_TEXT) {
      await extractFreeTextSolution(data);
    } else if (data.exerciseType === Config.EXERCISE_TYPES.CLI) {
      // CLI exercises don't have traditional solutions
      data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
    } else {
      await extractSolution(data);
    }
  }

  // Extract chats if enabled
  if (settings.extractChats) {
    await extractChats(data);
  }

  // Validate extracted data
  const validation = Validator.validateContent(data);
  if (!validation.valid) {
    Logger.warn('Validation warnings:', validation.errors);
  }

  return data;
}

// Extract chat conversations by opening each chat button and extracting content
async function extractChats(data) {
  Logger.emoji(Config.LOG.EXTRACTING_CHATS);

  const chats = [];

  // Find all chat buttons (excluding the "New Chat" button with +)
  const chatButtons = Array.from(document.querySelectorAll(Config.SELECTORS.CHAT_BUTTONS))
    .filter(btn => {
      const text = btn.textContent.trim();
      return text &&
        !text.includes('+') &&
        !btn.disabled;
    });

  if (chatButtons.length === 0) {
    Logger.debug('No chat conversations found');
    return;
  }

  Logger.debug(`Found ${chatButtons.length} chat button(s) to extract`);

  const chatContainer = document.querySelector('.vl-parent');
  if (!chatContainer) {
    Logger.debug('Chat container not found');
    return;
  }

  // Iterate through each chat button and extract its content
  for (let i = 0; i < chatButtons.length; i++) {
    const btn = chatButtons[i];
    const chatTitle = btn.textContent.trim();

    Logger.debug(`Opening chat ${i + 1}/${chatButtons.length}: "${chatTitle}"`);

    // Check if chat is already open
    const isAlreadyOpen = btn.classList.contains('border-gray-200') &&
      btn.classList.contains('text-gray-200');

    if (!isAlreadyOpen) {
      // Click the button to open this chat
      btn.click();

      // Wait for the conversation to load by checking for message containers
      await waitForElement(() => {
        const conversationBlocks = chatContainer.querySelectorAll('.pb-4');
        // Find a block with actual messages
        for (const block of conversationBlocks) {
          const messageContainers = block.querySelectorAll('.grid.grid-cols-\\[50px_minmax\\(0\\,1fr\\)\\]');
          if (messageContainers.length > 0) {
            return block;
          }
        }
        return null;
      }, { timeout: Config.TIMEOUTS.CHAT_LOAD });
    }

    // Extract the conversation from this chat
    const conversationBlocks = chatContainer.querySelectorAll('.pb-4');

    // Find the conversation block that corresponds to this chat
    // The conversation appears after clicking, so we look for the most recent one
    for (const block of conversationBlocks) {
      const messageContainers = block.querySelectorAll('.grid.grid-cols-\\[50px_minmax\\(0\\,1fr\\)\\]');

      if (messageContainers.length === 0) continue;

      const messages = [];
      let isFirstMessage = true;

      for (const container of messageContainers) {
        const viewer = container.querySelector('.viewer');
        if (!viewer) continue;

        // Clone the viewer to avoid modifying the original DOM
        const clonedViewer = viewer.cloneNode(true);

        // Remove buttons and audio elements
        clonedViewer.querySelectorAll('button').forEach(btn => btn.remove());
        clonedViewer.querySelectorAll('audio').forEach(audio => audio.remove());

        // Use parseToMarkdown to get properly formatted markdown with lists, code blocks, etc.
        const messageText = HTMLParser.parseToMarkdown(clonedViewer, {
          defaultLanguage: data.language || Config.DEFAULTS.LANGUAGE
        });

        // Skip the initial "Need help?" message from Boots
        if (isFirstMessage) {
          isFirstMessage = false;
          continue;
        }

        if (messageText && messageText.trim()) {
          // After skipping first BOOTS message, pattern is: USER, BOOTS, USER, BOOTS, etc.
          const speaker = messages.length % 2 === 0 ? Config.SPEAKERS.USER : Config.SPEAKERS.BOOTS;

          // Check if message has code blocks
          const hasCode = messageText.includes('```');

          messages.push({
            speaker: speaker,
            content: messageText,
            hasCode: hasCode
          });

          isFirstMessage = false;
        }
      }

      // Only add this chat if it has actual conversation messages
      if (messages.length > 0) {
        // Check if we already extracted this chat (avoid duplicates)
        const isDuplicate = chats.some(chat =>
          chat.title === chatTitle &&
          chat.messages.length === messages.length &&
          chat.messages[0]?.content === messages[0]?.content
        );

        if (!isDuplicate) {
          chats.push({
            title: chatTitle,
            messages: messages
          });

          Logger.extraction(`Chat: ${chatTitle}`, { messages: messages.length });

          // Only process the first valid conversation block for this chat
          break;
        }
      }
    }
  }

  data.chats = chats;
  Logger.extraction(`Extracted ${chats.length} chat conversation(s)`);
}

// Extract CLI commands and checks
async function extractCLI(data) {
  Logger.emoji(Config.LOG.EXTRACTING_CLI);

  const cliData = {
    runCommand: '',
    submitCommand: '',
    checks: [],
    instructions: ''
  };

  // Extract run and submit commands
  const commandContainers = document.querySelectorAll('.flex.w-4\\/5.justify-between.rounded-sm.border');
  commandContainers.forEach((container, index) => {
    const commandText = container.querySelector('p.font-mono');
    if (commandText) {
      const command = commandText.textContent.trim();
      if (index === 0) {
        cliData.runCommand = command;
      } else if (index === 1) {
        cliData.submitCommand = command;
      }
    }
  });

  Logger.extraction('CLI Commands', {
    run: cliData.runCommand.substring(0, 50),
    submit: cliData.submitCommand.substring(0, 50)
  });

  // Extract validation checks
  const checksList = document.querySelector('ol.list-inside.list-decimal');
  if (checksList) {
    const checkItems = checksList.querySelectorAll('li');
    checkItems.forEach((item, index) => {
      // Get the command being checked
      const commandSpan = item.querySelector('span.font-mono.font-bold');
      const command = commandSpan ? commandSpan.textContent.trim() : '';

      // Get expected values
      const expectations = [];
      const nestedList = item.querySelector('ul.ml-4.list-inside.list-disc');
      if (nestedList) {
        const nestedItems = nestedList.querySelectorAll('li');
        nestedItems.forEach(nestedItem => {
          const text = nestedItem.textContent.trim();
          expectations.push(text);
        });
      }

      if (command) {
        cliData.checks.push({
          index: index + 1,
          command: command,
          expectations: expectations
        });

        Logger.extraction(`Check ${index + 1}`, {
          command: command.substring(0, 50),
          expectations: expectations.length
        });
      }
    });
  }

  // Extract instructions/description text
  const instructionsDiv = document.querySelector('.mb-4.w-4\\/5.max-w-md');
  if (instructionsDiv) {
    const instructionsP = instructionsDiv.querySelector('p.text-sm');
    if (instructionsP) {
      cliData.instructions = instructionsP.textContent.trim();
    }
  }

  data.cli = cliData;
  Logger.extraction(`Extracted CLI exercise with ${cliData.checks.length} checks`);
}

// Extract free-text questions and checks
async function extractFreeText(data, settings) {
  Logger.emoji(Config.LOG.EXTRACTING_FREE_TEXT);

  const freeTextData = {
    userAnswer: '',
    checks: [],
    checksVisible: false
  };

  // Extract user's answer from textarea
  const textarea = document.querySelector(Config.SELECTORS.FREE_TEXT_TEXTAREA);
  if (textarea) {
    freeTextData.userAnswer = textarea.value || '';
    Logger.extraction('User Answer', { chars: freeTextData.userAnswer.length });
  }

  // Only extract checks if extractSolution is enabled
  if (settings.extractSolution) {
    // Check if checks are visible
    const toggleButton = document.querySelector(Config.SELECTORS.FREE_TEXT_TOGGLE);
    if (toggleButton) {
      const buttonText = toggleButton.textContent.trim();
      freeTextData.checksVisible = buttonText.includes('Hide');
      Logger.extraction('Checks Visibility', { visible: freeTextData.checksVisible });
    }

    // Extract checks if visible
    if (freeTextData.checksVisible) {
      const checksList = document.querySelector(Config.SELECTORS.FREE_TEXT_CHECKS);
      if (checksList) {
        const checkItems = checksList.querySelectorAll('li');
        checkItems.forEach((item, index) => {
          // Get the check description (first text)
          const descSpan = item.querySelector('span.text-lg');
          const description = descSpan ? descSpan.textContent.trim() : '';

          // Get expected values (if any)
          const expectedValues = [];
          const nestedList = item.querySelector('ol.ml-6');
          if (nestedList) {
            const nestedItems = nestedList.querySelectorAll('li');
            nestedItems.forEach(nestedItem => {
              const pre = nestedItem.querySelector('pre');
              if (pre) {
                expectedValues.push(pre.textContent.trim());
              }
            });
          }

          if (description) {
            freeTextData.checks.push({
              index: index + 1,
              description: description,
              expectedValues: expectedValues
            });

            Logger.extraction(`Check ${index + 1}`, {
              desc: description.substring(0, 50),
              values: expectedValues.length
            });
          }
        });
      }
    }
  } else {
    Logger.debug('Skipping validation checks extraction (extractSolution is disabled)');
  }

  data.freeText = freeTextData;
  Logger.extraction(`Extracted free-text with ${freeTextData.checks.length} checks`);
}

// Extract free-text solution (checks)
async function extractFreeTextSolution(data) {
  // If checks weren't visible during initial extraction, try to extract them now
  if (!data.freeText || !data.freeText.checksVisible) {
    Logger.debug('Checks not visible, solution may not be available');
    data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
    return;
  }

  // If we already have checks, format them as the solution
  if (data.freeText && data.freeText.checks.length > 0) {
    let solution = 'Expected Answer(s):\n\n';
    data.freeText.checks.forEach(check => {
      solution += `${check.index}. ${check.description}\n`;
      if (check.expectedValues.length > 0) {
        check.expectedValues.forEach(value => {
          solution += `   - ${value}\n`;
        });
      }
      solution += '\n';
    });
    data.solution = solution.trim();
    Logger.extraction('Solution', { checks: data.freeText.checks.length });
  } else {
    data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
  }
}

// Extract multiple-choice questions and options
async function extractMultipleChoice(data, settings) {
  Logger.emoji(Config.LOG.EXTRACTING_MULTIPLE_CHOICE);

  const mcqData = {
    question: '',
    options: [],
    selectedAnswer: null
  };

  // Extract question - look for the viewer-mcq with class "answer"
  const questionContainer = document.querySelector('.viewer-mcq.answer');
  if (questionContainer) {
    mcqData.question = questionContainer.textContent.trim();
    Logger.extraction('Question', { chars: mcqData.question.length });
  }

  // Extract options - look for buttons with viewer-mcq question class
  const optionButtons = document.querySelectorAll('button .viewer-mcq.question');

  optionButtons.forEach((optionDiv, index) => {
    const optionText = optionDiv.textContent.trim();
    const button = optionDiv.closest('button');
    const isSelected = button && button.classList.contains('ring-2');

    mcqData.options.push({
      index: index + 1,
      text: optionText,
      // Only include selection status if extractSolution is enabled
      isSelected: settings.extractSolution ? isSelected : false
    });

    if (isSelected && settings.extractSolution) {
      mcqData.selectedAnswer = index + 1;
    }

    Logger.extraction(`Option ${index + 1}`, {
      text: optionText.substring(0, 50),
      selected: settings.extractSolution ? isSelected : 'hidden'
    });
  });

  data.multipleChoice = mcqData;
  Logger.extraction(`Extracted multiple-choice with ${mcqData.options.length} options`);
}

// Extract interview messages
async function extractInterview(data) {
  const interviewSide = document.querySelector(Config.SELECTORS.INTERVIEW_SIDE);
  if (!interviewSide) return;

  Logger.emoji(Config.LOG.EXTRACTING_INTERVIEW);

  // Find all message containers by traversing the DOM
  const messageContainers = [];

  const allDivs = interviewSide.querySelectorAll(Config.SELECTORS.INTERVIEW_GRID);
  allDivs.forEach(div => {
    const hasImg = div.querySelector(Config.SELECTORS.PROFILE_IMAGE) !== null;
    const hasViewer = div.querySelector(Config.SELECTORS.VIEWER) !== null;

    const classes = div.className || '';
    if (hasImg && hasViewer && classes.includes('grid')) {
      messageContainers.push(div);
    }
  });

  messageContainers.forEach((container, index) => {
    // Determine speaker based on position
    const isBoots = index % 2 === 0;

    const viewer = container.querySelector(Config.SELECTORS.VIEWER);
    if (!viewer) return;

    const clonedViewer = viewer.cloneNode(true);
    clonedViewer.querySelectorAll(Config.SELECTORS.COPY_BUTTON).forEach(btn => btn.remove());

    // Extract code blocks in order
    const codeBlocks = HTMLParser.extractCodeBlocksInOrder(clonedViewer);
    let messageText = HTMLParser.cleanText(clonedViewer.textContent);
    messageText = HTMLParser.insertCodeBlocks(messageText, codeBlocks);

    if (messageText) {
      data.interviewMessages.push({
        index: index + 1,
        speaker: isBoots ? Config.SPEAKERS.BOOTS : Config.SPEAKERS.USER,
        content: messageText,
        hasCode: codeBlocks.length > 0,
        codeBlocks: codeBlocks.map(cb => ({ code: cb.code, language: cb.lang }))
      });

      Logger.extraction(`Message ${index + 1}`, {
        speaker: isBoots ? Config.SPEAKERS.BOOTS : Config.SPEAKERS.USER,
        chars: messageText.length,
        codeBlocks: codeBlocks.length
      });
    }
  });

  Logger.extraction(`Extracted ${data.interviewMessages.length} interview messages`);
}

// Extract interview solution (expected points)
async function extractInterviewSolution(data) {
  try {
    Logger.emoji(Config.LOG.LOOKING_FOR_SOLUTION);

    const solutionContainer = document.querySelector(Config.SELECTORS.INTERVIEW_SIDE);
    if (!solutionContainer) {
      data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
      return;
    }

    // Look for "Hide Solution" or "Show Solution" button
    const solutionButton = Array.from(solutionContainer.querySelectorAll(Config.SELECTORS.SOLUTION_BUTTON))
      .find(btn => btn.textContent.includes('Solution'));

    if (!solutionButton || solutionButton.textContent.includes('Show')) {
      data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
      return;
    }

    // Look for the acceptance criteria div (contains "Boots is expecting")
    const borderedDivs = solutionContainer.querySelectorAll('.rounded-sm.border');
    let solutionDiv = null;

    for (const div of borderedDivs) {
      const text = div.textContent.trim();
      if (text.toLowerCase().includes('expecting') ||
        text.toLowerCase().includes('acceptance criteria')) {
        solutionDiv = div;
        break;
      }
    }

    if (solutionDiv) {
      // Extract the pre element containing the acceptance criteria
      const preElement = solutionDiv.querySelector('pre');

      if (preElement) {
        const criteriaText = preElement.textContent.trim();

        // Parse the numbered list into structured expected points
        const lines = criteriaText.split('\n').filter(line => line.trim());
        data.expectedPoints = [];

        lines.forEach(line => {
          const match = line.match(/^(\d+)\.\s*(.+)$/);
          if (match) {
            data.expectedPoints.push({
              index: parseInt(match[1]),
              point: match[2].trim()
            });
          }
        });

        // Also set the solution field as formatted text
        if (data.expectedPoints.length > 0) {
          data.solution = 'Acceptance Criteria:\n\n' +
            data.expectedPoints.map(p => `${p.index}. ${p.point}`).join('\n');

          Logger.extraction('Solution', {
            points: data.expectedPoints.length,
            chars: data.solution.length
          });
        } else {
          // Fallback: use the raw text from pre
          data.solution = criteriaText;
          Logger.extraction('Solution (raw)', { chars: data.solution.length });
        }
      } else {
        // Fallback: use the entire div text
        data.solution = solutionDiv.textContent.trim();
        Logger.extraction('Solution (div text)', { chars: data.solution.length });
      }
    } else {
      data.solution = Config.MESSAGES.SOLUTION_NOT_AVAILABLE;
    }
  } catch (e) {
    Logger.error('Could not extract interview solution:', e);
    data.solution = Config.MESSAGES.SOLUTION_EXTRACTION_FAILED;
  }
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

  // Use HTMLParser to convert content to markdown
  data.description = HTMLParser.parseToMarkdown(viewerDiv, {
    defaultLanguage: data.language
  });
}

// Extract code from all editor tabs
async function extractAllTabs(data) {
  // Find all tab buttons
  const tabButtons = Array.from(document.querySelectorAll('ul[role="tablist"] button'));
  const initialTab = tabButtons.find(b => b.getAttribute('aria-selected') === 'true') || tabButtons[0];

  if (tabButtons.length === 0) {
    Logger.debug('No code editor tabs found');
    return;
  }

  console.log(`Found ${tabButtons.length} tabs`);

  const codeFiles = [];

  // Process each tab
  for (let i = 0; i < tabButtons.length; i++) {
    const btn = tabButtons[i];
    console.log(`\n📂 Processing tab #${i + 1}...`);

    // Click tab to activate it
    btn.click();

    // Wait just one animation frame for the DOM to update
    await waitForFrame();

    // Find the main editor container (exclude merge view editors)
    const editor = await waitForElement(() => {
      // First, check if we're in solution/merge view - if so, skip to avoid confusion
      const mergeView = document.querySelector('.cm-mergeView');
      if (mergeView) {
        // In merge view, the LEFT editor is the user's code
        const leftEditor = mergeView.querySelector('.cm-mergeViewEditor:first-child .cm-editor .cm-content[role="textbox"]');
        if (leftEditor && isEditorVisible(leftEditor)) {
          return leftEditor;
        }
      }

      // Not in merge view, find the main editor
      // Look for editors that are NOT inside a merge view
      const allEditors = document.querySelectorAll('.cm-content[role="textbox"]');
      for (const ed of allEditors) {
        // Skip if this editor is inside a merge view
        if (ed.closest('.cm-mergeView')) continue;

        // This is a standalone editor - use it if visible
        if (isEditorVisible(ed)) {
          return ed;
        }
      }
      return null;
    }, { timeout: Config.TIMEOUTS.TAB_SWITCH, checkInterval: Config.TIMEOUTS.VISIBILITY_POLL });

    if (!editor) {
      Logger.warn(`Could not find editor for tab ${i + 1}`);
      continue;
    }

    // Get tab name to detect language
    let fileName = `file_${i}`;
    let fileLanguage = Config.DEFAULTS.LANGUAGE;

    if (tabButtons[i]) {
      const tabText = tabButtons[i].textContent.trim();
      if (tabText) {
        fileName = tabText;
        // Detect language from filename
        const detectedLang = detectLanguageFromFilename(fileName);
        if (detectedLang) {
          fileLanguage = detectedLang;
        }
      }
    }

    // Extract code from this editor
    const code = await extractCodeFromEditor(editor);

    codeFiles.push({
      fileName: fileName,
      code: code,
      language: fileLanguage,
      isActive: i === tabButtons.findIndex(b => b === initialTab)
    });

    console.log(`  ✅ Captured: ${fileName} (${fileLanguage}) - ${code.split('\n').length} lines`);
  }

  // Return to initial tab
  if (initialTab) {
    console.log('\n🔙 Returning to initial tab...');
    initialTab.click();
    // Wait for animation frame to complete for visual consistency
    await waitForFrame();
  }

  // Store all files
  data.allFiles = codeFiles;
}

// Extract solution code if available (for coding exercises)
async function extractSolution(data) {
  try {
    // Check for solution in merge view (split view)
    const mergeView = document.querySelector('.cm-mergeView');
    if (mergeView) {
      const editors = mergeView.querySelectorAll('.cm-mergeViewEditor .cm-editor');
      if (editors.length >= 2) {
        console.log('\n💡 Solution view detected — capturing right-side editor...');
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

// Detect language from filename - USES CONFIG
function detectLanguageFromFilename(filename) {
  return Config.detectLanguageFromFilename(filename);
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
