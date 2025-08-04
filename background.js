let timerInterval = null;
let focusDuration = 0.1
let breakDuration = 0.1;
let isFocus = true;
let timeLeft = 0;
let pomodoroActive = false;

async function startTimer(params) {
    if (timerInterval) return;

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
        sendMsgToUpdateUI();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            showNotification(`Pomodoro ${isFocus ? "Focus" : "Break"} session complete!`);
            isFocus = !isFocus;
            startTimer();
        }
    }, 1000);
}

async function sendMsgToUpdateUI() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    chrome.action.setBadgeText(
        { text: `${minutes}:${seconds.toString().padStart(2, '0')}` }
    );
    chrome.runtime.sendMessage({
        action: 'updateTimerDisplay',
        timeLeft: timeLeft,
        isFocus: isFocus,
        focusDuration: focusDuration,
        breakDuration: breakDuration
    }).catch((error) => {
        console.warn('No receiver for updateUI — popup may be closed.');
    });
}

function showNotification(message) {
    chrome.notifications.create({
        type: "basic",
        title: "Pomodoro Timer",
        message: message,
        iconUrl: "icons/icon128.png"
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startPomodoro') {
        console.log('Received startPomodoro message:', request);
        focusDuration = request.focusDuration || focusDuration;
        breakDuration = request.breakDuration || breakDuration;
        timeLeft = isFocus ? focusDuration * 60 : breakDuration * 60;
        pomodoroActive = true;
        isFocus = request.isFocus !== undefined ? request.isFocus : isFocus;
        startTimer();
        sendResponse({ status: 'Pomodoro started' });
    }
});
