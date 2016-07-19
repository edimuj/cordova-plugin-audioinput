/*
 This demo lets the audioinput plugin decode the raw microphone data, and connects the plugin object to the
 Web Audio API AudioContext.destination in order to play it to the speakers.
 */

var initUIEvents = function () {
    document.getElementById("startCapture").addEventListener("click", startCapture);
    document.getElementById("stopCapture").addEventListener("click", stopCapture);
};


/**
 * Called when a plugin error happens.
 */
function onAudioInputError(error) {
    alert("audioinputerror event recieved: " + JSON.stringify(error));
}


/**
 * Start Audio capture
 */
var startCapture = function () {
    try {
        if (window.audioinput) {

            if (!audioinput.isCapturing()) {
                // Start with default values and let the plugin handle conversion from raw data to web audio
                audioinput.start({
                    streamToWebAudio: true
                });

                // Connect the audioinput to the speaker(s) in order to hear the captured sound
                audioinput.connect(audioinput.getAudioContext().destination);

                consoleMessage("Capturing audio!");

                disableStartButton();
            }
            else {
                alert("Already capturing!");
            }
        }
    }
    catch (ex) {
        alert("startCapture exception: " + ex);
    }
};


/**
 * Stop Audio capture
 */
var stopCapture = function () {

    if (window.audioinput && audioinput.isCapturing()) {
        audioinput.stop();
        disableStopButton();
    }

    consoleMessage("Stopped!");
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {
    if (window.cordova && window.audioinput) {
        initUIEvents();

        window.addEventListener('audioinputerror', onAudioInputError, false);

        consoleMessage("Use 'Start Capture' to begin...");
    }
    else {
        consoleMessage("cordova-plugin-audioinput not found!");
        disableAllButtons();
    }
};


// Make it possible to run the demo on desktop
if (!window.cordova) {
    console.log("Running on desktop!");
    onDeviceReady();
}
else {
    // For Cordova apps
    document.addEventListener('deviceready', onDeviceReady, false);
}
