// HTML Parser Utility
// Handles conversion of HTML content to markdown format

const HTMLParser = {
  // Cache for callout background images
  calloutImageCache: {},

  /**
   * Extract callout background images from stylesheets
   * This scans all CSS rules to find background images for callout::before elements
   */
  extractCalloutImages() {
    if (Object.keys(this.calloutImageCache).length > 0) {
      return this.calloutImageCache;
    }

    try {
      // Scan all stylesheets
      for (const styleSheet of document.styleSheets) {
        try {
          // Some stylesheets may be cross-origin and throw errors
          const rules = styleSheet.cssRules || styleSheet.rules;
          if (!rules) continue;

          for (const rule of rules) {
            if (rule.selectorText) {
              // Look for .viewer .callout-[type]:before or ::before patterns
              const match = rule.selectorText.match(/\.callout-(\w+)::?before/i);
              if (match) {
                const calloutType = match[1];
                const bgImage = rule.style.backgroundImage;

                if (bgImage && bgImage !== 'none') {
                  const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
                  if (urlMatch) {
                    this.calloutImageCache[calloutType] = urlMatch[1];
                  }
                }
              }
            }
          }
        } catch (e) {
          // Skip stylesheets we can't access (cross-origin)
          continue;
        }
      }
    } catch (e) {
      Logger.debug('Could not scan stylesheets:', e);
    }

    return this.calloutImageCache;
  },

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
        } else if (tagName === 'strong' || tagName === 'b') {
          const text = child.textContent.trim();
          if (text) {
            mainText += (mainText ? ' ' : '') + `**${text}**`;
          }
        } else if (tagName === 'em' || tagName === 'i') {
          const text = child.textContent.trim();
          if (text) {
            mainText += (mainText ? ' ' : '') + `*${text}*`;
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

    // Extract callout images from stylesheets first
    const calloutImages = this.extractCalloutImages();

    // Clone to avoid modifying original
    const cloned = container.cloneNode(true);

    // Remove buttons and title
    cloned.querySelectorAll('button').forEach(btn => btn.remove());
    cloned.querySelectorAll('svg').forEach(svg => svg.remove());
    cloned.querySelectorAll('audio').forEach(audio => audio.remove());
    const h1 = cloned.querySelector('h1');
    if (h1) h1.remove();

    // Remove "Click to hide video" headings
    cloned.querySelectorAll('h2, h3').forEach(heading => {
      const text = heading.textContent.trim().toLowerCase();
      if (text.includes('click to hide video') || text.includes('click to show video')) {
        heading.remove();
      }
    });

    // Extract and replace video elements with embedded HTML
    cloned.querySelectorAll('video').forEach(video => {
      const src = video.getAttribute('src');
      const poster = video.getAttribute('poster');
      if (src) {
        const videoEmbed = document.createElement('div');
        // Create HTML video tag that will be preserved in markdown
        let videoHTML = `<video src="${src}" controls`;
        if (poster) {
          videoHTML += ` poster="${poster}"`;
        }
        videoHTML += '>Your browser does not support the video tag.</video>';
        videoEmbed.innerHTML = videoHTML;

        // Also add a clickable link that works
        const fallbackLink = document.createElement('p');
        fallbackLink.innerHTML = `<em>🔹 <a href="${src}" target="_blank" rel="noopener noreferrer">Open video in new tab</a></em>`;

        video.parentNode.replaceChild(videoEmbed, video);
        videoEmbed.parentNode.insertBefore(fallbackLink, videoEmbed.nextSibling);
      } else {
        video.remove();
      }
    });

    // Flatten details/summary elements
    cloned.querySelectorAll('details').forEach(details => {
      const summary = details.querySelector('summary');
      if (summary) {
        // Extract the heading from summary if it exists
        const heading = summary.querySelector('h2, h3, h4');
        if (heading) {
          // Insert heading before details element
          details.parentNode.insertBefore(heading.cloneNode(true), details);
        }
        summary.remove();
      }
      // Move all content from details to parent
      while (details.firstChild) {
        details.parentNode.insertBefore(details.firstChild, details);
      }
      details.remove();
    });

    const lines = [];
    const children = Array.from(cloned.children);

    for (const element of children) {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent.trim();

      // Paragraphs
      if (tagName === 'p') {
        // Check for images in the paragraph
        const img = element.querySelector('img');
        if (img) {
          const src = img.getAttribute('src');
          const alt = img.getAttribute('alt') || 'Image';
          if (src) {
            lines.push(`![${alt}](${src})`);
            lines.push('');
          }
        } else if (text) {
          // Process inline formatting
          let formattedText = this.processInlineFormatting(element);
          lines.push(formattedText);
          lines.push('');
        }
        continue;
      }

      // Divs (for callouts and other special content)
      if (tagName === 'div') {
        const className = element.className || '';

        // Handle callout boxes
        if (className.includes('callout')) {
          // Extract callout type (e.g., "lane", "info", "warning")
          const calloutMatch = className.match(/callout-(\w+)/);
          const calloutType = calloutMatch ? calloutMatch[1] : null;

          // Get background image from cache
          const backgroundImage = calloutType ? calloutImages[calloutType] : null;

          const calloutText = element.textContent.trim();
          if (calloutText) {
            // Create styled callout box with image and text side-by-side
            if (backgroundImage) {
              // Use HTML table or div for side-by-side layout that works in markdown
              lines.push('<div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem; align-items: center; background: #1a1a1a; border-left: 5px solid #6b7280; border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">');
              lines.push(`  <img src="${backgroundImage}" alt="Callout: ${calloutType}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />`);
              lines.push(`  <div>${calloutText}</div>`);
              lines.push('</div>');
              lines.push('');
            } else {
              // Fallback to blockquote if no image
              lines.push('> ' + calloutText.replace(/\n/g, '\n> '));
              lines.push('');
            }
          }
          continue;
        }

        // Check for embedded video HTML
        const videoTag = element.querySelector('video');
        if (videoTag) {
          const src = videoTag.getAttribute('src');
          const poster = videoTag.getAttribute('poster');
          if (src) {
            // Output raw HTML for video embedding
            let videoHTML = `<video src="${src}" controls`;
            if (poster) {
              videoHTML += ` poster="${poster}"`;
            }
            videoHTML += '>Your browser does not support the video tag.</video>';
            lines.push(videoHTML);
            lines.push('');
          }
          continue;
        }

        // Check for code blocks within divs
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
          continue;
        }

        // Otherwise just get the text content
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

      // Code blocks (pre elements)
      if (tagName === 'pre') {
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
   * Process inline formatting (bold, italic, code) within an element
   * @param {HTMLElement} element - The element to process
   * @returns {string} Formatted text with markdown
   */
  processInlineFormatting(element) {
    let result = '';

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        const content = Array.from(node.childNodes).map(processNode).join('');

        switch (tagName) {
          case 'strong':
          case 'b':
            return `**${content}**`;
          case 'em':
          case 'i':
            return `*${content}*`;
          case 'code':
            return `\`${content}\``;
          case 'a':
            const href = node.getAttribute('href');
            return href ? `[${content}](${href})` : content;
          default:
            return content;
        }
      }
      return '';
    };

    for (const child of element.childNodes) {
      result += processNode(child);
    }

    return result;
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
