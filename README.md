# TabTime 🚧 Work in Progress

> A Chrome extension to track time spent on websites with detailed analytics and smart limits.

**Status:** 🔨 Currently in active development

## 🎯 Planned Features

- ⏱️ Real-time website time tracking
- 📊 Detailed analytics and insights
- ⏰ Set time limits for specific websites
- 🔔 Smart notifications
- 🔒 Website blocking capabilities
- 📈 Visual data analytics

## 🛠️ Tech Stack

- React 18
- Vite
- Chrome Extension Manifest V3

## 🚀 Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 📝 Development Workflow

- `npm run dev` - Auto-rebuild on file changes
- `npm run build` - Production build

After making changes, reload the extension in Chrome.

## 📂 Project Structure

```
tabtime/
├── src/          # React source files
├── public/       # Static assets & manifest
├── dist/         # Built extension (generated)
└── vite.config.js
```

---

**Note:** This project is being built incrementally as a learning project.
