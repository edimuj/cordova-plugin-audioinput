/*
License (MIT)

Copyright © 2016 Edin Mujkanovic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/
var exec = require('cordova/exec');

var audioinput = {};

var hasTypedArrays = 'Int16Array' in window && 'Float32Array' in window;

// Audio formats
audioinput.FORMAT = {
    PCM_16BIT: 'PCM_16BIT',
    PCM_8BIT: 'PCM_8BIT'
};

// Number of audio channels
audioinput.CHANNELS = {
    MONO: 1,
    STEREO: 2
};

// Sampling rates
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
    AUDIOSOURCE_TYPE: audioinput.AUDIOSOURCE_TYPE.DEFAULT,
    DEBUG: false
};

/**
 * Does any initialization that might be required.
 *
 * @param cfg
 * @param onComplete
 */
audioinput.initialize = function (cfg, onComplete) {
    audioinput._handleInputParameters(cfg);
    exec(onComplete, audioinput._audioInputErrorEvent, "AudioInputCapture", "initialize",
        [audioinput._cfg.sampleRate,
            audioinput._cfg.bufferSize,
            audioinput._cfg.channels,
            audioinput._cfg.format,
            audioinput._cfg.audioSourceType,
            audioinput._cfg.fileUrl]);
};


/**
 * Checks (silently) whether the user has already given permission to access the microphone.
 *
 * @param onComplete
 */
audioinput.checkMicrophonePermission = function (onComplete) {
    exec(onComplete, audioinput._audioInputErrorEvent, "AudioInputCapture", "checkMicrophonePermission", []);
};


/**
 * Asks the user for permission to access the microphone.
 *
 * @param onComplete
 */
audioinput.getMicrophonePermission = function (onComplete) {
    exec(onComplete, audioinput._audioInputErrorEvent, "AudioInputCapture", "getMicrophonePermission", []);
};

/**
 * Start capture of Audio input
 *
 * @param {Object} cfg
 * keys:
 *  sampleRate (44100),
 *  bufferSize (16384),
 *  channels (1 (mono) or 2 (stereo)),
 *  format ('PCM_8BIT' or 'PCM_16BIT'),
 *  normalize (true || false),
 *  normalizationFactor (create float data by dividing the audio data with this factor; default: 32767.0)
 *  streamToWebAudio (The plugin will handle all the conversion of raw data to audio)
 *  audioContext (If no audioContext is given, one will be created)
 *  concatenateMaxChunks (How many packets will be merged each time, low = low latency but can require more resources)
 *  audioSourceType (Use audioinput.AUDIOSOURCE_TYPE)
 */
audioinput.start = function (cfg) {
    if (audioinput._capturing) throw "Already capturing!";

    audioinput._handleInputParameters(cfg);

    exec(audioinput._audioInputEvent, audioinput._audioInputErrorEvent, "AudioInputCapture", "start",
        [audioinput._cfg.sampleRate,
            audioinput._cfg.bufferSize,
            audioinput._cfg.channels,
            audioinput._cfg.format,
            audioinput._cfg.audioSourceType,
            audioinput._cfg.fileUrl]);

    audioinput._capturing = true;

    if (!audioinput._cfg.streamToWebAudio) return;

    if (audioinput._initWebAudio(audioinput._cfg.audioContext)) {
        audioinput._audioDataQueue = [];
        audioinput._getNextToPlay();
        return;
    }

    throw "The Web Audio API is not supported on this platform!";
};

/**
 * Stop capturing audio
 */
audioinput.stop = function (onStopped) {
    if (audioinput._capturing) {
        exec(onStopped, audioinput._audioInputErrorEvent, "AudioInputCapture", "stop", []);
        audioinput._capturing = false;
    }

    if (audioinput._timerGetNextAudio) clearTimeout(audioinput._timerGetNextAudio);
    audioinput._audioDataQueue = null;

    if (!audioinput._cfg.streamToWebAudio) return;

    if (!audioinput._micGainNode) return;
    audioinput.disconnect();
    audioinput._micGainNode.disconnect();
    audioinput._micGainNode = null;
};

/**
 * Connect the audio node
 *
 * @param audioNode
 */
audioinput.connect = function (audioNode) {
    if (!audioinput._micGainNode) return;

    audioinput.disconnect();
    audioinput._micGainNode.connect(audioNode);
};

/**
 * Disconnect the audio node
 */
