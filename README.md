# Pomodoro Timer Extension

A simple, customizable Pomodoro timer Chrome extension to help you focus and manage your work/break cycles.

## Features

- **Configurable Durations:** Set your own focus, break, and long break times.
- **Long Breaks:** Choose how many Pomodoros before a long break.
- **Progress Ring:** Visual timer with animated progress.
- **Session Tracking:** Displays completed Pomodoros.
- **Sound Notifications:** Optional audio alert when a session ends.
- **Persistent State:** Remembers your settings and timer state.
- **Badge Timer:** Shows countdown in the extension icon.
- **Pause/Reset Controls:** Easily pause or reset your timer.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the project folder.

## Usage

- Click the extension icon to open the popup.
- Set your desired durations and Pomodoros per long break.
- Click **Start** to begin a session.
- Use **Pause** or **Reset** as needed.
- Toggle sound notifications with the speaker button.
- The timer and session type are shown in the popup and as a badge.

## File Structure

- `popup.html` — Main UI for the timer.
- `popup.js` — Handles UI logic and Chrome storage.
- `background.js` — Manages timer, notifications, and badge updates.
- `offscreen.html` / `offscreen.js` — Plays notification sounds in the background.
- `style.css` — Styles for the popup.
- `manifest.json` — Chrome extension manifest.

## Credits

- Icons from [Feather Icons](https://feathericons.com/) and custom assets.
- Font: Ubuntu Mono.
- Sound: Custom or open-source ding.

---

MIT License.