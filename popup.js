const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');

let timeLeft = 0.1 * 60;
let timerInterval = null;

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (timerInterval) return;
    if (timeLeft <= 0) {
        showNotification("Pomodoro session complete! Reset the timer to start a new session.");
        return;
    }
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            showNotification("Pomodoro session complete!");
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
    timeLeft = 0.1 * 60;
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

updateTimerDisplay()