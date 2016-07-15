// Web Audio API
var audioContext, micGainNode;

// Capture configuration object
var captureCfg = {};

// Audio Buffer
var audioDataBuffer = [],
    capturing = false;

// Timers
var timerInterVal, timerGenerateSimulatedData;

var objectURL = null;

// Info/Debug
var totalReceivedData = 0,
    totalPlayedData = 0;

// URL shim
window.URL = window.URL || window.webkitURL;

/**
 * Called continuously while AudioInput capture is running.
 *
 * * @param evt The audioinput event   keys: data (A float array containing normalized audio data (-1.0 to +1.0))
 */
function onAudioInputCapture(evt) {
    try {
        if (evt && evt.data) {
            // Increase the debug counter for received data
            totalReceivedData += evt.data.length;

            // Add the chunk to the buffer
            audioDataBuffer = audioDataBuffer.concat(evt.data);
        }
        else {
            alert("Unknown audioinput event!");
        }
    }
    catch (ex) {
        alert("onAudioInputCapture ex: " + ex);
    }
}


/**
 *
 * @param error
 */
function onAudioInputError(error) {
    alert("onAudioInputError event recieved: " + JSON.stringify(error));
}


/**
 * Initializes the events for the start and stop buttons.
 */
var initUIEvents = function () {

    // Start Audio capture
    //
    document.getElementById("startCapture").addEventListener("click", function () {

        if(window.audioinput && !audioinput.isCapturing() || !capturing) {
            var audioSourceElement = document.getElementById("audioSource"),
                audioSourceType = audioSourceElement.options[audioSourceElement.selectedIndex].value;

            // Get the audio capture configuration from the UI elements
            //
            captureCfg = {
                sampleRate: parseInt(document.getElementById('sampleRate').value),
                bufferSize: parseInt(document.getElementById('bufferSize').value),
                channels: parseInt(document.querySelector('input[name="channels"]:checked').value),
                format: document.querySelector('input[name="format"]:checked').value,
                audioSourceType: parseInt(audioSourceType)
            };

            if (isMobile.any() && window.audioinput) {
                audioinput.start(captureCfg);
                consoleMessage("Microphone input started!");

                // Throw previously created audio
                document.getElementById("recording-list").innerHTML = "";
                if (objectURL) {
                    URL.revokeObjectURL(objectURL);
                }
            }
            else {
                // todo: Add Navigator.GetUserMedia() instead?
                capturing = true;
                // On desktop we instead generate some audio input data
                generateSimulatedAudioInput(captureCfg.sampleRate, 1);
                //timerGenerateSimulatedData = setInterval(generateSimulatedAudioInput, 100);

                consoleMessage("Simulated input started (desktop)!");
            }

            // Start the Interval that outputs time and debug data while capturing
            //
            timerInterVal = setInterval(function () {
                if (capturing) {
                    document.getElementById("infoTimer").innerHTML = "" +
                        new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") +
                        "|Received:" + totalReceivedData + "|Played:" + totalPlayedData;
                }
            }, 1000);
        }
        else {
            alert("Unavailable!");
        }
    });

    // Stop Audio capture and reset everything
    //
    document.getElementById("stopCapture").addEventListener("click", function () {
        try {

            if(window.audioinput && audioinput.isCapturing() || capturing) {
                capturing = false;
                clearInterval(timerInterVal);

                if (isMobile.any() && window.audioinput) {
                    audioinput.stop();
                }
                else {
                    clearInterval(timerGenerateSimulatedData);
                }

                // Reset
                totalReceivedData = 0;
                totalPlayedData = 0;

                document.getElementById("infoTimer").innerHTML = "";

                consoleMessage("Encoding WAV...");

                var encoder = new WavAudioEncoder(captureCfg.sampleRate, captureCfg.channels);
                encoder.encode([audioDataBuffer]);

                consoleMessage("Encoding WAV finished");

                var blob = encoder.finish("audio/wav");

                consoleMessage("BLOB created");

                var reader = new FileReader();

                reader.onload = function (evt) {
                    var audio = document.createElement("AUDIO");
                    audio.controls = true;
                    audio.src = evt.target.result;
                    audio.type = "audio/wav";
                    document.getElementById("recording-list").appendChild(audio);
                    consoleMessage("Audio created");
                    audioDataBuffer = [];
                };

                consoleMessage("Loading from BLOB");
                reader.readAsDataURL(blob);
            }
        }
        catch(e) {
            alert("stopCapture exception: " + e);
        }
    });
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {

    initUIEvents();

    consoleMessage("Use 'Start Capture' to begin...");

    // Subscribe to audioinput events
    //
    window.addEventListener('audioinput', onAudioInputCapture, false);
    window.addEventListener('audioinputerror', onAudioInputError, false);
};

// Make it possible to run the demo on desktop
if (!window.cordova) {
    // Make it possible to run the demo on desktop
    console.log("Running on desktop!");
    onDeviceReady();
}
else {
    // For Cordova apps
    document.addEventListener('deviceready', onDeviceReady, false);
}
