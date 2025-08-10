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

let isFocus = true;
let focusDuration = focusDurationInput.value;
let breakDuration = breakDurationInput.value;
let longBreakDuration = longBreakDurationInput.value;
let pomodorosBeforeLongBreak = pomodorosBeforeLongBreakInput.value;
let completedPomodoros = 0;
let timeLeft = 0;
let pomodoroActive = false;
let soundOff = false;
let timerInterval = null;
let totalTime = 0;

// Initial ring dash config
ring.style.strokeDasharray = `${CIRC} ${CIRC}`;
ring.style.strokeDashoffset = `${CIRC}`;

function setRing(progress01) {
    const p = Math.min(1, Math.max(0, progress01));
    ring.style.strokeDashoffset = String(CIRC * (1 - p));
}

function paintStatic(isFocus, timeLeftSeconds, totalSeconds) {
    console.log(timeLeftSeconds, totalSeconds);
    sessionLabel.textContent = isFocus ? 'Focus' : 'Break';
    ring.style.stroke = isFocus ? getComputedStyle(document.documentElement).getPropertyValue('--focus') : getComputedStyle(document.documentElement).getPropertyValue('--break');
    setRing(1 - (timeLeftSeconds / totalSeconds));
}

function animateStep() {
    // Fallback: update once per second from timeLeftSeconds
    clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        if (!isRunning) return;
        timeLeftSeconds = Math.max(0, timeLeftSeconds - 1);
        paintStatic();
        if (timeLeftSeconds <= 0) stop();
    }, 1000);
}

async function restoreTimeLeft() {
    let storedTimeLeft = await chrome.storage.sync.get('timeLeftStored');

    if (storedTimeLeft.timeLeftStored) {
        timeLeft = storedTimeLeft.timeLeftStored;
        // console.log(`Restored time left from popup: ${timeLeft}`);
    } else {
        timeLeft = focusDuration * 60; // Default to focus duration if no stored time
    }
    updateUI(timeLeft, pomodoroActive, totalTime, isFocus);
}

async function restoreUserSettings() {
    let settings = await chrome.storage.sync.get(['focusDurationDefault', 'breakDurationDefault', 'pomodoroActiveStored', 'longBreakDuration', 'completedPomodoros', 'pomodorosBeforeLongBreak', 'soundOff', 'isFocus', 'totalTime']);
    if (settings.focusDurationDefault) {
        focusDuration = settings.focusDurationDefault;
        focusDurationInput.value = focusDuration;
    }
    if (settings.breakDurationDefault) {
        breakDuration = settings.breakDurationDefault;
        breakDurationInput.value = breakDuration;
    }
    if (settings.pomodoroActiveStored !== undefined) {
        pomodoroActive = settings.pomodoroActiveStored;
    }
    if (settings.longBreakDuration) {
        longBreakDuration = settings.longBreakDuration;
        longBreakDurationInput.value = longBreakDuration;
    }
    if (settings.completedPomodoros !== undefined) {
        completedPomodoros = settings.completedPomodoros;
        completedPomodorosDisplay.textContent = completedPomodoros;
    }
    if (settings.pomodorosBeforeLongBreak !== undefined) {
        pomodorosBeforeLongBreak = settings.pomodorosBeforeLongBreak;
        pomodorosBeforeLongBreakInput.value = pomodorosBeforeLongBreak;
    }
    if (settings.soundOff !== undefined) {
        soundOff = settings.soundOff;
        soundOffButton.classList.toggle('active', soundOff);
    }
    if (settings.isFocus !== undefined) {
        isFocus = settings.isFocus;
        sessionLabel.textContent = isFocus ? 'Focus' : 'Break';
        console.log(`Restored isFocus: ${isFocus}`);
    }
    if (settings.totalTime !== undefined) {
        totalTime = settings.totalTime;
        console.log(`Restored totalTime: ${totalTime}`);
    }
    // console.log(`Restored user settings: Focus Duration - ${focusDuration}, Break Duration - ${breakDuration}, Pomodoro Active - ${pomodoroActive}`);
}

async function updateUserSettings(setting, value) {
    let update = await chrome.storage.sync.set({ [setting]: value });
}

