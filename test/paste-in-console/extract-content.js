// === Tab-aware CodeMirror Extractor (Boot.dev edition) ===
// ✅ Automatically activates all editor tabs
// ✅ Force-scrolls each CodeMirror editor to render hidden lines
// ✅ Captures full text from each CodeMirror instance
// ✅ Detects and captures solution editors (right-side in split view)
// ✅ Deduplicates overlapping results
// ✅ Returns to the initial tab at the end so you’re back where you started
// ✅ Prints results in a readable console table
// Use: paste into console on a Boot.dev lesson page and let it run.

(async function extractBootdevEditors({
  tabClickWait = 400,        // wait after clicking each tab (ms)
  editorAppearTimeout = 3000,// how long to wait for a hidden editor to appear (ms)
  visibilityPollInterval = 80,// polling interval to detect when editor becomes visible
  settleAfterAppear = 220,   // wait after editor appears before scrolling
  stepPx = 200,              // scroll step size in pixels
  waitMs = 160,              // delay between scroll steps (ms)
  forcedOvershoot = 4000,    // extra scroll distance in case CM underreports height
  wiggleCount = 3,           // small “wiggle” scrolls at end to ensure full rendering
  wiggleDelay = 120          // delay between wiggle scrolls
} = {}) {

  // Utility functions
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const now = () => performance.now();

  console.log("🚀 Starting Boot.dev CodeMirror extractor...");

  // --- Step 1: Find tab buttons (e.g., main.py, main_test.py) ---
  const tabButtons = Array.from(document.querySelectorAll('ul[role="tablist"] button'));
  console.log(`Found ${tabButtons.length} tab button(s).`);

  // --- Helper: find all CodeMirror roots (cm-editor or CodeMirror) ---
  function findEditorRoots() {
    const nodes = Array.from(document.querySelectorAll('.cm-editor, .CodeMirror'));
    const unique = [];
    const seen = new Set();
    for (const n of nodes) {
      const root = n.closest('.cm-editor, .CodeMirror') || n;
      if (!seen.has(root)) { seen.add(root); unique.push(root); }
    }
    return unique;
  }

  // --- Helper: check if element is visible in viewport ---
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (rect.width <= 2 || rect.height <= 2) return false;
    const vpH = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom < 0 || rect.top > vpH + 200) return false;
    return true;
  }

  // --- Helper: find the next visible unprocessed CodeMirror root ---
  function findVisibleUnprocessedRoot(processedSet) {
    const roots = findEditorRoots();
    for (const r of roots) {
      if (!processedSet.has(r) && isVisible(r)) return r;
    }
    return null;
  }

  // --- Helper: get all currently rendered CodeMirror lines ---
  function captureRenderedLines(root) {
    const lines = Array.from(root.querySelectorAll('.CodeMirror-line, .cm-line'));
    return lines.map(el => el.textContent ?? '');
  }

  // --- Step 2: Scroll through editor until no new lines appear ---
  async function forceScrollUntilStable(root) {
    const scrollEl = root.querySelector('.cm-scroller, .CodeMirror-scroll') || root;
    scrollEl.scrollTop = 0;
    await sleep(settleAfterAppear);

    let prevCount = -1, stableCounter = 0, lastCaptured = [];
    const maxStable = 2;

    let reportedMax = Math.max(0, (scrollEl.scrollHeight || 0) - (scrollEl.clientHeight || 0));
    let maxScroll = Math.max(reportedMax, forcedOvershoot);

    const startWait = now();
    while ((scrollEl.clientHeight || 0) <= 2 && now() - startWait < editorAppearTimeout)
      await sleep(visibilityPollInterval);

    reportedMax = Math.max(0, (scrollEl.scrollHeight || 0) - (scrollEl.clientHeight || 0));
    maxScroll = Math.max(reportedMax, maxScroll);

    console.log(`    → force-scroll: clientHeight=${scrollEl.clientHeight}, reportedMax=${reportedMax}`);

    for (let y = 0; y <= maxScroll; y += stepPx) {
      scrollEl.scrollTop = Math.min(y, maxScroll);
      await sleep(waitMs);
      const lines = captureRenderedLines(root);
      if (lines.length !== prevCount) {
        prevCount = lines.length;
        stableCounter = 0;
      } else if (++stableCounter >= maxStable) {
        lastCaptured = lines;
        break;
      }
      lastCaptured = lines;
    }

    // Wiggle scroll to trigger CodeMirror’s virtual renderer to finalize content
    scrollEl.scrollTop = maxScroll;
    for (let i = 0; i < wiggleCount; i++) {
      scrollEl.scrollTop = Math.max(0, maxScroll - 50 * (i + 1));
      await sleep(wiggleDelay);
      lastCaptured = captureRenderedLines(root);
      scrollEl.scrollTop = maxScroll;
      await sleep(wiggleDelay);
      lastCaptured = captureRenderedLines(root);
    }

    // Sort by visual order (offsetTop) and join into a full text string
    const nodes = Array.from(root.querySelectorAll('.CodeMirror-line, .cm-line'));
    const ordered = nodes.map(n => ({ t: n.textContent ?? '', y: n.offsetTop || 0 }))
      .sort((a, b) => a.y - b.y)
      .map(o => o.t);
    const merged = ordered.length ? ordered : lastCaptured;

    return { text: merged.join('\n'), lineCount: merged.length, charCount: merged.join('\n').length };
  }

  // --- Step 3: Iterate over editors by switching tabs and capturing ---
  const processed = new Set();
  const results = [];
  const initialTab = tabButtons.find(b => b.getAttribute('aria-selected') === 'true') || tabButtons[0] || null;

  for (let i = 0; i < (tabButtons.length || 1); i++) {
    const btn = tabButtons[i];
    if (btn) {
      console.log(`\n📑 Activating tab #${i + 1}...`);
      btn.click();
      await sleep(tabClickWait);
    }

    const start = now();
    let root = null;
    while (now() - start < editorAppearTimeout) {
      root = findVisibleUnprocessedRoot(processed);
      if (root) break;
      await sleep(visibilityPollInterval);
    }
    if (!root) {
      const allRoots = findEditorRoots();
      if (allRoots.length > i && !processed.has(allRoots[i])) root = allRoots[i];
      else continue;
    }

    processed.add(root);
    const captured = await forceScrollUntilStable(root);
    results.push({ index: i + 1, element: root, ...captured });
    console.log(`  ✅ Captured editor for tab #${i + 1}: ${captured.lineCount} lines, ${captured.charCount} chars`);
  }

  // --- Step 4: Detect and extract solution CodeMirror (split-view) ---
  const mergeView = document.querySelector('.cm-mergeView');
  if (mergeView) {
    const editors = mergeView.querySelectorAll('.cm-mergeViewEditor .cm-editor');
    if (editors.length >= 2) {
      console.log("\n💡 Solution view detected — capturing right-side editor...");
      const rightEditor = editors[1];
      const captured = await forceScrollUntilStable(rightEditor);
      results.push({
        index: results.length + 1,
        element: rightEditor,
        isSolution: true,
        ...captured
      });
      console.log(`  ✅ Captured solution editor: ${captured.lineCount} lines, ${captured.charCount} chars`);
    }
  }

  // --- Step 5: Return to the first tab (initial editor state) ---
  if (initialTab) {
    console.log("\n🔙 Returning to initial tab...");
    initialTab.click();
    await sleep(tabClickWait);
  }

  // --- Step 6: Deduplicate results and summarize ---
  const sig = s => (s || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const best = new Map();
  for (const r of results) {
    const k = sig(r.text);
    const prev = best.get(k);
    if (!prev || r.text.length > prev.text.length) best.set(k, r);
  }
  const deduped = Array.from(best.values());

  const serial = {
    timestamp: new Date().toISOString(),
    rawCount: results.length,
    dedupedCount: deduped.length,
    deduped: deduped.map(r => ({
      index: r.index,
      isSolution: r.isSolution || false,
      lineCount: r.lineCount,
      charCount: r.charCount,
      textStart: (r.text || '').slice(0, 120),
      fullText: r.text
    }))
  };

  // Save globally for easy copy access
  window.__cmExtracted = serial;

  // --- Step 7: Print summary ---
  console.log("✅ Extraction complete — UI restored to initial state.");
  console.table(serial.deduped.map(d => ({
    index: d.index,
    solution: d.isSolution ? '✅' : '',
    lines: d.lineCount,
    chars: d.charCount
  })));
  console.log("📦 Full data stored in window.__cmExtracted");
})();
