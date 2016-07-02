/*var cordova = require('cordova'),
    exec = require('cordova/exec');*/

var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    channel = require('cordova/channel');


var audioinput = {
    audioContext: null,
    audioDataQueue: [],
    capturing: false,
    concatenateMaxChunks: 10,
    timerGetNextAudio: 0
};

/**
 * Start capture of Audio input
 *
 * @param {Object} cfg
 * keys:
 *  sampleRateInHz (44100),
 *  bufferSize (16384),
 *  channels (1 (mono) or 2 (stereo)),
 *  format ('PCM_8BIT' or 'PCM_16BIT'),
 *  normalize (true || false),
 *  normalizationFactor (create float data by dividing the audio data with this factor; default: 32767.0)
 *  streamToWebAudio (The plugin will handle all the conversion of raw data to audio)
 *  audioContext (If no audioContext is given, one will be created)
 *  concatenateMaxChunks (How many packets will be merged each time, low = low latency but can require more resources)
 */
audioinput.start = function (cfg) {
    try {
        if (!cfg) {
            cfg = {};
        }

        audioinput.cfg = {};
        audioinput.cfg.sampleRate = cfg.sampleRate || 44100;
        audioinput.cfg.bufferSize = cfg.bufferSize || 16384;
        audioinput.cfg.channels = cfg.channels || 1;
        audioinput.cfg.format = cfg.format || 'PCM_16BIT';
        audioinput.cfg.normalize = cfg.normalize || true;
        audioinput.cfg.normalizationFactor = cfg.normalizationFactor || 32767.0;
        audioinput.cfg.streamToWebAudio = cfg.streamToWebAudio || false;
        audioinput.cfg.audioContext = cfg.audioContext || null;
        audioinput.cfg.concatenateMaxChunks = cfg.concatenateMaxChunks || 10;

        if (audioinput.cfg.channels < 1 && audioinput.cfg.channels > 2) {
            throw "Invalid number of channels (" + audioinput.cfg.channels + "). Only mono (1) and stereo (2) is" +
            " supported.";
        }
        else if (audioinput.cfg.format != "PCM_16BIT" && audioinput.cfg.format != "PCM_8BIT") {
            throw "Invalid format (" + audioinput.cfg.format + "). Only 'PCM_8BIT' and 'PCM_16BIT' is" +
            " supported.";
        }

        exec(audioinput.audioInputEvent, audioinput.error, "AudioInputCapture", "start", [audioinput.cfg.sampleRate, audioinput.cfg.bufferSize, audioinput.cfg.channels, audioinput.cfg.format]);

        if (audioinput.cfg.streamToWebAudio) {
            audioinput._initWebAudio(audioinput.cfg.audioContext);
            audioinput.audioDataQueue = [];
            audioinput._getNextToPlay();
        }

        audioinput.capturing = true;
    }
    catch (ex) {
        throw "Failed to start audioinput due to: " + ex;
    }
};


/**
 * Stop capturing audio
 */
audioinput.stop = function () {
    exec(null, audioinput.error, "AudioInputCapture", "stop", []);
    if (audioinput.cfg.streamToWebAudio) {
        if (audioinput.timerGetNextAudio) {
            clearTimeout(audioinput.timerGetNextAudio);
        }
        audioinput.audioDataQueue = null;
    }

    audioinput.capturing = false;
};


/**
 * Connect the audio node
 *
 * @param audioNode
 */
audioinput.connect = function (audioNode) {
    if (audioinput.micGainNode) {
        audioinput.disconnect();
        audioinput.micGainNode.connect(audioNode);
    }
};

/**
 * Disconnect the audio node
 */
audioinput.disconnect = function () {
    if (audioinput.micGainNode) {
        audioinput.micGainNode.disconnect();
    }
};

/**
 * Returns the internally created Web Audio Context (if any exists)
 *
 * @returns {*}
 */
audioinput.getAudioContext = function () {
    return audioinput.audioContext;
};

/**
 *
 * @returns {*}
 */
audioinput.getCfg = function () {
    return audioinput.cfg;
};

/**
 *
 * @returns {boolean|Array}
 */
audioinput.isCapturing = function () {
    return audioinput.capturing;
};

/**
 * Callback for audio input
 *
 * @param {Object} audioInputData     keys: data (PCM)
 */
