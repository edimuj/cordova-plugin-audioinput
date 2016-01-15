var cordova = require('cordova'),
    exec = require('cordova/exec');

function handlers() {
    return audioinput.channels.audioInput.numHandlers;
}

var AudioInput = function () {
    this.channels = {
        audioInput: cordova.addWindowEventHandler("audioinput")
    };
    for (var key in this.channels) {
        if (this.channels.hasOwnProperty(key)) {
            this.channels[key].onHasSubscribersChange = AudioInput.onHasSubscribersChange;
        }
    }
};

/**
 * Event handlers for when callbacks get registered for the audio input.
 * Keep track of how many handlers we have so we can start and stop the native audio input listener appropriately.
 */
AudioInput.onHasSubscribersChange = function () {
    if (handlers() === 0) {
        exec(null, null, "AudioInputCapture", "stop", []);
    }
};

/**
 * Callback for audio input
 *
 * @param {Object} audioInputData     keys: data (PCM), samplerate, channels
 */
AudioInput.prototype._audioInputEvent = function (audioInputData) {
    cordova.fireWindowEvent("audioinput", audioInputData);
};

/**
 * Error callback for AudioInputCapture start
 */
AudioInput.prototype._error = function (e) {
    console.error("Error initializing AudioInput: " + e);
    alert("Error initializing AudioInput: " + e);
};

/**
 * Start capture of Audio input
 *
 * @param {Object} cfg    keys: sampleRateInHz (44100), bufferSize (16384), channels (1 (mono) or 2 (stereo)), format
 * ('PCM_8BIT' or 'PCM_16BIT')
 */
AudioInput.prototype.start = function (cfg) {

    if(!cfg) {
        cfg = {};
    }

    cfg.sampleRate = cfg.sampleRate | 44100;
    cfg.bufferSize = cfg.bufferSize | 16384;
    cfg.channels = cfg.channels | 1;
    cfg.format = cfg.bufferSize | 'PCM_16BIT';

    exec(audioinput._audioInputEvent, audioinput._error, "AudioInputCapture", "start", [cfg.sampleRate, cfg.bufferSize, cfg.channels, cfg.format]);
};

/**
 * Stop capture of Audio input
 */
AudioInput.prototype.stop = function () {
    exec(null, audioinput._error, "AudioInputCapture", "stop", []);
};

var audioinput = new AudioInput();

module.exports = audioinput;