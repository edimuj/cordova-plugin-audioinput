var argscheck = require('cordova/argscheck'),
    utils = require('cordova/utils'),
    exec = require('cordova/exec'),
    channel = require('cordova/channel');

var audioinput = {};

// Supported audio formats
audioinput.FORMAT = {
    PCM_16BIT: 'PCM_16BIT',
    PCM_8BIT: 'PCM_8BIT'
};

audioinput.CHANNELS = {
    MONO: 1,
    STEREO: 2
};

// Common Sampling rates
audioinput.SAMPLERATE = {
    TELEPHONE_8000Hz: 8000,
    CD_QUARTER_11025Hz: 11025,
    VOIP_16000Hz: 16000,
    CD_HALF_22050Hz: 22050,
    MINI_DV_32000Hz: 32000,
    CD_XA_37800Hz: 37800,
    NTSC_44056Hz: 44056,
    CD_AUDIO_44100Hz: 44100
};

// Audio Source types
audioinput.AUDIOSOURCE_TYPE = {
    DEFAULT: 0,
    CAMCORDER: 5,
    MIC: 1,
    UNPROCESSED: 9,
    VOICE_COMMUNICATION: 7,
    VOICE_RECOGNITION: 6
};

// Default values
audioinput.DEFAULT = {
    SAMPLERATE: audioinput.SAMPLERATE.CD_AUDIO_44100Hz,
    BUFFER_SIZE: 16384,
    CHANNELS: audioinput.CHANNELS.MONO,
    FORMAT: audioinput.FORMAT.PCM_16BIT,
    NORMALIZE: true,
    NORMALIZATION_FACTOR: 32767.0,
    STREAM_TO_WEBAUDIO: false,
    CONCATENATE_MAX_CHUNKS: 10,
    AUDIOSOURCE_TYPE: audioinput.AUDIOSOURCE_TYPE.DEFAULT
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
 *  audioSourceType (Use audioinput.AUDIOSOURCE_TYPE.)
 */
audioinput.start = function (cfg) {
    if (!audioinput._capturing) {

        if (!cfg) {
            cfg = {};
        }

        audioinput._cfg = {};
        audioinput._cfg.sampleRate = cfg.sampleRate || audioinput.DEFAULT.SAMPLERATE;
        audioinput._cfg.bufferSize = cfg.bufferSize || audioinput.DEFAULT.BUFFER_SIZE;
        audioinput._cfg.channels = cfg.channels || audioinput.DEFAULT.CHANNELS;
        audioinput._cfg.format = cfg.format || audioinput.DEFAULT.FORMAT;
        audioinput._cfg.normalize = typeof cfg.normalize == 'boolean' ? cfg.normalize : audioinput.DEFAULT.NORMALIZE;
        audioinput._cfg.normalizationFactor = cfg.normalizationFactor || audioinput.DEFAULT.NORMALIZATION_FACTOR;
        audioinput._cfg.streamToWebAudio = typeof cfg.streamToWebAudio == 'boolean' ? cfg.streamToWebAudio : audioinput.DEFAULT.STREAM_TO_WEBAUDIO;
        audioinput._cfg.audioContext = cfg.audioContext || null;
        audioinput._cfg.concatenateMaxChunks = cfg.concatenateMaxChunks || audioinput.DEFAULT.CONCATENATE_MAX_CHUNKS;
        audioinput._cfg.audioSourceType = cfg.audioSourceType || 0;

        if (audioinput._cfg.channels < 1 && audioinput._cfg.channels > 2) {
            throw "Invalid number of channels (" + audioinput._cfg.channels + "). Only mono (1) and stereo (2) is" +
            " supported.";
        }
        else if (audioinput._cfg.format != "PCM_16BIT" && audioinput._cfg.format != "PCM_8BIT") {
            throw "Invalid format (" + audioinput._cfg.format + "). Only 'PCM_8BIT' and 'PCM_16BIT' is" +
            " supported.";
        }

        if (audioinput._cfg.bufferSize <= 0) {
            throw "Invalid bufferSize (" + audioinput._cfg.bufferSize + "). Must be greater than zero.";
        }

        if (audioinput._cfg.concatenateMaxChunks <= 0) {
            throw "Invalid concatenateMaxChunks (" + audioinput._cfg.concatenateMaxChunks + "). Must be greater than zero.";
        }

        exec(audioinput._audioInputEvent, audioinput._audioInputErrorEvent, "AudioInputCapture", "start",
            [audioinput._cfg.sampleRate,
             audioinput._cfg.bufferSize,
             audioinput._cfg.channels,
             audioinput._cfg.format,
             audioinput._cfg.audioSourceType]);

        audioinput._capturing = true;

        if (audioinput._cfg.streamToWebAudio) {
            if (audioinput._initWebAudio(audioinput._cfg.audioContext)) {
                audioinput._audioDataQueue = [];
                audioinput._getNextToPlay();
            }
            else {
                throw "The Web Audio API is not supported on this platform!";
            }
        }
    }
    else {
        throw "Already capturing!";
    }
};


/**
 * Stop capturing audio
 */
audioinput.stop = function () {
    if (audioinput._capturing) {
        exec(null, audioinput._audioInputErrorEvent, "AudioInputCapture", "stop", []);
        audioinput._capturing = false;
    }

    if (audioinput._cfg.streamToWebAudio) {
        if (audioinput._timerGetNextAudio) {
            clearTimeout(audioinput._timerGetNextAudio);
        }
        audioinput._audioDataQueue = null;
    }
};


/**
 * Connect the audio node
 *
 * @param audioNode
 */
audioinput.connect = function (audioNode) {
    if (audioinput._micGainNode) {
        audioinput.disconnect();
        audioinput._micGainNode.connect(audioNode);
    }
};

/**
 * Disconnect the audio node
 */
audioinput.disconnect = function () {
    if (audioinput._micGainNode) {
        audioinput._micGainNode.disconnect();
    }
};

/**
 * Returns the internally created Web Audio Context (if any exists)
 *
 * @returns {*}
 */
audioinput.getAudioContext = function () {
    return audioinput._audioContext;
};

/**
 *
 * @returns {*}
 */
audioinput.getCfg = function () {
    return audioinput._cfg;
};

/**
 *
 * @returns {boolean|Array}
 */
audioinput.isCapturing = function () {
    return audioinput._capturing;
};


/******************************************************************************************************************/
/*                                                PRIVATE/INTERNAL                                                */
/******************************************************************************************************************/

audioinput._capturing = false;
audioinput._audioDataQueue = null;
audioinput._timerGetNextAudio = null;
audioinput._audioContext = null;
audioinput._micGainNode = null;
audioinput._webAudioAPISupported = false;

/**
 * Callback for audio input
 *
 * @param {Object} audioInputData     keys: data (PCM)
 */
audioinput._audioInputEvent = function (audioInputData) {
    try {
        if (audioInputData && audioInputData.data && audioInputData.data.length > 0) {
            var audioData = JSON.parse(audioInputData.data);
            audioData = audioinput._normalizeAudio(audioData);

            if (audioinput._cfg.streamToWebAudio && audioinput._capturing) {
                audioinput._enqueueAudioData(audioData);
            }
            else {
                cordova.fireWindowEvent("audioinput", {data: audioData});
            }
        }
        else if (audioInputData && audioInputData.error) {
            audioinput._audioInputErrorEvent(audioInputData.error);
        }
    }
    catch (ex) {
        audioinput._audioInputErrorEvent("audioinput._audioInputEvent ex: " + ex);
    }
};

/**
 * Error callback for AudioInputCapture start
 * @private
 */

audioinput._audioInputErrorEvent = function (e) {
    cordova.fireWindowEvent("audioinputerror", {message: e});
};

/**
 * Normalize audio input
 *
 * @param {Object} pcmData
 * @private
 */
audioinput._normalizeAudio = function (pcmData) {

    if (audioinput._cfg.normalize) {
        for (var i = 0; i < pcmData.length; i++) {
            pcmData[i] = parseFloat(pcmData[i] / audioinput._cfg.normalizationFactor);
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

        if (audioinput._audioDataQueue.length > 0) {
            var concatenatedData = [];
            for (var i = 0; i < audioinput._cfg.concatenateMaxChunks; i++) {
                if (audioinput._audioDataQueue.length === 0) {
                    break;
                }
                concatenatedData = concatenatedData.concat(audioinput._dequeueAudioData());
            }

            duration = audioinput._playAudio(concatenatedData) * 1000;
        }

        if (audioinput._capturing) {
            audioinput._timerGetNextAudio = setTimeout(audioinput._getNextToPlay, duration);
        }
    }
    catch (ex) {
        audioinput._audioInputErrorEvent("audioinput._getNextToPlay ex: " + ex);
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
        if (data && data.length > 0) {
            var audioBuffer = audioinput._audioContext.createBuffer(audioinput._cfg.channels, (data.length / audioinput._cfg.channels), audioinput._cfg.sampleRate),
                chdata = [],
                index = 0;

            if (audioinput._cfg.channels > 1) {
                for (var i = 0; i < audioinput._cfg.channels; i++) {
                    while (index < data.length) {
                        chdata.push(data[index + i]);
                        index += parseInt(audioinput._cfg.channels);
                    }

                    audioBuffer.getChannelData(i).set(new Float32Array(chdata));
                }
            }
            else {
                audioBuffer.getChannelData(0).set(data);
            }

            var source = audioinput._audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioinput._micGainNode);
            source.start(0);

            return audioBuffer.duration;
        }
    }
    catch (ex) {
        audioinput._audioInputErrorEvent("audioinput._playAudio ex: " + ex);
    }

    return 0;
};


/**
 * Creates the Web Audio Context and audio nodes for output.
 * @private
 */
audioinput._initWebAudio = function (audioCtxFromCfg) {
    try {
        if (audioCtxFromCfg) {
            audioinput._audioContext = audioCtxFromCfg;
        }
        else if (!audioinput._audioContext) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioinput._audioContext = new window.AudioContext();
            audioinput._webAudioAPISupported = true;
        }

        // Create a gain node for volume control
        if (!audioinput._micGainNode) {
            audioinput._micGainNode = audioinput._audioContext.createGain();
        }

        return true;
    }
    catch (e) {
        audioinput._webAudioAPISupported = false;
        return false;
    }
};

/**
 * Puts audio data at the end of the queue
 *
 * @returns {*}
 * @private
 */
audioinput._enqueueAudioData = function (data) {
    audioinput._audioDataQueue.push(data);
};

/**
 * Gets and removes the oldest audio data from the queue
 *
 * @returns {*}
 * @private
 */
audioinput._dequeueAudioData = function () {
    return audioinput._audioDataQueue.shift();
};

module.exports = audioinput;
