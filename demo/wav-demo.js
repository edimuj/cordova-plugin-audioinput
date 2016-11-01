/*
 This demo shows how to collect the raw microphone data, encode it into WAV format and then use the resulting blob
 as src for a HTML Audio element. No Web Audio API support is needed for this to work.
 */

// Capture configuration object
var captureCfg = {};

// Audio Buffer
var audioDataBuffer = [];

// Timers
var timerInterVal, timerGenerateSimulatedData;

var objectURL = null;

// Info/Debug
var totalReceivedData = 0;

// URL shim
window.URL = window.URL || window.webkitURL;


/**
 * Called continuously while AudioInput capture is running.
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
 * Called when a plugin error happens.
 */
function onAudioInputError(error) {
    alert("onAudioInputError event recieved: " + JSON.stringify(error));
}


/**
 *
 */
var startCapture = function () {
    try {
        if (window.audioinput && !audioinput.isCapturing()) {
            var audioSourceElement = document.getElementById("audioSource"),
                audioSourceType = audioSourceElement.options[audioSourceElement.selectedIndex].value;

            // Get the audio capture configuration from the UI elements
            //
            
            captureCfg = {
                sampleRate: parseInt(document.getElementById('sampleRate').value),
                bufferSize: parseInt(document.getElementById('bufferSize').value),
                channels: parseInt(document.querySelector('input[name="channels"]:checked').value),
                format: document.querySelector('input[name="format"]:checked').value,
                audioSourceType: parseInt(audioSourceType),
                fileName: 'filename',
                filePath: cordova.file.documentsDirectory
            };

            audioinput.start(captureCfg);
            consoleMessage("Microphone input started!");

            // Throw previously created audio
            document.getElementById("recording-list").innerHTML = "";
            if (objectURL && URL.revokeObjectURL) {
                URL.revokeObjectURL(objectURL);
            }

            // Start the Interval that outputs time and debug data while capturing
            //
            timerInterVal = setInterval(function () {
                if (audioinput.isCapturing()) {
                    document.getElementById("infoTimer").innerHTML = "" +
                        new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") +
                        "|Received:" + totalReceivedData;
                }
            }, 1000);

            disableStartButton();
        }
    }
    catch (e) {
        alert("startCapture exception: " + e);
    }
    
};


/**
 *
 */
var stopCapture = function () {
    
    try {
        if (window.audioinput && audioinput.isCapturing()) {
            
            if (timerInterVal) {
                clearInterval(timerInterVal);
            }

            if (window.audioinput) {
                audioinput.stop(onSuccess, onSuccess);
            }
            
            function onSuccess(result){
                alert(JSON.stringify(result));
            }

            totalReceivedData = 0;
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

            disableStopButton();
        }
    }
    catch (e) {
        alert("stopCapture exception: " + e);
    }
};


/**
 *
 */
var initUIEvents = function () {
    document.getElementById("startCapture").addEventListener("click", startCapture);
    document.getElementById("stopCapture").addEventListener("click", stopCapture);
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {
    if (window.cordova && window.audioinput) {
        initUIEvents();

        consoleMessage("Use 'Start Capture' to begin...");

        // Subscribe to audioinput events
        //
        window.addEventListener('audioinput', onAudioInputCapture, false);
        window.addEventListener('audioinputerror', onAudioInputError, false);
    }
    else {
        consoleMessage("cordova-plugin-audioinput not found!");
        disableAllButtons();
    }
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
