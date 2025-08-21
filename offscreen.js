chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'playAudioNotification') {
        playNotificationSound();
        sendResponse({ status: 'Audio notification played' });
    }
});

function playNotificationSound() {
    const audio = new Audio(chrome.runtime.getURL("assets/sounds/ding.mp3"));
    audio.play().catch((error) => {
        console.warn("Sound playback failed:", error);
    });
}