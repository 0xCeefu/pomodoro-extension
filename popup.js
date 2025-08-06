const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const focusDurationInput = document.getElementById('focus-duration');
const breakDurationInput = document.getElementById('break-duration');

let isFocus = true;
let focusDuration = focusDurationInput.value;
let breakDuration = breakDurationInput.value;
let timeLeft = 0;
let pomodoroActive = false;

let timerInterval = null;

async function restoreTimeLeft() {
    let storedTimeLeft = await chrome.storage.sync.get('timeLeftStored');

    if (storedTimeLeft.timeLeftStored) {
        timeLeft = storedTimeLeft.timeLeftStored;
        console.log(`Restored time left from popup: ${timeLeft}`);
    } else {
        timeLeft = focusDuration * 60; // Default to focus duration if no stored time
    }
    updateUI(timeLeft, pomodoroActive);
}

async function restoreUserSettings() {
    let settings = await chrome.storage.sync.get(['focusDurationDefault', 'breakDurationDefault', 'pomodoroActiveStored']);
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
    console.log(`Restored user settings: Focus Duration - ${focusDuration}, Break Duration - ${breakDuration}, Pomodoro Active - ${pomodoroActive}`);
}

async function updateUserSettings(setting, value) {
    let update = await chrome.storage.sync.set({ [setting]: value });
}

function updateUI(timeLeft, pomodoroActive) {
    if (pomodoroActive) {
        console.log(typeof (timeLeft));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        pomodoroActive = pomodoroActive
        // chrome.action.setBadgeText(
        //     { text: `${minutes}:${seconds.toString().padStart(2, '0')}` }
        // );
        console.log(`seconds: ${seconds}`);
        console.log(`minutes: ${minutes}`);
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const minutes = Math.floor((focusDuration * 60) / 60);
        const seconds = (focusDuration * 60) % 60;
        console.log(`Updating UI: ${minutes}:${seconds.toString().padStart(2, '0')}`);
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
    let response = await chrome.runtime.sendMessage({ action: 'startPomodoro', focusDuration, breakDuration, isFocus });
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
            console.log(`Focus duration changed to: ${focusDuration}`);
            updateUI(focusDuration * 60, isActive);
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimerDisplay') {
        // console.log('Received updateTimerDisplay message:', request);
        updateUI(request.timeLeft, request.pomodoroActive);
    } else if (request.action === 'queryStorageAndupdateUI') {
        // console.log('Received queryStorageAndupdateUI message:', request);
        restoreUserSettings().then(() => {
            restoreTimeLeft();
        });
    }
});

restoreUserSettings()
restoreTimeLeft()