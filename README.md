# TabTime ⏱️

> A powerful Chrome extension to track your time spent on websites with detailed analytics, smart limits, and intelligent tracking controls.

**Status:** ✅ Production Ready

TabTime helps you understand and manage your browsing habits by providing real-time tracking, comprehensive analytics, and customizable time limits for websites. Built with React and Ant Design for a beautiful, modern user experience.

## ✨ Features

### 📊 Core Tracking
- **Real-time Time Tracking**: Automatically tracks time spent on each website in real-time
- **Background Service Worker**: Continuous tracking even when popup is closed
- **Persistent Storage**: All data persists across browser restarts
- **Date-based Organization**: Time data organized by date for easy analysis

### 📈 Analytics & Insights
- **Today's Activity Dashboard**: View total time and sites visited today
- **7-Day History View**: Full-screen history page with daily breakdowns and top sites
- **Week Summary Card**: Overview of week total and daily average
- **Top Sites Ranking**: See your most visited sites with time breakdown
- **Browser History Sync**: Import estimated time from Chrome's browsing history

### ⏰ Time Limits & Controls
- **Daily Time Limits**: Set custom daily time limits for specific websites
- **Progress Tracking**: Visual progress bars showing limit usage
- **Smart Notifications**: 
  - 80% warning notification
  - 100% limit reached alert
- **Website Blocking**: Automatic redirect to "Time's Up" page when limit exceeded
- **Emergency Override**: One-time emergency access (resets daily)

### 🎛️ Advanced Controls
- **Pause/Resume Tracking**: Toggle tracking on/off with visual indicator
- **Idle Detection**: Automatically pauses tracking when user is idle (5+ minutes)
- **Website Whitelist**: Never track specific websites (useful for work/productive sites)
- **Tab Switching Detection**: Automatically handles tab changes and URL updates
- **Window Focus Handling**: Pauses when browser loses focus

### 🎨 Beautiful UI
- **Ant Design Components**: Modern, polished interface
- **Full-screen History Dashboard**: Professional analytics view
- **Real-time Updates**: Live time counters and progress indicators
- **Responsive Design**: Works perfectly on all screen sizes

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **UI Library**: Ant Design 5
- **Extension**: Chrome Extension Manifest V3
- **Storage**: chrome.storage.local (persistent)
- **APIs**: Chrome Tabs, Storage, History, Notifications, WebNavigation, Idle

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Chrome browser

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tabtime
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

5. **Development Mode** (optional)
   ```bash
   npm run dev
   ```
   This runs a watch mode that rebuilds on file changes.

### Production Build

```bash
npm run build
```

The built extension will be in the `dist` folder.

## 📖 Usage Guide

### Basic Usage

1. **Open the Extension**: Click the TabTime icon in your Chrome toolbar
2. **View Current Site**: See time spent on your current active tab
3. **Check Today's Stats**: View total time and sites visited today
4. **View History**: Click "History" button to see your 7-day activity

### Setting Time Limits

1. Click "Limits" button in the popup (or navigate to `limits.html`)
2. Enter a website domain (e.g., `youtube.com`)
3. Set daily limit in minutes
4. Click "Set Limit"
5. View active limits and remove them as needed

### Pausing Tracking

1. Click the Play/Pause toggle in the popup header
2. Red "Paused" tag will appear when tracking is paused
3. Toggle again to resume tracking

### Whitelisting Sites

1. Navigate to a website you want to whitelist
2. Open TabTime popup
3. Click "Whitelist" button on the current site card
4. The site will never be tracked

### Emergency Override

If you hit a time limit but need urgent access:
1. You'll see the blocked page
2. Click "Override" button in the warning alert
3. One-time access granted for today only
4. Limit resets at midnight

### Importing Browser History

1. Open the History page
2. Click "🔄 Import Browser History" button
3. Wait for analysis (processes up to 10,000 history items)
4. View imported estimated time data

## 📁 Project Structure

```
tabtime/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icon-*.png             # Extension icons
├── src/
│   ├── background/
│   │   └── background.js      # Service worker (tracking logic)
│   ├── popup/
│   │   ├── popup.html         # Popup HTML
│   │   ├── popup.jsx          # Popup React component
│   │   └── popup.css          # Popup styles
│   ├── history/
│   │   ├── history.html       # History page HTML
│   │   ├── history.jsx        # History React component
│   │   └── history.css        # History styles
│   ├── limits/
│   │   ├── limits.html        # Limits page HTML
│   │   ├── limits.jsx         # Limits React component
│   │   └── limits.css         # Limits styles
│   └── blocked/
│       ├── blocked.html       # Blocked page HTML
│       ├── blocked.jsx        # Blocked page component
│       └── blocked.css        # Blocked page styles
├── dist/                      # Built extension (gitignored)
├── vite.config.js             # Vite build configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🔧 Development

### File Structure

- **Background Script** (`src/background/background.js`): Handles all tracking logic, storage, and message passing
- **Popup** (`src/popup/`): Main extension interface
- **History Page** (`src/history/`): Full-screen analytics dashboard
- **Limits Page** (`src/limits/`): Time limit management
- **Blocked Page** (`src/blocked/`): "Time's Up" page shown when limit exceeded

### Key Components

#### Background Service Worker
- Continuous time tracking
- Tab change detection
- Window focus handling
- Idle detection
- Notification management
- Blocking logic
- Data persistence

#### Popup Interface
- Current site display
- Today's activity stats
- Week summary card
- Pause/resume toggle
- Whitelist button
- Quick navigation buttons

#### History Dashboard
- 7-day activity timeline
- Weekly summary statistics
- Top sites per day
- Browser history import
- Full-screen responsive design

## 📝 Permissions Explained

- **tabs**: Access active tab information for tracking
- **storage**: Store tracking data persistently
- **history**: Import browser history for time estimation
- **notifications**: Send time limit warnings and alerts
- **webNavigation**: Block websites when limits are exceeded
- **idle**: Detect when user is idle to pause tracking

## 🎯 Future Enhancements
- 📈 Visual charts and graphs
- 📊 Weekly/monthly analytics reports
- 🎯 Custom block schedules (e.g., block during work hours)
- 📤 Export data as CSV/JSON
- ☁️ Cloud sync across devices
- 🔔 Customizable notification preferences
- 🎨 Dark mode theme
- 📱 Mobile companion app

## 🐛 Troubleshooting

### Extension not tracking time
- Ensure extension is enabled in `chrome://extensions/`
- Check that the background service worker is running
- Reload the extension if needed
- Verify permissions are granted

### History import not working
- Ensure Chrome history permissions are granted
- Check that you have browsing history available
- Large history imports may take a few minutes

### Limits not blocking
- Verify the limit is set correctly
- Check that time has actually exceeded the limit
- Reload extension if blocking seems delayed

### Data not persisting
- Check Chrome storage quota
- Clear browser data if needed (will reset TabTime data)
- Verify extension has storage permissions

## 🤝 Contributing

Contributions are welcome! This is an active project with ongoing development.

## 📄 License

MIT License - feel free to use this project for learning or as a base for your own extensions.

## 🙏 Acknowledgments

Built with:
- React
- Ant Design
- Chrome Extension APIs
- Vite

---

**Made with ⏱️ by developers, for developers who want to understand their browsing habits.**
