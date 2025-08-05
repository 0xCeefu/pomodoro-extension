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
    updateUI(timeLeft, true);
}

function updateUI(timeLeft, pomodoroActive) {
    if (pomodoroActive) {
        console.log(typeof(timeLeft));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
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

function startTimer() {
    if (timerInterval) return;

    pomodoroActive = true
    if (isFocus && timeLeft <= 0) {
        timeLeft = focusDuration * 60;
        // console.log("Focus");
    } else if (!isFocus && timeLeft <= 0) {
        timeLeft = breakDuration * 60;
        // console.log("Break");
    }

    chrome.action.setBadgeBackgroundColor(
        { color: isFocus ? '#00FF00' : '#fa0000ff' }
    );

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            showNotification("Pomodoro session complete!");
            isFocus = !isFocus;
            startTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function showNotification(message) {
    chrome.notifications.create({
        type: "basic",
        title: "Pomodoro Timer",
        message: message,
        iconUrl: "icons/icon128.png"
    });
}

function resetTimer() {
    pauseTimer();
    timeLeft = 0;
    isFocus = true;
    pomodoroActive = false
    updateTimerDisplay();
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
    updateTimerDisplay();
});

breakDurationInput.addEventListener('change', () => {
    breakDuration = breakDurationInput.value;
    updateTimerDisplay();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimerDisplay') {
        // console.log('Received updateTimerDisplay message:', request);
        updateUI(request.timeLeft, request.pomodoroActive);
    }
});

restoreTimeLeft()