// Web Audio API
var audioContext, micGainNode;

// Capture configuration object
var captureCfg = {};

// Queue
var audioDataQueue = [],
    capturing = false;

// How many data chunks should be joined before playing them
var concatenateMaxChunks = 10;

// Timers
var timerGetNextAudio, timerInterVal, timerGenerateSimulatedData;

// Info/Debug
var totalReceivedData = 0,
    totalPlayedData = 0;


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

            // Push the data to the audio queue (array)
            audioDataQueue.push(evt.data);
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
    alert("onAudioInputError event recieved: " + error);
}


/**
 * Consumes data from the audioinput queue and calls the playAudio method
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
    if (capturing) {
        timerGetNextAudio = setTimeout(getNextToPlay, duration);
    }
};


/**
 * Play audio using the Web Audio API
 */
var playAudio = function (data) {

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
};



/**
 * Creates the Web Audio Context and audio nodes for output.
 */
var initWebAudio = function () {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
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
 * Initializes the events for the start and stop buttons.
 */
var initUIEvents = function () {

    // Start Audio capture
    //
    document.getElementById("startCapture").addEventListener("click", function () {
        capturing = true;

        // Get the audio capture configuration from the UI elements
        //
        captureCfg = {
            sampleRate: parseInt(document.getElementById('sampleRate').value),
            bufferSize: parseInt(document.getElementById('bufferSize').value),
            channels: parseInt(document.querySelector('input[name="channels"]:checked').value),
            format: document.querySelector('input[name="format"]:checked').value
        };

        if (isMobile.any() && window.audioinput) {
            audioinput.start(captureCfg);
            consoleMessage("Microphone input started!");
        }
        else {
            // todo: Add Navigator.GetUserMedia() instead?

            // On desktop we instead generate some audio input data
            generateSimulatedAudioInput(captureCfg.bufferSize);
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


        // Start the audio queue consumer
        //
        getNextToPlay();
    });

    // Stop Audio capture and reset everything
    //
    document.getElementById("stopCapture").addEventListener("click", function () {

        capturing = false;
        clearInterval(timerInterVal);

        if (isMobile.any() && window.audioinput) {
            audioinput.stop();
        }
        else {
            clearInterval(timerGenerateSimulatedData);
        }

        audioDataQueue = [];
        totalReceivedData = 0;
        totalPlayedData = 0;

        document.getElementById("infoTimer").innerHTML = "";
        consoleMessage("Stopped");
    });
};


/**
 * When cordova fires the deviceready event, we initialize everything needed for audio input.
 */
var onDeviceReady = function () {

    consoleMessage("Use 'Start Capture' to begin...");

    initUIEvents();

    if (initWebAudio()) {
        consoleMessage("Use 'Start Capture' to begin...");
    }

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