function updateUI(timeLeft, pomodoroActive, totalTime, isFocus) {
    if (pomodoroActive) {
        // console.log(typeof (timeLeft));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        pomodoroActive = pomodoroActive
        // chrome.action.setBadgeText(
        //     { text: `${minutes}:${seconds.toString().padStart(2, '0')}` }
        // );
        // console.log(`seconds: ${seconds}`);
        // console.log(`minutes: ${minutes}`);
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        paintStatic(isFocus, timeLeft, totalTime);
    } else {
        const minutes = Math.floor((focusDuration * 60) / 60);
        const seconds = (focusDuration * 60) % 60;
        // console.log(`Updating UI: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateTimerDisplay() {
    if (pomodoroActive) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        chrome.action.setBadgeText(
            { text: `${minutes}:${seconds.toString().padStart(2, '0')}` }
        );
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const minutes = Math.floor((focusDuration * 60) / 60);
        const seconds = (focusDuration * 60) % 60;
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

}

startButton.addEventListener('click', async () => {
    let response = await chrome.runtime.sendMessage({ action: 'startPomodoro', focusDuration, breakDuration, isFocus, longBreakDuration, pomodorosBeforeLongBreak });
    // console.log(response);
});

stopButton.addEventListener('click', async () => {
    let response = await chrome.runtime.sendMessage({ action: 'stopPomodoro' });
    // console.log(response);
});

resetButton.addEventListener('click', async () => {
    let response = await chrome.runtime.sendMessage({ action: 'resetPomodoro' });
    // console.log(response);
});

focusDurationInput.addEventListener('change', () => {
    focusDuration = focusDurationInput.value;
    updateUserSettings('focusDurationDefault', focusDuration);
    chrome.storage.sync.get('pomodoroActiveStored').then(data => {
        const isActive = data.pomodoroActiveStored;
        if (!isActive) {
            console.log(isActive)
            console.log(`Focus duration changed to: ${focusDuration}`);
            updateUI(focusDuration * 60, isActive);
        }
    });
});

breakDurationInput.addEventListener('change', () => {
    breakDuration = breakDurationInput.value;
    updateUserSettings('breakDurationDefault', breakDuration);
    chrome.storage.sync.get('pomodoroActiveStored').then(data => {
        const isActive = data.pomodoroActiveStored;
        if (!isActive) {
            console.log(isActive)
            console.log(`Break duration changed to: ${breakDuration}`);
            updateUI(focusDuration * 60, isActive);
        }
    });
});

longBreakDurationInput.addEventListener('change', () => {
    longBreakDuration = longBreakDurationInput.value;
    updateUserSettings('longBreakDuration', longBreakDuration);
    chrome.storage.sync.get('pomodoroActiveStored').then(data => {
        const isActive = data.pomodoroActiveStored;
        if (!isActive) {
            console.log(isActive)
            console.log(`Long break duration changed to: ${longBreakDuration}`);
            updateUI(focusDuration * 60, isActive);
        }
    });
});

pomodorosBeforeLongBreakInput.addEventListener('change', () => {
    pomodorosBeforeLongBreak = pomodorosBeforeLongBreakInput.value;
    updateUserSettings('pomodorosBeforeLongBreak', pomodorosBeforeLongBreak);
    chrome.storage.sync.get('pomodoroActiveStored').then(data => {
        const isActive = data.pomodoroActiveStored;
        if (!isActive) {
            console.log(isActive)
            console.log(`Pomodoros before long break changed to: ${pomodorosBeforeLongBreak}`);
            updateUI(focusDuration * 60, isActive);
        }
    });
});

soundOffButton.addEventListener('click', async () => {
    soundOffButton.classList.toggle('active');
    soundOff = !soundOff;
    updateUserSettings('soundOff', soundOff);
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimerDisplay') {
        // console.log('Received updateTimerDisplay message:', request);
        updateUI(request.timeLeft, request.pomodoroActive, request.totalTime, request.isFocus);
    } else if (request.action === 'queryStorageAndupdateUI') {
        // console.log('Received queryStorageAndupdateUI message:', request);
        restoreUserSettings().then(() => {
            restoreTimeLeft();
            setRing(0)
        });
    } else if (request.action === 'updateCompletedPomodoros') {
        // console.log('Received updateCompletedPomodoros message:', request);
        chrome.storage.sync.get('completedPomodoros').then(data => {
            completedPomodoros = data.completedPomodoros || 0;
            completedPomodorosDisplay.textContent = completedPomodoros;
        });
    }
});

restoreUserSettings()
restoreTimeLeft()