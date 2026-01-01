// Notion API integration for Boot.dev Content Extractor
// Cross-browser compatible with interview, multiple-choice, free-text, CLI exercise, and rating support

const NotionAPI = {
  baseURL: 'https://api.notion.com/v1',
  version: '2022-06-28',

  // Notion API limits
  MAX_RICH_TEXT_LENGTH: 2000,  // Maximum characters per rich_text item
  MAX_TEXT_BLOCK_LENGTH: 2000,  // Maximum characters per text block

  // Create a new page in a database
  async createPage(token, databaseId, content) {
    const url = `${this.baseURL}/pages`;

    const properties = {
      title: {
        title: [
          {
            text: {
              content: content.title || 'Untitled'
            }
          }
        ]
      }
    };

    // Add optional properties if they exist in your database
    if (content.type) {
      properties['Type'] = {
        select: {
          name: content.type === 'challenge' ? 'Challenge' : 'Lesson'
        }
      };
    }

    if (content.exerciseType) {
      properties['Exercise Type'] = {
        select: {
          name: content.exerciseType === 'interview' ? 'Interview' :
            content.exerciseType === 'multiple-choice' ? 'Multiple Choice' :
              content.exerciseType === 'free-text' ? 'Free Text' :
                content.exerciseType === 'cli' ? 'CLI' : 'Coding'
        }
      };
    }

    if (content.language) {
      properties['Language'] = {
        select: {
          name: this.capitalizeLanguage(content.language)
        }
      };
    }

    if (content.url) {
      properties['URL'] = {
        url: content.url
      };
    }

    // Add Rating property if rating exists and is greater than 0
    if (content.rating && content.rating > 0) {
      properties['Rating'] = {
        number: content.rating
      };
    }

    // Convert content to Notion blocks
    const children = this.contentToBlocks(content);

    const body = {
      parent: {
        database_id: databaseId
      },
      properties: properties,
      children: children
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.version
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Notion API error: ${response.status}`);
    }

    return await response.json();
  },

  // Convert extracted content to Notion blocks
  contentToBlocks(content) {
    const blocks = [];
    const isInterview = content.exerciseType === Config.EXERCISE_TYPES.INTERVIEW;
    const isMultipleChoice = content.exerciseType === Config.EXERCISE_TYPES.MULTIPLE_CHOICE;
    const isFreeText = content.exerciseType === Config.EXERCISE_TYPES.FREE_TEXT;
    const isCLI = content.exerciseType === Config.EXERCISE_TYPES.CLI;

    // Parse description markdown to blocks
    if (content.description) {
      const descriptionBlocks = this.parseMarkdownToBlocks(content.description, content.language);
      blocks.push(...descriptionBlocks);
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    }

    // Add requirements
    if (content.requirements && content.requirements.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Requirements' } }]
        }
      });

      content.requirements.forEach(req => {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ type: 'text', text: { content: req } }]
          }
        });
      });
    }

    // Add notes
    if (content.notes && content.notes.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Notes' } }]
        }
      });

      content.notes.forEach(note => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: note } }]
          }
        });
      });
    }

    // Add examples
    if (content.examples && content.examples.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Examples' } }]
        }
      });

      content.examples.forEach(example => {
        const codeChunks = this.splitIntoChunks(example.code, this.MAX_RICH_TEXT_LENGTH);
        codeChunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
              language: this.mapLanguage(example.language || content.language)
            }
          });
        });
      });
    }

    // Multiple-choice specific content
    if (isMultipleChoice && content.multipleChoice) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Question' } }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: content.multipleChoice.question } }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Options' } }]
        }
      });

      content.multipleChoice.options.forEach(option => {
        const emoji = option.isSelected ? '✅' : '⬜';
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: `${emoji} ${option.index}. ${option.text}` } }
            ]
          }
        });
      });

      if (content.multipleChoice.selectedAnswer) {
        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{
              type: 'text',
              text: { content: `Selected Answer: Option ${content.multipleChoice.selectedAnswer}` }
            }],
            icon: { type: 'emoji', emoji: '👉' },
            color: 'blue_background'
          }
        });
      }
    }
    // CLI specific content
    else if (isCLI && content.cli) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'CLI Commands' } }]
        }
      });

      if (content.cli.runCommand) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: 'Run Command' } }]
          }
        });

        const runChunks = this.splitIntoChunks(content.cli.runCommand, this.MAX_RICH_TEXT_LENGTH);
        runChunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
              language: 'shell'
            }
          });
        });
      }

      if (content.cli.submitCommand) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: 'Submit Command' } }]
          }
        });

        const submitChunks = this.splitIntoChunks(content.cli.submitCommand, this.MAX_RICH_TEXT_LENGTH);
        submitChunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
              language: 'shell'
            }
          });
        });
      }

      if (content.cli.checks && content.cli.checks.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Validation Checks' } }]
          }
        });

        content.cli.checks.forEach(check => {
          // Create nested structure for checks with expectations
          const checkBlock = {
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{ type: 'text', text: { content: `Command: ${check.command}` } }]
            }
          };

          // Add expectations as children (indented)
          if (check.expectations && check.expectations.length > 0) {
            checkBlock.numbered_list_item.children = check.expectations.map(expectation => ({
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: expectation } }]
              }
            }));
          }

          blocks.push(checkBlock);
        });
      }

      if (content.cli.instructions) {
        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{
              type: 'text',
              text: { content: content.cli.instructions }
            }],
            icon: { type: 'emoji', emoji: '💡' },
            color: 'blue_background'
          }
        });
      }
    }
    // Free-text specific content
    else if (isFreeText && content.freeText) {
      if (content.freeText.userAnswer) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'My Answer' } }]
          }
        });

        const chunks = this.splitIntoChunks(content.freeText.userAnswer, this.MAX_TEXT_BLOCK_LENGTH);
        chunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: chunk } }]
            }
          });
        });
      }

      if (content.freeText.checks && content.freeText.checks.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Validation Checks' } }]
          }
        });

        content.freeText.checks.forEach(check => {
          // Create nested structure for checks with expected values
          const checkBlock = {
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{ type: 'text', text: { content: check.description } }]
            }
          };

          // Add expected values as children (indented)
          if (check.expectedValues && check.expectedValues.length > 0) {
            checkBlock.numbered_list_item.children = check.expectedValues.map(value => ({
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: value } }]
              }
            }));
          }

          blocks.push(checkBlock);
        });
      }
    }
    // Interview-specific content
    else if (isInterview) {
      if (content.interviewMessages && content.interviewMessages.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Interview Transcript' } }]
          }
        });

        content.interviewMessages.forEach(msg => {
          // Add speaker as heading
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: msg.speaker } }]
            }
          });

          // Parse message content to separate text and code blocks
          const parts = this.parseMessageContent(msg.content);

          parts.forEach(part => {
            if (part.type === 'code') {
              const codeChunks = this.splitIntoChunks(part.content, this.MAX_RICH_TEXT_LENGTH);
              codeChunks.forEach(chunk => {
                blocks.push({
                  object: 'block',
                  type: 'code',
                  code: {
                    rich_text: [{ type: 'text', text: { content: chunk } }],
                    language: this.mapLanguage(part.language || 'plain text')
                  }
                });
              });
            } else {
              // Split long text into chunks (Notion has character limit per rich_text)
              const chunks = this.splitIntoChunks(part.content, this.MAX_TEXT_BLOCK_LENGTH);
              chunks.forEach(chunk => {
                blocks.push({
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [{ type: 'text', text: { content: chunk } }]
                  }
                });
              });
            }
          });
        });
      }

      // Add expected points (solution)
      if (content.expectedPoints && content.expectedPoints.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Official Solution' } }]
          }
        });

        content.expectedPoints.forEach(point => {
          blocks.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: [{ type: 'text', text: { content: point.point } }]
            }
          });
        });
      } else if (content.solution && !content.solution.includes('not available')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Official Solution' } }]
          }
        });

        const chunks = this.splitIntoChunks(content.solution, this.MAX_TEXT_BLOCK_LENGTH);
        chunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: chunk } }]
            }
          });
        });
      }
    } else {
      // Coding exercise content
      if (content.allFiles && content.allFiles.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Code Files' } }]
          }
        });

        content.allFiles.forEach(file => {
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: file.fileName } }]
            }
          });

          const codeChunks = this.splitIntoChunks(file.code, this.MAX_RICH_TEXT_LENGTH);
          codeChunks.forEach(chunk => {
            blocks.push({
              object: 'block',
              type: 'code',
              code: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
                language: this.mapLanguage(file.language || content.language)
              }
            });
          });
        });
      }

      // Add solution if available
      if (content.solution && !content.solution.includes('not available')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Official Solution' } }]
          }
        });

        const solutionChunks = this.splitIntoChunks(content.solution, this.MAX_RICH_TEXT_LENGTH);
        solutionChunks.forEach(chunk => {
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
              language: this.mapLanguage(content.language)
            }
          });
        });
      }
    }

    // Add chat conversations if available
    if (content.chats && content.chats.length > 0) {
      blocks.push({ object: 'block', type: 'divider', divider: {} });

      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '💬 Chat Conversations' } }]
        }
      });

      content.chats.forEach((chat, chatIndex) => {
        // Add chat title
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: chat.title } }]
          }
        });

        // Add each message in the chat
        chat.messages.forEach(msg => {
          // Determine emoji based on speaker
          const emoji = msg.speaker === Config.SPEAKERS.BOOTS ? '🤖' : '👤';

          // Add speaker as a heading with emoji
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [
                { type: 'text', text: { content: `${emoji} ${msg.speaker}` } }
              ]
            }
          });

          // Parse message content as markdown to get proper formatting
          const messageBlocks = this.parseMarkdownToBlocks(msg.content, content.language);
          blocks.push(...messageBlocks);
        });

        // Add divider between chats (except after the last one)
        if (chatIndex < content.chats.length - 1) {
          blocks.push({ object: 'block', type: 'divider', divider: {} });
        }
      });
    }

    // Add footer
    blocks.push({ object: 'block', type: 'divider', divider: {} });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: `Extracted with Boot.dev Content Extractor v${Config.getExtensionVersion()}` },
            annotations: { italic: true }
          }
        ]
      }
    });

    return blocks;
  },

  // Parse markdown description to Notion blocks
  parseMarkdownToBlocks(markdown, defaultLanguage = 'python') {
    const blocks = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        i++;
        continue;
      }

      // Video placeholders (HTML video tags)
      if (line.includes('<video')) {
        const srcMatch = line.match(/src="(.*?)"/);
        if (srcMatch) {
          const videoUrl = srcMatch[1];
          // Add video embed block
          blocks.push({
            object: 'block',
            type: 'video',
            video: {
              type: 'external',
              external: { url: videoUrl }
            }
          });
        }
        // Skip video-related lines until we're past the video tag
        while (i < lines.length && !lines[i].includes('</video>')) {
          i++;
        }
        i++; // Skip closing </video>
        continue;
      }

      // Callout boxes (HTML divs with grid display)
      if (line.includes('<div style="display: grid')) {
        // Extract image and text from the callout HTML structure
        let calloutText = '';
        let calloutImage = '';
        let htmlLines = [line];

        // Collect all lines until we find the outer closing </div>
        let divDepth = 1; // We started with opening <div>
        while (i < lines.length - 1 && divDepth > 0) {
          i++;
          htmlLines.push(lines[i]);

          // Count opening and closing divs
          const openDivs = (lines[i].match(/<div[^>]*>/g) || []).length;
          const closeDivs = (lines[i].match(/<\/div>/g) || []).length;
          divDepth += openDivs - closeDivs;

          if (divDepth === 0) break;
        }

        // Parse the collected HTML
        const htmlString = htmlLines.join('\n');

        // Extract image URL
        const imgMatch = htmlString.match(/<img src="(.*?)"/);
        if (imgMatch) {
          calloutImage = imgMatch[1];
        }

        // Extract text content - get everything between the inner <div> tags
        // The structure is: outer div -> img -> inner div with text
        const innerDivMatch = htmlString.match(/<div>([^]*?)<\/div>\s*<\/div>/);
        if (innerDivMatch) {
          calloutText = innerDivMatch[1].trim();
        }

        // Create callout block with custom layout for better image display
        if (calloutText) {
          if (calloutImage) {
            // Use toggle block instead of quote to avoid empty line
            blocks.push({
              object: 'block',
              type: 'toggle',
              toggle: {
                rich_text: [{ type: 'text', text: { content: '📌 Note' } }],
                color: 'gray_background',
                children: [
                  {
                    object: 'block',
                    type: 'image',
                    image: {
                      type: 'external',
                      external: { url: calloutImage }
                    }
                  },
                  {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                      rich_text: this.parseRichText(calloutText)
                    }
                  }
                ]
              }
            });
          } else {
            // No image - use regular callout with emoji
            const calloutBlock = {
              object: 'block',
              type: 'callout',
              callout: {
                rich_text: this.parseRichText(calloutText),
                color: 'gray_background',
                icon: {
                  type: 'emoji',
                  emoji: 'ℹ️'
                }
              }
            };
            blocks.push(calloutBlock);
          }
        }
        i++; // Move to next line after callout
        continue;
      }

      // Headings
      if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: this.parseRichText(line.substring(3).trim())
          }
        });
        i++;
        continue;
      }

      if (line.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: this.parseRichText(line.substring(4).trim())
          }
        });
        i++;
        continue;
      }

      // Images
      if (line.match(/^!\[.*?\]\(.*?\)/)) {
        const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const url = match[2];
          blocks.push({
            object: 'block',
            type: 'image',
            image: {
              type: 'external',
              external: { url: url }
            }
          });
        }
        i++;
        continue;
      }

      // Code blocks
      if (line.startsWith('```')) {
        const language = line.substring(3).trim() || defaultLanguage;
        const codeLines = [];
        i++;

        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```

        if (codeLines.length > 0) {
          const codeContent = codeLines.join('\n');
          const codeChunks = this.splitIntoChunks(codeContent, this.MAX_RICH_TEXT_LENGTH);
          codeChunks.forEach(chunk => {
            blocks.push({
              object: 'block',
              type: 'code',
              code: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
                language: this.mapLanguage(language)
              }
            });
          });
        }
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].substring(2));
          i++;
        }

        blocks.push({
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: this.parseRichText(quoteLines.join('\n'))
          }
        });
        continue;
      }

      // Bulleted lists
      if (line.match(/^[\-\*]\s/)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^[\-\*]\s/)) {
          items.push(lines[i].substring(2).trim());
          i++;
        }

        items.forEach(item => {
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: this.parseRichText(item)
            }
          });
        });
        continue;
      }

      // Numbered lists
      if (line.match(/^\d+\.\s/)) {
        const items = [];
        while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
          items.push(lines[i].replace(/^\d+\.\s/, '').trim());
          i++;
        }

        items.forEach(item => {
          blocks.push({
            object: 'block',
            type: 'numbered_list_item',
            numbered_list_item: {
              rich_text: this.parseRichText(item)
            }
          });
        });
        continue;
      }

      // Regular paragraphs - now with rich text parsing
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: this.parseRichText(line)
        }
      });
      i++;
    }

    return blocks;
  },

  // Parse markdown text into Notion rich_text format with proper annotations
  parseRichText(text) {
    if (!text || !text.trim()) {
      return [{ type: 'text', text: { content: '' } }];
    }

    const richText = [];
    let currentPos = 0;

    // Regex patterns for markdown formatting (order matters!)
    const patterns = [
      { regex: /\*\*\*(.+?)\*\*\*/g, type: 'bold_italic' },   // ***text*** - bold + italic
      { regex: /\*\*(.+?)\*\*/g, type: 'bold' },              // **text** - bold
      { regex: /\*(.+?)\*/g, type: 'italic' },                // *text* - italic
      { regex: /`(.+?)`/g, type: 'code' },                    // `text` - code
      { regex: /\[(.+?)\]\((.+?)\)/g, type: 'link' }          // [text](url) - link
    ];

    // Find all matches for all patterns
    const allMatches = [];
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          type: pattern.type,
          start: match.index,
          end: regex.lastIndex,
          fullMatch: match[0],
          content: match[1],
          url: match[2] // For links
        });
      }
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Filter out overlapping matches (keep the first one)
    const validMatches = [];
    let lastEnd = -1;
    allMatches.forEach(match => {
      if (match.start >= lastEnd) {
        validMatches.push(match);
        lastEnd = match.end;
      }
    });

    // Build rich text array
    validMatches.forEach(match => {
      // Add plain text before this match
      if (match.start > currentPos) {
        const plainText = text.substring(currentPos, match.start);
        if (plainText) {
          richText.push({
            type: 'text',
            text: { content: plainText }
          });
        }
      }

      // Add formatted text
      const annotations = {};
      if (match.type === 'bold' || match.type === 'bold_italic') {
        annotations.bold = true;
      }
      if (match.type === 'italic' || match.type === 'bold_italic') {
        annotations.italic = true;
      }
      if (match.type === 'code') {
        annotations.code = true;
      }

      if (match.type === 'link') {
        richText.push({
          type: 'text',
          text: {
            content: match.content,
            link: { url: match.url }
          }
        });
      } else {
        richText.push({
          type: 'text',
          text: { content: match.content },
          annotations: annotations
        });
      }

      currentPos = match.end;
    });

    // Add remaining plain text
    if (currentPos < text.length) {
      const plainText = text.substring(currentPos);
      if (plainText) {
        richText.push({
          type: 'text',
          text: { content: plainText }
        });
      }
    }

    // If no formatting was found, return plain text
    if (richText.length === 0) {
      return [{ type: 'text', text: { content: text } }];
    }

    // Split any rich text items that exceed the limit
    const finalRichText = [];
    richText.forEach(item => {
      const content = item.text.content;
      if (content.length <= this.MAX_RICH_TEXT_LENGTH) {
        finalRichText.push(item);
      } else {
        // Split into chunks
        const chunks = this.splitIntoChunks(content, this.MAX_RICH_TEXT_LENGTH);
        chunks.forEach(chunk => {
          finalRichText.push({
            ...item,
            text: { ...item.text, content: chunk }
          });
        });
      }
    });

    return finalRichText;
  },

  // Parse message content to separate text and code blocks
  parseMessageContent(content) {
    const parts = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const text = content.substring(lastIndex, match.index).trim();
        if (text) {
          parts.push({ type: 'text', content: text });
        }
      }

      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'plain text',
        content: match[2].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < content.length) {
      const text = content.substring(lastIndex).trim();
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }

    // If no code blocks found, return entire content as text
    if (parts.length === 0 && content.trim()) {
      parts.push({ type: 'text', content: content.trim() });
    }

    return parts;
  },

  // Split text into chunks to avoid Notion's character limits
  splitIntoChunks(text, maxLength) {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxLength;

      // Try to break at a natural boundary (newline, period, space)
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n', end);
        const lastPeriod = text.lastIndexOf('.', end);
        const lastSpace = text.lastIndexOf(' ', end);

        const breakPoint = Math.max(lastNewline, lastPeriod, lastSpace);
        if (breakPoint > start) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.substring(start, end));
      start = end;
    }

    return chunks;
  },

  // Map language names to Notion's supported languages (uses Config)
  mapLanguage(lang) {
    return Config.mapLanguageToNotion(lang);
  },

  // Capitalize language name for display (uses Config)
  capitalizeLanguage(lang) {
    return Config.getLanguageDisplayName(lang);
  },

  // Test connection to Notion
  async testConnection(token, databaseId) {
    try {
      const url = `${this.baseURL}/databases/${databaseId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to connect: ${response.status}`);
      }

      return { success: true, database: await response.json() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotionAPI;
}
