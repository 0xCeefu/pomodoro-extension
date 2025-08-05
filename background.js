let timerInterval = null;
let focusDuration = 0.1
let breakDuration = 0.1;
let isFocus = true;
let timeLeft = 0;
let pomodoroActive = false;

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ timeLeftStored: focusDuration * 60 }).then(() => {
        console.log(`Time left stored: ${focusDuration * 60}`);
    });
});

async function startTimer(reqIsFocus, reqFocusDuration, reqBreakDuration) {
    if (timerInterval) return;

    if (timeLeft <= 0) {
        isFocus = reqIsFocus
        focusDuration = reqFocusDuration || focusDuration;
        breakDuration = reqBreakDuration || breakDuration;
        timeLeft = isFocus ? focusDuration * 60 : breakDuration * 60;
        // console.log("Focus");
    }

    chrome.action.setBadgeBackgroundColor(
        { color: isFocus ? '#00FF00' : '#fa0000ff' }
    );

    chrome.storage.sync.get(['timeLeftStored']).then((result) => {
        if (result.timeLeftStored) {
            console.log(`Restored time left: ${result.timeLeftStored}`);
        }
    }).catch((error) => {
        console.error('Error retrieving timeLeftStored:', error);
    });

    timerInterval = setInterval(() => {
        timeLeft--;
        sendMsgToUpdateUI();
        chrome.storage.sync.set({ timeLeftStored: timeLeft }).then(() => {
            console.log(`Time left stored: ${timeLeft}`);
        });

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            showNotification(`Pomodoro ${isFocus ? "Focus" : "Break"} session complete!`);
            isFocus = !isFocus;
            startTimer(isFocus);
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
        pomodoroActive: pomodoroActive
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
        // console.log('Received startPomodoro message:', request);
        pomodoroActive = true;

        startTimer(request.isFocus, request.focusDuration, request.breakDuration);
        sendResponse({ status: 'Pomodoro started' });
    } else if (request.action === 'stopPomodoro') {
        // console.log('Received stopPomodoro message:', request);
        clearInterval(timerInterval);
        timerInterval = null;
        pomodoroActive = false;
        sendResponse({ status: 'Pomodoro stopped' });
    } else if (request.action === 'resetPomodoro') {
        // console.log('Received resetPomodoro message:', request);
        clearInterval(timerInterval);
        timerInterval = null;
        timeLeft = 0;
        pomodoroActive = false;
        isFocus = true;
        sendMsgToUpdateUI();
        chrome.action.setBadgeText({ text: '' });
        chrome.storage.sync.set({ timeLeftStored: 0 }).then(() => {
            console.log(`Time left reset to: ${0}`);
        });
        sendResponse({ status: 'Pomodoro reset' });
    } else {
        console.warn('Unknown action:', request.action);
        sendResponse({ status: 'Unknown action' });
    }
});
