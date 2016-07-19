/*
 This demo shows how to collect the raw microphone data, create a AudioBufferSourceNode from it and play it using the
 Web Audio API.
 */

// Web Audio API
var audioContext, micGainNode;

// Capture configuration object
var captureCfg = {};

// Queue
var audioDataQueue = [];

// How many data chunks should be joined before playing them
var concatenateMaxChunks = 10;

// Timers
var timerGetNextAudio, timerInterVal;

// Info/Debug
var totalReceivedData = 0,
    totalPlayedData = 0;


/**
 * Called continuously while AudioInput capture is running.
 */
function onAudioInputCapture(evt) {
    try {
        if (evt && evt.data) {
            // Increase the debug counter for received data
            totalReceivedData += evt.data.length;

            // Push the data to the audio queue (array)
            audioDataQueue.push(evt.data);
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
 * Consume data from the audioinput queue and calls the playAudio method
 */
var getNextToPlay = function () {
    var duration = 50;

    // Check if there is any data in the queue
    if (audioDataQueue.length > 0) {

        // Concatenate up to concatenateMaxChunks data arrays from the queue
        var concatenatedData = [];
        for (var i = 0; i < concatenateMaxChunks; i++) {
            if (audioDataQueue.length === 0) {
                break;
            }
            concatenatedData = concatenatedData.concat(audioDataQueue.shift());
        }

        // Play the audio
        duration = playAudio(concatenatedData) * 1000;
    }

    // Still capturing? Then call myself to continue consuming incoming data.
    if (window.audioinput && audioinput.isCapturing()) {
        timerGetNextAudio = setTimeout(getNextToPlay, duration);
    }
};


/**
 * Play audio from data using the Web Audio API
 */
var playAudio = function (data) {
    try {
        // Create an audio buffer to hold the data
        var audioBuffer = audioContext.createBuffer(captureCfg.channels, (data.length / captureCfg.channels),
            captureCfg.sampleRate);

        // Initialize the audio buffer with the data
        if (captureCfg.channels > 1) {
            // For multiple channels (stereo) we assume that the data is interleaved
            for (var i = 0; i < captureCfg.channels; i++) {
                var chdata = [],
                    index = 0;

                while (index < data.length) {
                    chdata.push(data[index + i]);
                    index += parseInt(captureCfg.channels);
                }

                audioBuffer.getChannelData(i).set(chdata);
            }
        }
        else {
            // For just one channels (mono)
            audioBuffer.getChannelData(0).set(data);
        }

        // Create a buffer source based on the audio buffer
        var source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Connect the buffer source to the gain node
        source.connect(micGainNode);

        // Play the audio immediately
        source.start(0);

        // Increase the debug counter for played data
        totalPlayedData += data.length;

        // Return the duration of the sound so that we can play the next sound when ended.
        return audioBuffer.duration;
    }
    catch(e) {
        alert("playAudio exception: " + e);
        return 100;
    }
};


/**
 * Creates the Web Audio Context and audio nodes for output.
 */
var initWebAudio = function () {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new window.AudioContext();
        consoleMessage("Web Audio Context is ready");
    }
    catch (e) {
        consoleMessage('Web Audio API is not supported in this browser: ' + e);
        return false;
    }

    // Create a gain node for volume control
    micGainNode = audioContext.createGain();

    // Connect the gain node to the speaker
    micGainNode.connect(audioContext.destination);

    return true;
};


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
                audioSourceType: parseInt(audioSourceType)
            };

            audioinput.start(captureCfg);
            consoleMessage("Microphone input started!");

            // Start the Interval that outputs time and debug data while capturing
            //
            timerInterVal = setInterval(function () {
                if (audioinput.isCapturing()) {
                    document.getElementById("infoTimer").innerHTML = "" +
                        new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") +
                        "|Received:" + totalReceivedData + "|Played:" + totalPlayedData;
                }
            }, 1000);

            // Start the audio queue consumer
            //
            getNextToPlay();

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
                audioinput.stop();
            }

            audioDataQueue = [];
            totalReceivedData = 0;
            totalPlayedData = 0;

            document.getElementById("infoTimer").innerHTML = "";
            consoleMessage("Stopped");

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
        consoleMessage("Use 'Start Capture' to begin...");

        initUIEvents();

        if (initWebAudio()) {
            consoleMessage("Use 'Start Capture' to begin...");
        }

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