audioinput.disconnect = function () {
    if (!audioinput._micGainNode) return;

    audioinput._micGainNode.disconnect();
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
audioinput._onErrorCallback = undefined;

/**
 *
 * @param cfg
 */
audioinput._handleInputParameters = function (cfg) {
    if (!cfg) cfg = {};
    if (!audioinput._cfg) audioinput._cfg = {};

    audioinput._cfg.sampleRate = parseInt(cfg.sampleRate) || audioinput.DEFAULT.SAMPLERATE;
    audioinput._cfg.bufferSize = parseInt(cfg.bufferSize) || audioinput.DEFAULT.BUFFER_SIZE;
    audioinput._cfg.channels = parseInt(cfg.channels) || audioinput.DEFAULT.CHANNELS;
    audioinput._cfg.format = cfg.format || audioinput.DEFAULT.FORMAT;
    audioinput._cfg.normalize = typeof cfg.normalize === 'boolean' ? cfg.normalize : audioinput.DEFAULT.NORMALIZE;
    audioinput._cfg.normalizationFactor = cfg.normalizationFactor || audioinput.DEFAULT.NORMALIZATION_FACTOR;
    audioinput._cfg.streamToWebAudio = typeof cfg.streamToWebAudio === 'boolean' ? cfg.streamToWebAudio : audioinput.DEFAULT.STREAM_TO_WEBAUDIO;
    audioinput._cfg.audioContext = cfg.audioContext || null;
    audioinput._cfg.concatenateMaxChunks = cfg.concatenateMaxChunks || audioinput.DEFAULT.CONCATENATE_MAX_CHUNKS;
    audioinput._cfg.audioSourceType = cfg.audioSourceType || 0;
    audioinput._cfg.fileUrl = cfg.fileUrl || null;
    audioinput._cfg.debug = typeof cfg.normalize === 'boolean' ? cfg.debug : audioinput.DEFAULT.DEBUG;
    audioinput._onErrorCallback = typeof cfg.onError === 'function' ? cfg.onError : undefined;

    if (isNaN(audioinput._cfg.channels) || (audioinput._cfg.channels < 1 && audioinput._cfg.channels > 2)) {
        throw "Invalid number of channels (" + audioinput._cfg.channels + "). Only mono (1) and stereo (2) is" +
        " supported.";
    }

    if (audioinput._cfg.format !== "PCM_16BIT" && audioinput._cfg.format !== "PCM_8BIT") {
        throw "Invalid format (" + audioinput._cfg.format + "). Only 'PCM_8BIT' and 'PCM_16BIT' is" + " supported.";
    }

    if (isNaN(audioinput._cfg.bufferSize) || audioinput._cfg.bufferSize <= 0) {
        throw "Invalid bufferSize (" + audioinput._cfg.bufferSize + "). Must be greater than zero.";
    }

    if (isNaN(audioinput._cfg.concatenateMaxChunks) || audioinput._cfg.concatenateMaxChunks <= 0) {
        throw "Invalid concatenateMaxChunks (" + audioinput._cfg.concatenateMaxChunks + "). Must be greater than zero.";
    }

    if (isNaN(audioinput._cfg.sampleRate)) {
        throw "Invalid sampleRate (" + audioinput._cfg.sampleRate + "). Use one defined in audioInput.SAMPLERATE.";
    }
};

/**
 * Callback for audio input
 *
 * @param {Object} audioInputData     keys: data (PCM)
 */
audioinput._audioInputEvent = function (audioInputData) {
    try {
        if (!audioInputData) {
            audioinput._audioInputErrorEvent("No audioInputData received from native layer.");
            return;
        }

        if (audioInputData.data && audioInputData.data.length > 0) {
            var audioData = audioinput._normalizeAudio(JSON.parse(audioInputData.data));

            if (audioinput._cfg.streamToWebAudio && audioinput._capturing) {
                audioinput._enqueueAudioData(audioData);
                return;
            }

            cordova.fireWindowEvent("audioinput", {data: audioData});
            return;
        }

        if (audioInputData.file) audioinput._audioInputFinishedEvent(audioInputData.file);

        if (!audioInputData.error) return;

        audioinput._audioInputErrorEvent(audioInputData.error);

    } catch (ex) {
        audioinput._audioInputErrorEvent("audioinput._audioInputEvent ex: " + ex);
    }
};

/**
 * Error callback for AudioInputCapture start
 * @param errorMessage
 * @private
 */
audioinput._audioInputErrorEvent = function (errorMessage) {
    cordova.fireWindowEvent("audioinputerror", {message: errorMessage});
    if (audioinput._onErrorCallback) audioinput._onErrorCallback(errorMessage);
    if (!audioinput._cfg.debug) return;
    console.error("audioinput._audioInputErrorEvent: " + errorMessage);
};

/**
 * Finished callback for AudioInputCapture start
 * @param fileUrl
 * @private
 */
audioinput._audioInputFinishedEvent = function (fileUrl) {
    cordova.fireWindowEvent("audioinputfinished", {file: fileUrl});
    if (!audioinput._cfg.debug) return;
    console.log("audioinput._audioInputFinishedEvent: " + fileUrl);
};

/**
 * Finished callback for AudioInputCapture start
 * @param debugMessage
 * @private
 */
audioinput._audioInputDebugEvent = function (debugMessage) {
    if (!audioinput._cfg.debug) return;
    cordova.fireWindowEvent("audioinputdebug", {message: debugMessage});
    console.log("audioinput._audioInputFinishedEvent: " + debugMessage);
};

/**
 * Returns a typed array, normalizing if needed
 * @param {number[]} pcmData - Array of short integers which came from the plugin
 */
audioinput._normalizeToTyped = function (pcmData) {
    if (!audioinput._cfg.normalize) return Int16Array.from(pcmData);

    var out = Float32Array.from(pcmData, function (i) {
        return audioinput._parseAsFloat(i) / audioinput._cfg.normalizationFactor;
    });

    if (isNaN(out[out.length - 1])) out.pop(); // If last value is NaN, remove it.

    return out;
}

/**
 * Returns a standard javascript array, normalizing if needed
 * @param {number[]} pcmData - Array of short integers which came from the plugin
 */
audioinput._normalizeNoTyped = function (pcmData) {
    if (!audioinput._cfg.normalize) return pcmData;

    var length = pcmData.length;
    for (var i = 0; i < length; i++) {
        pcmData[i] = audioinput._parseAsFloat(pcmData[i]) / audioinput._cfg.normalizationFactor;
    }
    if (isNaN(pcmData[length - 1])) pcmData.pop(); // If last value is NaN, remove it.

    return pcmData;
}

/**
 * Normalize audio input
 *
 * If typed arrays are supported by the browser then a Float32Array will be returned
 * if normalization is enabled; if not then a Int16Array will be returned. These are
 * much more efficient to work with since you can get sub-arrays without copying them.
 * If typed arrays are not supported then a normal array will be returned
 *
 * @param {Object} pcmData
 * @private
 *
 * @returns {Int16Array|Float32Array|Array}
 */
audioinput._normalizeAudio = hasTypedArrays ? audioinput._normalizeToTyped : audioinput._normalizeNoTyped;

/**
 * Consumes data from the audioinput queue
 * @private
 */
audioinput._getNextToPlay = function () {
    try {
        if (!audioinput._capturing) return;

        if (!(audioinput._audioDataQueue && audioinput._audioDataQueue.length > 0)) {
            audioinput._timerGetNextAudio = setTimeout(audioinput._getNextToPlay, 100);
            return;
        }

        var concatenatedData = [];
        for (var i = 0; i < audioinput._cfg.concatenateMaxChunks; i++) {
            if (audioinput._audioDataQueue.length === 0) break;
            concatenatedData = concatenatedData.concat(audioinput._dequeueAudioData());
        }
        audioinput._timerGetNextAudio = setTimeout(audioinput._getNextToPlay,
            audioinput._playAudio(concatenatedData) * 1000);

    } catch (ex) {
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
            } else {
                audioBuffer.getChannelData(0).set(data);
            }

            var source = audioinput._audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioinput._micGainNode);
            source.start(0);

            return audioBuffer.duration;
        }
    } catch (ex) {
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
        } else if (!audioinput._audioContext) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioinput._audioContext = new window.AudioContext();
            audioinput._webAudioAPISupported = true;
        }

        // Create a gain node for volume control
        if (!audioinput._micGainNode) audioinput._micGainNode = audioinput._audioContext.createGain();

        return true;
    } catch (e) {
        audioinput._webAudioAPISupported = false;
        audioinput._audioInputDebugEvent("_initWebAudio - Web Audio is not supported on this platform.");
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

/**
 *
 * @param num
 * @returns {number}
 * @private
 */
audioinput._parseAsFloat = function (num) {
    if (isNaN(num)) return 0.0;
    return parseFloat(num);
}

module.exports = audioinput;
