# TabTime 🚧 Work in Progress

> A Chrome extension to track time spent on websites with detailed analytics and smart limits.

**Status:** 🔨 Currently in active development

## ✅ Implemented Features

- ✅ Display current tab domain
- ✅ Real-time time tracking per website
- ✅ Background service worker for continuous tracking
- ✅ Automatic tab switching detection
- ✅ Persistent storage (data survives browser restarts)
- ✅ Today's total statistics (total time + sites count)
- ✅ Date-based data organization
- ✅ Top sites list (ranked top 10 with visual badges)
- ✅ 7-day history view (dedicated page with daily breakdowns)
- ✅ Browser history import (automatically sync past 7 days)
- ✅ Set time limits for websites (daily limits with progress tracking)

## 🎯 Upcoming Features

- 🔔 Smart notifications (warnings & limit exceeded alerts)
- 🔒 Website blocking capabilities
- 📈 Visual data analytics dashboard

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
