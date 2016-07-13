/**
 * Initializes the events for the start and stop buttons.
 */
var initUIEvents = function () {
    document.getElementById("startCapture").addEventListener("click", function () {
        startCapture();
    });

    document.getElementById("stopCapture").addEventListener("click", function () {
        stopCapture();
    });
};

/**
 *
 * @param error
 */
function onAudioInputError(error) {
    alert("onAudioInputError event recieved: " + JSON.stringify(error));
}


/**
 * Start Audio capture
 */
var startCapture = function () {
    try {
        if (window.audioinput) {

            // Start with default values and let the plugin handle conversion from raw data to web audio
            audioinput.start({
                streamToWebAudio: true
            });

            // Connect the audioinput to the speaker(s) in order to hear the captured sound
            audioinput.connect(audioinput.getAudioContext().destination);

            consoleMessage("Capturing audio!");
        }
        else {
            consoleMessage("audioinput plugin is not available!");
        }
    }
    catch(ex) {
        alert("startCapture exception: " + ex);
    }
};


/**
 * Stop Audio capture
 */
var stopCapture = function () {
    if (window.audioinput) {
        audioinput.stop();
    }

    consoleMessage("Stopped!");
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {
    initUIEvents();

    window.addEventListener('audioinputerror', onAudioInputError, false);

    consoleMessage("Use 'Start Capture' to begin...");
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
