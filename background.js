let timerInterval = null;
let focusDuration = 25;
let breakDuration = 5;
let longBreakDuration = 15;
let pomodorosBeforeLongBreak = 4;
let isFocus = true;
let timeLeft = 0;
let pomodoroActive = false;
let completedPomodoros = 0;
let soundOff = false;
let creating = null;
let totalTime = 0;

// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.clear()
    chrome.storage.sync.set({
        defaultInputFocusDuration: focusDuration,
        defaultInputBreakDuration: breakDuration,
        defaultInputLongBreakDuration: longBreakDuration,
        defaultInputPomodorosBeforeLongBreak: pomodorosBeforeLongBreak,
        completedPomodoros: 0,
        pomodoroActive: false,
        isRunning: false,
        endAtEpochMs: 0,
        isFocus: true,
        soundOff: false,
        timeLeft: 0,
        bgSessionFocusDuration: focusDuration,
        bgSessionBreakDuration: breakDuration,
        bgSessionLongBreakDuration: longBreakDuration,
        bgSessionPomodorosBeforeLongBreak: pomodorosBeforeLongBreak,
    }).then(() => {
        console.log('Default settings initialized in storage.');
    });
});

// Helper: Calculate session total time
function getSessionTotalTime(isFocus, completedPomodoros, focusDuration, breakDuration, longBreakDuration, pomodorosBeforeLongBreak) {
    if (isFocus) return focusDuration * 60;
    if (completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0) return longBreakDuration * 60;
    return breakDuration * 60;
}

// Helper: Save session state to storage
function saveSessionState() {
    chrome.storage.sync.set({
        pomodoroActive,
        isFocus,
        bgSessionFocusDuration: focusDuration,
        bgSessionBreakDuration: breakDuration,
        bgSessionLongBreakDuration: longBreakDuration,
        bgSessionPomodorosBeforeLongBreak: pomodorosBeforeLongBreak,
        totalTime,
        timeLeft,
        completedPomodoros
    });
}

// Timer control
async function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    await chrome.storage.sync.set({ isRunning: false, timeLeft });
}

// Main timer logic
async function startTimer(pastPomodoro = false, reqIsFocus, reqFocusDuration, reqBreakDuration, reqLongBreakDuration, reqPomodorosBeforeLongBreak) {
    if (timerInterval) return;

    if (pastPomodoro) {
        // Restore previous session values from storage
        let storedValues = await chrome.storage.sync.get([
            'timeLeft',
            'isFocus',
            'bgSessionFocusDuration',
            'bgSessionBreakDuration',
            'bgSessionLongBreakDuration',
            'bgSessionPomodorosBeforeLongBreak',
            'completedPomodoros',
        ]);
        isFocus = storedValues.isFocus ?? isFocus;
        focusDuration = storedValues.bgSessionFocusDuration ?? focusDuration;
        breakDuration = storedValues.bgSessionBreakDuration ?? breakDuration;
        longBreakDuration = storedValues.bgSessionLongBreakDuration ?? longBreakDuration;
        pomodorosBeforeLongBreak = storedValues.bgSessionPomodorosBeforeLongBreak ?? pomodorosBeforeLongBreak;
        completedPomodoros = storedValues.completedPomodoros ?? completedPomodoros;
        timeLeft = storedValues.timeLeft ?? timeLeft;
        pomodoroActive = true;
        totalTime = getSessionTotalTime(isFocus, completedPomodoros, focusDuration, breakDuration, longBreakDuration, pomodorosBeforeLongBreak);
    } else {
        if (timeLeft <= 0) {
            isFocus = reqIsFocus ?? isFocus;
            focusDuration = reqFocusDuration ?? focusDuration;
            breakDuration = reqBreakDuration ?? breakDuration;
            longBreakDuration = reqLongBreakDuration ?? longBreakDuration;
            pomodorosBeforeLongBreak = reqPomodorosBeforeLongBreak ?? pomodorosBeforeLongBreak;
            completedPomodoros = await chrome.storage.sync.get('completedPomodoros').then(data => data.completedPomodoros ?? 0);
            totalTime = getSessionTotalTime(isFocus, completedPomodoros, focusDuration, breakDuration, longBreakDuration, pomodorosBeforeLongBreak);
            timeLeft = totalTime;
            pomodoroActive = true;
        }
        saveSessionState();
    }

    chrome.action.setBadgeBackgroundColor({ color: isFocus ? '#32E875' : '#E71D36' });
    const endAtEpochMs = Date.now() + timeLeft * 1000;
    await chrome.storage.sync.set({ 
        endAtEpochMs, 
        isRunning: true 
    });
    sendMsgToUpdateUI();

    timerInterval = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        sendMsgToUpdateUI();

        if (timeLeft === 0) {
            sendMsgToUpdateUI();
            pauseTimer();
            if (isFocus) {
                completedPomodoros++;
                chrome.storage.sync.set({ completedPomodoros });
            }
            showNotification(`Pomodoro ${isFocus ? "Focus" : ((completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0) ? "Long Break" : "Break")} session complete!`);
            chrome.runtime.sendMessage({ action: 'updateCompletedPomodoros' }).catch(() => {});
            isFocus = !isFocus;
            chrome.storage.sync.set({ timeLeft: 0, isFocus });
            setTimeout(() => {
                startTimer(false, isFocus);
            }, 500);
        }
    }, 1000);
}

