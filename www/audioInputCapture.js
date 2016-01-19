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
 * @param {Object} audioInputData     keys: data (PCM)
 */
AudioInput.prototype._audioInputEvent = function (audioInputData) {

    if (audioInputData && audioInputData.data && audioInputData.data.length > 0) {

        // Convert from String to Array and normalize the data before dispatching the event
        audioInputData = audioInputData.data.substr(1, audioInputData.data.length - 1).split(',');
        cordova.fireWindowEvent("audioinput", {
            data: audioinput._normalizeAudio(audioInputData)
        });
    }
    else if (audioInputData && audioInputData.error) {
        audioinput._error(audioInputData.error);
    }
};

/**
 * Error callback for AudioInputCapture start
 */
AudioInput.prototype._error = function (e) {
    cordova.fireWindowEvent("audioinputerror", e);
};

/**
 * Normalize audio input
 *
 * @param {Object} pcmData
 */
AudioInput.prototype._normalizeAudio = function (pcmData) {

    for (var i = 0; i < pcmData.length; i++) {
        pcmData[i] = parseFloat(pcmData[i] / audioinput.cfg.normalizationFactor);
    }

    return pcmData;
};

/**
 * Start capture of Audio input
 *
 * @param {Object} cfg    keys: sampleRateInHz (44100), bufferSize (16384), channels (1 (mono) or 2 (stereo)), format
 * ('PCM_8BIT' or 'PCM_16BIT')
 */
AudioInput.prototype.start = function (cfg) {
    if (!cfg) {
        cfg = {};
    }

    audioinput.cfg = {};
    audioinput.cfg.sampleRate = cfg.sampleRate || 44100;
    audioinput.cfg.bufferSize = cfg.bufferSize || 16384;
    audioinput.cfg.channels = cfg.channels || 1;
    audioinput.cfg.format = cfg.format || 'PCM_16BIT';
    audioinput.cfg.normalizationFactor = 32767.0;

    if(audioinput.cfg.channels < 1 && audioinput.cfg.channels > 2) {
        throw "Invalid number of channels (" + audioinput.cfg.channels + "). Only mono (1) and stereo (2) is" +
        " supported.";
    }
    else if(audioinput.cfg.format != "PCM_16BIT" && audioinput.cfg.format != "PCM_8BIT") {
        throw "Invalid format (" + audioinput.cfg.format + "). Only 'PCM_8BIT' and 'PCM_16BIT' is" +
        " supported.";
    }

    exec(audioinput._audioInputEvent, audioinput._error, "AudioInputCapture", "start", [audioinput.cfg.sampleRate, audioinput.cfg.bufferSize, audioinput.cfg.channels, audioinput.cfg.format]);
};

/**
 * Stop capture of Audio input
 */
AudioInput.prototype.stop = function () {
    exec(null, audioinput._error, "AudioInputCapture", "stop", []);
};

var audioinput = new AudioInput();

module.exports = audioinput;