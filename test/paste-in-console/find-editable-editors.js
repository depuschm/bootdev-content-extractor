// Standalone test script for isUserEditableEditor function
// Paste this into the browser console on a Boot.dev page with code editors

(function () {
  'use strict';

  // Simple logger
  const Logger = {
    debug: (...args) => console.log('[DEBUG]', ...args),
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
  };

  // Mock Config for MAX_DOM_DEPTH
  const Config = {
    EXTRACTION: {
      MAX_DOM_DEPTH: 10
    }
  };

  // Helper function to check if an editor is the user's editable code
  function isUserEditableEditor(editor) {
    try {
      // Find the EditorView instance
      let editorView = null;

      // Try multiple ways to find the EditorView instance
      if (editor.cmView?.view) {
        editorView = editor.cmView.view;
      } else if (editor.state?.doc) {
        editorView = editor;
      } else if (editor.CodeMirror) {
        editorView = editor.CodeMirror;
      } else if (editor.parentElement?.cmView?.view) {
        editorView = editor.parentElement.cmView.view;
      }

      // Walk up the DOM tree to find the EditorView
      if (!editorView) {
        let element = editor;
        let depth = 0;
        while (element && !editorView && depth < Config.EXTRACTION.MAX_DOM_DEPTH) {
          if (element.cmView?.view) {
            editorView = element.cmView.view;
            break;
          }
          if (element.state?.doc) {
            editorView = element;
            break;
          }
          element = element.parentElement;
          depth++;
        }
      }

      if (!editorView || !editorView.state?.doc) {
        Logger.debug('Could not find EditorView instance');
        return false;
      }

      // Get the current document state
      const originalDoc = editorView.state.doc;
      const originalLength = originalDoc.length;

      // Try to insert a character at the end of the document
      try {
        // Create a transaction to insert a single space character at the end
        const transaction = editorView.state.update({
          changes: { from: originalLength, insert: ' ' }
        });

        // Dispatch the transaction
        editorView.dispatch(transaction);

        // Check if the character was actually inserted
        const newDoc = editorView.state.doc;
        const wasInserted = newDoc.length === originalLength + 1;

        // Immediately remove the character to restore original state
        if (wasInserted) {
          const removeTransaction = editorView.state.update({
            changes: { from: originalLength, to: originalLength + 1, insert: '' }
          });
          editorView.dispatch(removeTransaction);

          Logger.debug('✓ Editor is EDITABLE - character insertion successful');
          return true;
        } else {
          Logger.debug('✗ Editor is READ-ONLY - character insertion failed');
          return false;
        }
      } catch (insertError) {
        // If we can't insert, the editor is read-only
        Logger.debug('✗ Editor is READ-ONLY - insertion threw error:', insertError.message);
        return false;
      }
    } catch (e) {
      Logger.debug('Error checking if editor is user editable:', e);
      // If we can't determine, assume it's not editable to be safe
      return false;
    }
  }

  // Test function to find and check all editors on the page
  function testAllEditors() {
    console.clear();
    console.log('%c=== Testing isUserEditableEditor Function ===', 'font-weight: bold; font-size: 16px; color: #4CAF50');
    console.log('');

    // Find all CodeMirror editors
    const editors = document.querySelectorAll('.cm-content[role="textbox"]');

    if (editors.length === 0) {
      console.log('%c❌ No editors found on this page', 'color: #f44336');
      return;
    }

    console.log(`%c📝 Found ${editors.length} editor(s)`, 'color: #2196F3; font-weight: bold');
    console.log('');

    editors.forEach((editor, index) => {
      console.log(`%c--- Editor #${index + 1} ---`, 'font-weight: bold; color: #FF9800');

      // Get container info
      const container = editor.closest('.w-full.h-full-minus-tab-bar');
      const containerStyle = container?.getAttribute('style') || '';
      const isVisible = !containerStyle.includes('display: none') && !containerStyle.includes('display:none');

      console.log(`  Visible: ${isVisible ? '✓' : '✗'}`);

      // Find parent tab button to get file name
      const tabList = document.querySelector('ul[role="tablist"]');
      const tabButtons = tabList ? Array.from(tabList.querySelectorAll('button')) : [];
      const activeTab = tabButtons.find(btn => btn.getAttribute('aria-selected') === 'true');
      const fileName = activeTab ? activeTab.textContent.trim() : 'Unknown';

      console.log(`  File: ${fileName}`);

      // Test if editable
      const isEditable = isUserEditableEditor(editor);
      console.log(isEditable);

      if (isEditable) {
        console.log(`%c  Result: ✓ EDITABLE (USER CODE)`, 'color: #4CAF50; font-weight: bold');
      } else {
        console.log(`%c  Result: ✗ READ-ONLY`, 'color: #f44336');
      }

      console.log('');
    });

    console.log('%c=== Test Complete ===', 'font-weight: bold; font-size: 16px; color: #4CAF50');
  }

  // Run the test
  testAllEditors();

  // Make available globally for manual testing
  window.testUserEditableEditor = {
    test: testAllEditors,
    checkEditor: isUserEditableEditor,
    findEditors: () => document.querySelectorAll('.cm-content[role="textbox"]')
  };

  console.log('');
  console.log('%c💡 Tip: Run window.testUserEditableEditor.test() to test again', 'color: #9C27B0; font-style: italic');
  console.log('%c💡 Tip: Use window.testUserEditableEditor.checkEditor(element) to test a specific editor', 'color: #9C27B0; font-style: italic');
})();
