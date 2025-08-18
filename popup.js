const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const focusDurationInput = document.getElementById('focus-duration');
const breakDurationInput = document.getElementById('break-duration');
const longBreakDurationInput = document.getElementById('long-break-duration');
const pomodorosBeforeLongBreakInput = document.getElementById('pomodoros-before-long-break');
const completedPomodorosDisplay = document.getElementById('completed-pomodoros');
const soundOffButton = document.getElementById('sound-off');
const ring = document.getElementById('progress-ring');
const timer = document.getElementById('timer');
const sessionLabel = document.getElementById('session-label');
const R = 54;
const CIRC = 2 * Math.PI * R;

// State
let isFocus = true;
let focusDuration = parseFloat(focusDurationInput.value);
let breakDuration = parseFloat(breakDurationInput.value);
let longBreakDuration = parseFloat(longBreakDurationInput.value);
let pomodorosBeforeLongBreak = parseInt(pomodorosBeforeLongBreakInput.value, 10);
let completedPomodoros = 0;
let timeLeft = 0;
let pomodoroActive = false;
let isRunning = false;
let soundOff = false;
let totalTime = 0;
let endAtEpochMs = 0;

// Initial ring dash config
ring.style.strokeDasharray = `${CIRC} ${CIRC}`;
ring.style.strokeDashoffset = `${CIRC}`;

// Helper: Calculate session total time
function getSessionTotalTime(isFocus, completedPomodoros, focusDuration, breakDuration, longBreakDuration, pomodorosBeforeLongBreak) {
    if (isFocus) return focusDuration * 60;
    if (completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0) return longBreakDuration * 60;
    return breakDuration * 60;
}

// Helper: Set ring progress
function setRing(progress01) {
    const p = Math.min(1, Math.max(0, progress01));
    ring.style.strokeDashoffset = String(CIRC * (1 - p));
}

// Helper: Paint static UI
function paintStatic(isFocus, timeLeftSeconds, totalSeconds) {
    sessionLabel.textContent = isFocus ? 'Focus' : 'Break';
    ring.style.stroke = isFocus
        ? getComputedStyle(document.documentElement).getPropertyValue('--focus')
        : getComputedStyle(document.documentElement).getPropertyValue('--break');
    setRing(1 - (timeLeftSeconds / totalSeconds));
}

// Helper: Update UI
function updateUI(timeLeft, pomodoroActive, totalTime, isFocus) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    if (pomodoroActive) {
        paintStatic(isFocus, timeLeft, totalTime);
    } else {
        paintStatic(isFocus, focusDuration * 60, focusDuration * 60);
    }
}

// Helper: Update user settings in storage
async function updateUserSettings(setting, value) {
    await chrome.storage.sync.set({ [setting]: value });
}

// Restore user settings from storage
async function restoreUserSettings() {
    let settings = await chrome.storage.sync.get(null);
    
    focusDuration = parseFloat(settings.defaultInputFocusDuration) || focusDuration;
    focusDurationInput.value = focusDuration;
    breakDuration = parseFloat(settings.defaultInputBreakDuration) || breakDuration;
    breakDurationInput.value = breakDuration;
    longBreakDuration = parseFloat(settings.defaultInputLongBreakDuration) || longBreakDuration;
    longBreakDurationInput.value = longBreakDuration;
    pomodorosBeforeLongBreak = parseInt(settings.defaultInputPomodorosBeforeLongBreak, 10) || pomodorosBeforeLongBreak;
    pomodorosBeforeLongBreakInput.value = pomodorosBeforeLongBreak;
    pomodoroActive = settings.pomodoroActive ?? pomodoroActive;
    completedPomodoros = settings.completedPomodoros ?? completedPomodoros;
    completedPomodorosDisplay.textContent = completedPomodoros;
    soundOff = settings.soundOff ?? soundOff;
    soundOffButton.classList.toggle('active', soundOff);
    isFocus = settings.isFocus ?? isFocus;
    isRunning = settings.isRunning ?? isRunning;
    sessionLabel.textContent = isFocus ? 'Focus' : 'Break';
    timeLeft = settings.timeLeft ?? focusDuration * 60;
    endAtEpochMs = settings.endAtEpochMs ?? 0;
    totalTime = getSessionTotalTime(isFocus, completedPomodoros, focusDuration, breakDuration, longBreakDuration, pomodorosBeforeLongBreak);
}

// Restore time left from storage
async function restoreTimeLeft() {
    
    if (timeLeft) {
        if (isRunning && endAtEpochMs) {
            const remainingTime = Math.max(0, Math.floor((endAtEpochMs - Date.now()) / 1000));
            timeLeft = remainingTime;
        } else {
            // If not running, restore the stored time left
            timeLeft = timeLeft;
        }
    } else {
        timeLeft = focusDuration * 60; // Default to focus duration if not set
    }
    // timeLeft = storedTimeLeft.timeLeft ?? focusDuration * 60;
    updateUI(timeLeft, pomodoroActive, totalTime, isFocus);
}

// Event listeners
startButton.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
        action: 'startPomodoro',
        focusDuration,
        breakDuration,
        isFocus,
        longBreakDuration,
        pomodorosBeforeLongBreak
    });
});

stopButton.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'stopPomodoro' });
});

resetButton.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'resetPomodoro' });
});

focusDurationInput.addEventListener('change', () => {
    focusDuration = parseFloat(focusDurationInput.value);
    updateUserSettings('defaultInputFocusDuration', focusDuration);
    chrome.storage.sync.get('pomodoroActive').then(data => {
        if (!data.pomodoroActive) {
            updateUI(focusDuration * 60, false, focusDuration * 60, isFocus);
        }
    });
});

breakDurationInput.addEventListener('change', () => {
    breakDuration = parseFloat(breakDurationInput.value);
    updateUserSettings('defaultInputBreakDuration', breakDuration);
});

longBreakDurationInput.addEventListener('change', () => {
    longBreakDuration = parseFloat(longBreakDurationInput.value);
    updateUserSettings('defaultInputLongBreakDuration', longBreakDuration);
});

pomodorosBeforeLongBreakInput.addEventListener('change', () => {
    pomodorosBeforeLongBreak = parseInt(pomodorosBeforeLongBreakInput.value, 10);
    updateUserSettings('defaultInputPomodorosBeforeLongBreak', pomodorosBeforeLongBreak);
});

soundOffButton.addEventListener('click', async () => {
    soundOffButton.classList.toggle('active');
    soundOff = !soundOff;
    updateUserSettings('soundOff', soundOff);
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimerDisplay') {
        updateUI(request.timeLeft, request.pomodoroActive, request.totalTime, request.isFocus);
    } else if (request.action === 'queryStorageAndupdateUI') {
        restoreUserSettings().then(() => {
            restoreTimeLeft();
            setRing(0);
        });
    } else if (request.action === 'updateCompletedPomodoros') {
        chrome.storage.sync.get('completedPomodoros').then(data => {
            completedPomodoros = data.completedPomodoros || 0;
            completedPomodorosDisplay.textContent = completedPomodoros;
        });
    }
});

// Initial load
async function loadOnUIOpen() {
    await restoreUserSettings();
    await restoreTimeLeft();
}

loadOnUIOpen();