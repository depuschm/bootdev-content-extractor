// HTML Parser Utility
// Handles conversion of HTML content to markdown format

const HTMLParser = {
  /**
   * Process a list item recursively, handling nested lists
   * @param {HTMLElement} li - The list item element
   * @param {string} indent - Current indentation level (3 spaces per level)
   * @param {Array} outputLines - Array to collect output lines
   * @returns {Array} Array of formatted lines
   */
  processListItem(li, indent = '', outputLines = []) {
    let mainText = '';

    // Process direct children of this <li>
    for (const child of li.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text) {
          mainText += (mainText ? ' ' : '') + text;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tagName = child.tagName.toLowerCase();

        if (tagName === 'p') {
          const text = child.textContent.trim();
          if (text) {
            mainText += (mainText ? ' ' : '') + text;
          }
        } else if (tagName === 'ul') {
          // Nested unordered list - add items on separate lines with 3-space indentation
          const nestedItems = Array.from(child.children).filter(c => c.tagName.toLowerCase() === 'li');
          nestedItems.forEach(nestedLi => {
            const nestedLines = [];
            this.processListItem(nestedLi, indent + '   ', nestedLines);
            nestedLines.forEach(line => outputLines.push(line));
          });
        } else if (tagName === 'ol') {
          // Nested ordered list - add items on separate lines with 3-space indentation
          const nestedItems = Array.from(child.children).filter(c => c.tagName.toLowerCase() === 'li');
          nestedItems.forEach((nestedLi, idx) => {
            const nestedLines = [];
            this.processListItem(nestedLi, indent + '   ', nestedLines);
            // Replace the bullet with numbered format
            if (nestedLines.length > 0) {
              nestedLines[0] = nestedLines[0].replace(/^(\s*)- /, `$1${idx + 1}. `);
            }
            nestedLines.forEach(line => outputLines.push(line));
          });
        } else if (tagName === 'code') {
          const text = child.textContent.trim();
          if (text) {
            mainText += (mainText ? ' ' : '') + `\`${text}\``;
          }
        } else {
          const text = child.textContent.trim();
          if (text) {
            mainText += (mainText ? ' ' : '') + text;
          }
        }
      }
    }

    // Add the main text as the first line
    if (mainText) {
      outputLines.unshift(`${indent}- ${mainText}`);
    }

    return outputLines;
  },

  /**
   * Convert HTML content to markdown format
   * @param {HTMLElement} container - The container element to parse
   * @param {Object} options - Parsing options
   * @returns {string} Formatted markdown text
   */
  parseToMarkdown(container, options = {}) {
    const { defaultLanguage = 'python' } = options;

    // Clone to avoid modifying original
    const cloned = container.cloneNode(true);

    // Remove buttons and title
    cloned.querySelectorAll('button').forEach(btn => btn.remove());
    const h1 = cloned.querySelector('h1');
    if (h1) h1.remove();

    const lines = [];
    const children = Array.from(cloned.children);

    for (const element of children) {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent.trim();

      // Paragraphs
      if (tagName === 'p') {
        if (text) {
          lines.push(text);
          lines.push('');
        }
        continue;
      }

      // Unordered lists
      if (tagName === 'ul') {
        const listItems = Array.from(element.children).filter(c => c.tagName.toLowerCase() === 'li');
        listItems.forEach(li => {
          const itemLines = [];
          this.processListItem(li, '', itemLines);
          itemLines.forEach(line => lines.push(line));
        });
        lines.push('');
        continue;
      }

      // Ordered lists
      if (tagName === 'ol') {
        const listItems = Array.from(element.children).filter(c => c.tagName.toLowerCase() === 'li');
        listItems.forEach((li, index) => {
          const itemLines = [];
          this.processListItem(li, '', itemLines);
          // Replace the first bullet with number and keep proper indentation for nested items
          if (itemLines.length > 0) {
            itemLines[0] = itemLines[0].replace(/^- /, `${index + 1}. `);
          }
          itemLines.forEach(line => lines.push(line));
        });
        lines.push('');
        continue;
      }

      // Code blocks
      if (tagName === 'div' || tagName === 'pre') {
        const codeBlock = element.querySelector('code');
        if (codeBlock) {
          const code = codeBlock.textContent.trim();
          if (code) {
            // Detect language
            let lang = defaultLanguage;
            const className = codeBlock.className;
            if (className) {
              const langMatch = className.match(/language-(\w+)/);
              if (langMatch) {
                lang = langMatch[1];
              }
            }

            lines.push(`\`\`\`${lang}`);
            lines.push(code);
            lines.push('```');
            lines.push('');
          }
        }
        continue;
      }

      // Headings (h2, h3, etc.)
      if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
        if (text) {
          const level = tagName === 'h2' ? '##' : tagName === 'h3' ? '###' : '####';
          lines.push(`${level} ${text}`);
          lines.push('');
        }
        continue;
      }
    }

    // Join all lines and clean up excessive blank lines
    return lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /**
   * Extract code blocks from a viewer element while preserving order
   * @param {HTMLElement} viewer - The viewer element
   * @returns {Array} Array of code block objects with placeholders
   */
  extractCodeBlocksInOrder(viewer) {
    const codeBlocks = [];

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'PRE') {
          const codeBlock = node.querySelector('code');
          if (codeBlock) {
            const code = codeBlock.textContent.trim();
            const lang = codeBlock.className.match(/language-(\w+)/)?.[1] || '';

            // Replace code block with a placeholder
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            const span = document.createElement('span');
            span.textContent = placeholder;
            node.replaceWith(span);

            codeBlocks.push({ code, lang, placeholder });
            return; // Don't process children since we replaced the node
          }
        }

        // Process children
        Array.from(node.childNodes).forEach(child => processNode(child));
      }
    };

    processNode(viewer);
    return codeBlocks;
  },

  /**
   * Clean and format text content
   * @param {string} text - Raw text content
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple newlines to double
      .replace(/[ \t]+/g, ' ') // Reduce multiple spaces/tabs to single space
      .replace(/\n /g, '\n') // Remove leading spaces after newlines
      .replace(/ \n/g, '\n') // Remove trailing spaces before newlines
      .replace(/\n{3,}/g, '\n\n') // Max two consecutive newlines
      .trim();
  },

  /**
   * Format code blocks in text by replacing placeholders
   * @param {string} text - Text with placeholders
   * @param {Array} codeBlocks - Array of code block objects
   * @returns {string} Text with formatted code blocks
   */
  insertCodeBlocks(text, codeBlocks) {
    let result = text;
    codeBlocks.forEach(({ code, lang, placeholder }) => {
      const formattedCode = lang
        ? `\n\`\`\`${lang}\n${code}\n\`\`\`\n`
        : `\n\`\`\`\n${code}\n\`\`\`\n`;
      result = result.replace(placeholder, formattedCode);
    });
    return result;
  }
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HTMLParser;
}