audioinput.audioInputEvent = function (audioInputData) {
    try {
        if (audioInputData && audioInputData.data && audioInputData.data.length > 0) {
            var audioData = audioInputData.data.substr(1, audioInputData.data.length - 1).split(',');
            audioData = audioinput._normalizeAudio(audioData);

            if (audioinput.cfg.streamToWebAudio && audioinput.capturing) {
                audioinput._enqueueAudioData(audioData);
            }
            else {
                cordova.fireWindowEvent("audioinput", { data: audioData });
            }
        }
        else if (audioInputData && audioInputData.error) {
            audioinput.error(audioInputData.error);
        }
        else {
            //audioinput.error("Empty"); // Happens when capture is stopped
        }
    }
    catch (ex) {
        audioinput.error("audioinput._audioInputEvent ex: " + ex);
    }
};

/**
 * Error callback for AudioInputCapture start
 * @private
 */
audioinput.error = function (e) {
    cordova.fireWindowEvent("audioinputerror", e);
};

/**
 * Normalize audio input
 *
 * @param {Object} pcmData
 * @private
 */
audioinput._normalizeAudio = function (pcmData) {

    if (audioinput.cfg.normalize) {
        for (var i = 0; i < pcmData.length; i++) {
            pcmData[i] = parseFloat(pcmData[i] / audioinput.getCfg().normalizationFactor);
        }

        // If last value is NaN, remove it.
        if (isNaN(pcmData[pcmData.length - 1])) {
            pcmData.pop();
        }
    }

    return pcmData;
};


/**
 * Consumes data from the audioinput queue
 * @private
 */
audioinput._getNextToPlay = function () {
    try {
        var duration = 100;

        if (audioinput.audioDataQueue.length > 0) {
            var concatenatedData = [];
            for (var i = 0; i < audioinput.concatenateMaxChunks; i++) {
                if (audioinput.audioDataQueue.length === 0) {
                    break;
                }
                concatenatedData = concatenatedData.concat(audioinput._dequeueAudioData());
            }

            duration = audioinput._playAudio(concatenatedData) * 1000;
        }

        if (audioinput.capturing) {
            audioinput.timerGetNextAudio = setTimeout(audioinput._getNextToPlay, duration);
        }
    }
    catch (ex) {
        audioinput.error("audioinput._getNextToPlay ex: " + ex);
    }
};


/**
 * Play audio using the Web Audio API
 * @param data
 * @returns {Number}
 * @private
 */
audioinput._playAudio = function (data) {
    try {
        var audioBuffer = audioinput.audioContext.createBuffer(audioinput.cfg.channels, (data.length / audioinput.cfg.channels),
            audioinput.cfg.sampleRate);

        var chdata = [],
            index = 0;

        if (audioinput.cfg.channels > 1) {
            for (var i = 0; i < audioinput.cfg.channels; i++) {
                while (index < data.length) {
                    chdata.push(data[index + i]);
                    index += parseInt(audioinput.cfg.channels);
                }

                audioBuffer.getChannelData(i).set(new Float32Array(chdata));
            }
        }
        else {
            audioBuffer.getChannelData(0).set(data);
        }

        var source = audioinput.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioinput.micGainNode);
        source.start(0);

        return audioBuffer.duration;
    }
    catch (ex) {
        audioinput.error("audioinput._playAudio ex: " + ex);
    }
};


/**
 * Creates the Web Audio Context and audio nodes for output.
 * @private
 */
audioinput._initWebAudio = function (audioCtxFromCfg) {
    if (!audioinput.audioContext) { // Only if not already set
        if (!audioCtxFromCfg) { // Create a new context if not given in cfg
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioinput.audioContext = new AudioContext();
        }
        else {
            audioinput.audioContext = audioCtxFromCfg;
        }
    }

    // Create a gain node for volume control
    if (!audioinput.micGainNode) {
        audioinput.micGainNode = audioinput.audioContext.createGain();
    }
};

/**
 * Puts audio data at the end of the queue
 *
 * @returns {*}
 * @private
 */
audioinput._enqueueAudioData = function (data) {
    audioinput.audioDataQueue.push(data);
};

/**
 * Gets and removes the oldest audio data from the queue
 *
 * @returns {*}
 * @private
 */
audioinput._dequeueAudioData = function () {
    return audioinput.audioDataQueue.shift();
};

/*
audioinput._handlers = function () {
    return audioinput.channels.audioInput.numHandlers;
};

audioinput.onHasSubscribersChange = function () {
    if (audioinput._handlers() === 0) {
        exec(null, null, "AudioInputCapture", "stop", []);
    }
};

audioinput.channels = {
    audioInput: cordova.addWindowEventHandler("audioinput")
};

for (var key in audioinput.channels) {
    if (audioinput.channels.hasOwnProperty(key)) {
        audioinput.channels[key].onHasSubscribersChange = audioinput.onHasSubscribersChange;
    }
}*/

module.exports = audioinput;



