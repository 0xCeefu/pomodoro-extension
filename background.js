let timerInterval = null;
let focusDuration = 0.1
let breakDuration = 0.1;
let longBreakDuration = 0.1;
let pomodorosBeforeLongBreak = 4;
let isFocus = true;
let timeLeft = 0;
let pomodoroActive = false;
let completedPomodoros = 0;
let soundOff = false;
let creating

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ timeLeftStored: focusDuration * 60, focusDurationDefault: focusDuration, breakDurationDefault: breakDuration, pomodoroActiveStored: pomodoroActive, completedPomodoros: completedPomodoros, longBreakDuration: longBreakDuration, pomodorosBeforeLongBreak: pomodorosBeforeLongBreak, soundOff: soundOff }).then(() => {
        console.log(`Time left stored: ${focusDuration * 60}\nFocus duration default: ${focusDuration}\nBreak duration default: ${breakDuration}\nPomodoro active stored: ${pomodoroActive}\nCompleted Pomodoros: ${completedPomodoros}\nLong Break Duration Default: ${longBreakDuration}\nPomodoros before Long Break: ${pomodorosBeforeLongBreak}\nSound Off: ${soundOff}`);
    });
});

async function startTimer(reqIsFocus, reqFocusDuration, reqBreakDuration, reqLongBreakDuration, reqPomodorosBeforeLongBreak) {
    // If the timer is already running, leave and do not start a new one
    if (timerInterval) return;

    if (timeLeft <= 0) {
        // If timeLeft is 0, set it to the focus or break duration based on isFocus
        isFocus = reqIsFocus
        focusDuration = reqFocusDuration || focusDuration;
        breakDuration = reqBreakDuration || breakDuration;
        longBreakDuration = reqLongBreakDuration || longBreakDuration;
        pomodorosBeforeLongBreak = reqPomodorosBeforeLongBreak || pomodorosBeforeLongBreak;
        completedPomodoros = await chrome.storage.sync.get('completedPomodoros').then(data => data.completedPomodoros || 0);
        console.log(`Starting timer with Focus Duration: ${focusDuration}, Break Duration: ${breakDuration}, Long Break Duration: ${longBreakDuration}, Pomodoros Before Long Break: ${pomodorosBeforeLongBreak}, Completed Pomodoros: ${completedPomodoros}`, (completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0));
        timeLeft = isFocus ? focusDuration * 60 : ((completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0) ? longBreakDuration * 60 : breakDuration * 60);
    }

    // Set the badge text to show the timer based on isFocus state
    chrome.action.setBadgeBackgroundColor(
        { color: isFocus ? '#00FF00' : '#fa0000ff' }
    );

    // Set storage for the current pomodoro state
    chrome.storage.sync.set({ pomodoroActiveStored: pomodoroActive }).then(() => {
        console.log(`Pomodoro active: ${pomodoroActive}`);
    });

    // Start the timer interval
    timerInterval = setInterval(() => {
        // Decrement timeLeft every second and send a message to update the UI
        timeLeft--;
        sendMsgToUpdateUI();
        // Store the time left in sync storage
        chrome.storage.sync.set({ timeLeftStored: timeLeft }).then(() => {
            // console.log(`Time left stored: ${timeLeft}`);
        });

        // If timeLeft reaches 0, clear the interval and switch focus/break state and start a new timer
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (isFocus) {
                completedPomodoros++;
                chrome.storage.sync.set({ completedPomodoros: completedPomodoros }).then(() => {
                    console.log(`Completed Pomodoros: ${completedPomodoros}`);
                });
            }
            showNotification(`Pomodoro ${isFocus ? "Focus" : ((completedPomodoros > 0 && completedPomodoros % pomodorosBeforeLongBreak === 0) ? "Long Break" : "Break")} session complete!`);
            chrome.runtime.sendMessage({
                action: 'updateCompletedPomodoros',
            }).catch((error) => {
                console.warn('No receiver for updateCompletedPomodoros — popup may be closed.');
            });
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

async function showNotification(message) {
    soundOff = await chrome.storage.sync.get('soundOff').then(data => data.soundOff || false);
    if (!soundOff) {
        await setupOffscreenDocument('offscreen.html')
        let response = chrome.runtime.sendMessage({
            action: 'playAudioNotification'
        }).catch((error) => {
            console.warn('No receiver for playAudioNotification — offscreen document may not be set up.');
        });

        console.log('Audio notification response:', response);
    } else {
        console.log('Audio notification is turned off.');
    }
    chrome.notifications.create({
        type: "basic",
        title: "Pomodoro Timer",
        message: message,
        iconUrl: "assets/icons/icon128.png"
    });
}

async function setupOffscreenDocument(path) {
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // create offscreen document
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startPomodoro') {
        pomodoroActive = true;
        // Start the timer with the provided focus and break durations from the request
        startTimer(request.isFocus, request.focusDuration, request.breakDuration, request.longBreakDuration, request.pomodorosBeforeLongBreak);
        sendResponse({ status: 'Pomodoro started' });
    } else if (request.action === 'stopPomodoro') {
        // Clear the timer and reset the timeInterval variable
        clearInterval(timerInterval);
        timerInterval = null;
        sendResponse({ status: 'Pomodoro stopped' });
    } else if (request.action === 'resetPomodoro') {
        // Clear the timer and timeInterval variable
        clearInterval(timerInterval);
        timerInterval = null;
        // Reset timeLeft, pomodoroActive, and isFocus
        timeLeft = 0;
        pomodoroActive = false;
        isFocus = true;
        // Update the UI
        sendMsgToUpdateUI();
        // Reset the badge text and store the reset values
        chrome.action.setBadgeText({ text: '' });
        chrome.storage.sync.set({ timeLeftStored: 0, pomodoroActiveStored: pomodoroActive, completedPomodoros: 0 }).then(() => {
            console.log(`Time left reset to: ${0}\nPomodoro active reset to: ${pomodoroActive}`);
        });
        // Notify the popup to update its UI
        chrome.runtime.sendMessage({
            action: 'queryStorageAndupdateUI',
        }).catch((error) => {
            console.warn('No receiver for updateUI — popup may be closed.');
        });
        // Show a notification to indicate the reset
        showNotification("Pomodoro timer has been reset.");
        sendResponse({ status: 'Pomodoro reset' });
    } else {
        console.warn('Unknown action:', request.action);
        sendResponse({ status: 'Unknown action' });
    }
});
