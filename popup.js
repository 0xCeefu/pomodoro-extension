const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');

startButton.addEventListener('click', () => {
    alert('Start button clicked');
});

stopButton.addEventListener('click', () => {
    alert('Stop button clicked');
});

resetButton.addEventListener('click', () => {
    alert('Reset button clicked');
});