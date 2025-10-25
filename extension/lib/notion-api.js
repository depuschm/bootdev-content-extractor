// Notion API integration for Boot.dev Content Extractor
// Cross-browser compatible with interview exercise support

const NotionAPI = {
  baseURL: 'https://api.notion.com/v1',
  version: '2022-06-28',

  // Create a new page in a database
  async createPage(token, databaseId, content, version = '1.2.0') {
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
          name: content.exerciseType === 'interview' ? 'Interview' : 'Coding'
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

    // Convert content to Notion blocks
    const children = this.contentToBlocks(content, version);

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
  contentToBlocks(content, version = '1.2.0') {
    const blocks = [];
    const isInterview = content.exerciseType === 'interview';

    // Add description
    if (content.description) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: content.description }
            }
          ]
        }
      });
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
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: example.code } }],
            language: this.mapLanguage(example.language || content.language)
          }
        });
      });
    }

    // Interview-specific content
    if (isInterview) {
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
              blocks.push({
                object: 'block',
                type: 'code',
                code: {
                  rich_text: [{ type: 'text', text: { content: part.content } }],
                  language: this.mapLanguage(part.language || 'plain text')
                }
              });
            } else {
              // Split long text into chunks (Notion has 2000 char limit per rich_text)
              const chunks = this.splitIntoChunks(part.content, 1900);
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

        const chunks = this.splitIntoChunks(content.solution, 1900);
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

          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: file.code } }],
              language: this.mapLanguage(file.language || content.language)
            }
          });
        });
      } else {
        // Fallback to starter code and test code
        if (content.starterCode) {
          blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Starter Code' } }]
            }
          });

          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: content.starterCode } }],
              language: this.mapLanguage(content.language)
            }
          });
        }

        if (content.testCode) {
          blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'Test Code' } }]
            }
          });

          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: content.testCode } }],
              language: this.mapLanguage(content.language)
            }
          });
        }
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

        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: content.solution } }],
            language: this.mapLanguage(content.language)
          }
        });
      }
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
            text: { content: `Extracted with Boot.dev Content Extractor v${version}` },
            annotations: { italic: true }
          }
        ]
      }
    });

    return blocks;
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

  // Map language names to Notion's supported languages
  mapLanguage(lang) {
    const languageMap = {
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'go': 'go',
      'sql': 'sql',
      'c': 'c',
      'cpp': 'c++',
      'rust': 'rust',
      'java': 'java',
      'shell': 'shell',
      'bash': 'bash',
      'json': 'json',
      'yaml': 'yaml',
      'markdown': 'markdown',
      'html': 'html',
      'css': 'css'
    };

    return languageMap[lang?.toLowerCase()] || 'plain text';
  },

  // Capitalize language name for display
  capitalizeLanguage(lang) {
    const specialCases = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'cpp': 'C++',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'yaml': 'YAML'
    };

    const lower = lang?.toLowerCase();
    if (specialCases[lower]) {
      return specialCases[lower];
    }

    return lang ? lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase() : 'Unknown';
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
