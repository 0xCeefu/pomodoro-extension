const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const sendToBgBtn = document.getElementById('sendToBg');
const focusDurationInput = document.getElementById('focus-duration');
const breakDurationInput = document.getElementById('break-duration');

let isFocus = true;
let focusDuration = focusDurationInput.value;
let breakDuration = breakDurationInput.value;
let timeLeft = 0;
let pomodoroActive = false;

let timerInterval = null;

function updateUI(focusDuration, breakDuration, timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    // chrome.action.setBadgeText(
    //     { text: `${minutes}:${seconds.toString().padStart(2, '0')}` }
    // );
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        console.log("Focus");
    } else if (!isFocus && timeLeft <= 0) {
        timeLeft = breakDuration * 60;
        console.log("Break");
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

startButton.addEventListener('click', () => {
    startTimer();
});

stopButton.addEventListener('click', () => {
    pauseTimer();
});

resetButton.addEventListener('click', () => {
    resetTimer();
});

focusDurationInput.addEventListener('change', () => {
    focusDuration = focusDurationInput.value;
    updateTimerDisplay();
});

breakDurationInput.addEventListener('change', () => {
    breakDuration = breakDurationInput.value;
    updateTimerDisplay();
});

sendToBgBtn.addEventListener('click', async () => {
    let response = await chrome.runtime.sendMessage({ action: 'startPomodoro', focusDuration, breakDuration, isFocus });
    console.log(response);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateTimerDisplay') {
        console.log('Received updateTimerDisplay message:', request);
        updateUI(request.focusDuration, request.breakDuration, request.timeLeft);
    }
});


updateTimerDisplay()