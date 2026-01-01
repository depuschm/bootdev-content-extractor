# ⚡ Boot.dev Content Extractor

> **Never lose your coding progress again!** Extract challenges, lessons, solutions, and chat conversations from [Boot.dev](https://boot.dev) and save them to Notion, Markdown, or JSON.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Download-orange)](https://addons.mozilla.org)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Download-blue)](https://chrome.google.com/webstore)

---

## ✨ Features

### 📚 **Complete Content Extraction**
- **Coding Challenges** - Extract all code files, solutions, and requirements
- **Interview Exercises** - Save full conversation transcripts and acceptance criteria
- **Multiple Choice Questions** - Capture questions, options, and your selections
- **Free-text Exercises** - Save your answers and validation checks
- **CLI Exercises** - Export commands and expected outputs
- **Lessons** - Extract all educational content with proper formatting

### 🎯 **Smart Features**
- **Auto-open Solutions** - Automatically reveals solutions before extraction
- **Multi-file Support** - Extracts all code tabs in complex challenges
- **Chat History** - Saves your Boots AI conversations with code blocks
- **Rich Formatting** - Preserves code blocks, lists, callouts, and images
- **Rating Tracking** - Records your challenge ratings (1-5 stars)

### 📤 **Flexible Export Options**
- **Notion Integration** - Send directly to organized Notion databases
- **Markdown Files** - Beautiful, readable `.md` format
- **JSON Export** - Structured data for further processing
- **Plain Text** - Simple `.txt` files
- **Copy to Clipboard** - Instant paste anywhere

### ⚙️ **Customizable**
- Multiple Notion database support (by exercise type)
- Toggle solution extraction on/off
- Include/exclude metadata and chat conversations
- Choose your preferred export format

---

## 🚀 Installation

### Firefox
1. Download from [Firefox Add-ons](https://addons.mozilla.org) (coming soon)
2. Or install manually: `about:debugging` → Load Temporary Add-on → Select `manifest.json`

### Chrome / Edge / Brave
1. Download from [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
2. Or install manually:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

---

## 📖 Quick Start

1. **Navigate** to any Boot.dev challenge or lesson
2. **Click** the extension icon (⚡)
3. **Extract** your content with one click
4. **Choose** to download, copy, or send to Notion

That's it! Your progress is now safely backed up.

---

## 🔗 Notion Integration Setup

Transform your Boot.dev learning into a searchable knowledge base!

### Step 1: Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it (e.g., "Boot.dev Content Extractor")
4. Select your workspace
5. Go to the **Configuration** tab
6. Copy the **Internal Integration Secret** (starts with `ntn_`)

### Step 2: Create Notion Databases

Create one or more databases for different exercise types. Here's a recommended setup:

#### Database 1: "Boot.dev Challenges"
Properties to add:
- **Type** (Select): Challenge, Lesson
- **Exercise Type** (Select): Coding, Interview, Multiple Choice, Free Text, CLI
- **Language** (Select): Python, JavaScript, Go, etc.
- **URL** (URL): Link back to the exercise
- **Rating** (Number): Your rating (1-5)
- **Date** (Date): When you completed it

#### Database 2: "Boot.dev Lessons" (Optional)
Same properties as above, or customize to your needs!

#### Database 3: "Other" (Fallback)
Catches any unmatched content types.

### Step 3: Connect Databases to Integration

For **each database**:
1. Open the database in Notion
2. Click the **"..."** menu (top right)
3. Select **"+ Add connections"**
4. Choose your integration

### Step 4: Get Database IDs

For **each database**:
1. Open the database as a full page
2. Copy the URL - it looks like:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=...
   ```
3. The **DATABASE_ID** is the 32-character code (letters and numbers)

### Step 5: Configure the Extension

1. Click the extension icon
2. Click **"Options"**
3. Enable **"Notion integration"**
4. Paste your **Integration Secret**
5. Add your databases:
   - **Type name**: `challenge`, `lesson`, `other` (or custom names)
   - **Database ID**: The 32-character code from Step 4
6. Click **"Test Notion Connection"** to verify
7. Click **"Save Settings"**

### 📋 Recommended Database Structure

```
📁 Boot.dev Challenges
  ├─ challenge → Your main challenges database
  ├─ lesson    → Lessons and tutorials  
  └─ other     → Fallback for everything else
```

The extension automatically matches content type to database. If no match is found, it uses the "other" database!

---

## 🎨 What Gets Exported?

### For Coding Challenges:
- Title and description with rich formatting
- All requirements and examples
- Multiple code files (if tabs exist)
- Your solution attempt
- Official solution (if unlocked)
- Chat conversations with Boots
- Star rating

### For Interview Exercises:
- Full conversation transcript
- Your responses and Boots' questions
- Acceptance criteria (solution)
- Code blocks with syntax highlighting

### For Multiple Choice:
- Question text
- All answer options
- Your selected answer (if solution extraction enabled)

### For Free-text:
- Your written answer
- Validation checks and expected values

### For CLI Exercises:
- Run and submit commands
- Validation checks with expected outputs
- Instructions

---

## ⚙️ Configuration Options

Access via **Options** button in the popup:

### Extraction Options
- **Extract solution when available** - Include official solutions
- **Automatically open solutions** - Reveals solutions before extraction
- **Extract chat conversations** - Save Boots AI discussions
- **Include metadata** - Add URL, timestamp, and other info

### Export Format
- **Markdown** (recommended) - Rich formatting, code blocks
- **JSON** - Structured data for developers
- **Plain Text** - Simple, universal format

### Notion Integration
- **Enable/disable** Notion sending
- **Integration token** - Your secret key
- **Multiple databases** - Organize by type
- **Test connection** - Verify setup

---

## 🛠️ Technical Details

### Supported Languages
Python, JavaScript, TypeScript, Go, SQL, C, C++, Rust, Java, Shell, and more!

### Browser Compatibility
- ✅ Firefox 109+
- ✅ Chrome/Chromium
- ✅ Edge
- ✅ Brave
- ✅ Any Chromium-based browser

### Permissions
- `activeTab` - Read content from current Boot.dev page
- `storage` - Save your settings
- `boot.dev/*` - Access Boot.dev pages
- `api.notion.com/*` - Send to Notion (optional)

### Privacy
- **No tracking** - Zero analytics or data collection
- **Local processing** - All extraction happens in your browser
- **Your data** - Nothing is sent anywhere except Notion (if you enable it)
- **Open source** - Audit the code yourself!

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/bootdev-extractor.git
cd bootdev-extractor

# Load in browser
# Firefox: about:debugging → Load Temporary Add-on → manifest.json
# Chrome: chrome://extensions → Load unpacked → select folder
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🐛 Bug Reports & Feature Requests

Found a bug? Have an idea? [Open an issue](https://github.com/yourusername/bootdev-extractor/issues)!

---

## ⭐ Show Your Support

If this extension helped you, consider:
- ⭐ **Starring** this repository
- 🐦 **Sharing** with fellow Boot.dev learners
- ☕ **Buying me a coffee** (link coming soon!)

---

## 📚 FAQ

**Q: Do I need a Notion account?**  
A: No! You can export to Markdown, JSON, or plain text without Notion.

**Q: Can I use multiple Notion databases?**  
A: Yes! Configure different databases for challenges, lessons, and other types.

**Q: Does this work with paid Boot.dev content?**  
A: Yes, it extracts any challenge or lesson you have access to.

**Q: Is my data safe?**  
A: Absolutely. Nothing is collected or sent anywhere except your chosen Notion database.

**Q: Can I customize the export format?**  
A: Currently Markdown, JSON, and plain text are supported. Custom templates coming soon!

---

## 🎓 Built for Learners

Made with ❤️ by a Boot.dev student, for Boot.dev students.

**Happy learning! 🚀**

---

## 📬 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com
- Boot.dev: [@yourbootdevusername](https://boot.dev/u/yourbootdevusername)