// UI update
async function sendMsgToUpdateUI() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    chrome.action.setBadgeText({ text: `${minutes}:${seconds.toString().padStart(2, '0')}` });
    chrome.runtime.sendMessage({
        action: 'updateTimerDisplay',
        timeLeft,
        pomodoroActive,
        isFocus,
        totalTime
    }).catch(() => {});
}

// Notification logic
async function showNotification(message) {
    soundOff = await chrome.storage.sync.get('soundOff').then(data => data.soundOff ?? false);
    if (!soundOff) {
        await setupOffscreenDocument('offscreen.html');
        chrome.runtime.sendMessage({ action: 'playAudioNotification' }).catch(() => {});
    }
    chrome.notifications.create({
        type: "basic",
        title: "Pomodoro Timer",
        message,
        iconUrl: chrome.runtime.getURL("assets/icons/icon128.png")
    });
}

// Offscreen document setup
async function setupOffscreenDocument(path) {
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });
    if (existingContexts.length > 0) return;
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play Audio Notification for Pomodoro Timer',
        });
        await creating;
        creating = null;
    }
}

// Message listener
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'startPomodoro') {
        let isPastPomodoro = await chrome.storage.sync.get('pomodoroActive').then(data => data.pomodoroActive ?? false);
        if (isPastPomodoro) {
            startTimer(true);
        } else {
            startTimer(false, request.isFocus, request.focusDuration, request.breakDuration, request.longBreakDuration, request.pomodorosBeforeLongBreak);
        }
        sendResponse({ status: 'Pomodoro started' });
    } else if (request.action === 'stopPomodoro') {
        pauseTimer();
        sendResponse({ status: 'Pomodoro stopped' });
    } else if (request.action === 'resetPomodoro') {
        pauseTimer();
        timeLeft = 0;
        pomodoroActive = false;
        isFocus = true;
        completedPomodoros = 0;
        sendMsgToUpdateUI();
        chrome.action.setBadgeText({ text: '' });
        chrome.storage.sync.set({ timeLeft: 0, pomodoroActive, completedPomodoros, isFocus, isRunning: false, endAtEpochMs: 0 }).catch(() => {});
        chrome.runtime.sendMessage({ action: 'queryStorageAndupdateUI' }).catch(() => {});
        showNotification("Pomodoro timer has been reset.");
        sendResponse({ status: 'Pomodoro reset' });
    } else {
        sendResponse({ status: 'Unknown action' });
    }

    return true; // Keep the message channel open for sendResponse
});

// Utility: Query all stored values
async function queryAllStoredValues() {
    return await chrome.storage.sync.get(null);
}
