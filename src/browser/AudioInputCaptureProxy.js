/*License (MIT)

Copyright © 2013 Matt Diamond

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

// 2017-10-29 robert@fromont.net.nz Implement as a Cordova plugin for the 'browser' platform

// Public:

function initialize(success, error, opts) {
    console.log("AudioInputCaptureProxy: initialize: " + JSON.stringify(opts));
    onInitialized = success;
    if (!intialized) {
        sampleRate = opts[0] || sampleRate;
        bufferSize = opts[1] || bufferSize;
        channels = opts[2] || channels;
        format = opts[3] || format;
        audioSourceType = opts[4] || audioSourceType;
        fileUrl = opts[5] || fileUrl;

        if (fileUrl) {
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            if (window.webkitStorageInfo && window.webkitStorageInfo.requestQuota) {
                // Chrome/Android requires calling requestQuota first
                window.webkitStorageInfo.requestQuota(
                    /file:\/\/\/temporary.*/.test(fileUrl) ? window.TEMPORARY : window.PERSISTENT,
                    10 * 1024 * 1024,
                    function (grantedBytes) {
                        console.log("AudioInputCaptureProxy: Granted " + grantedBytes + " bytes storage");
                        window.requestFileSystem(
                            /file:\/\/\/temporary.*/.test(fileUrl) ? window.TEMPORARY : window.PERSISTENT,
                            10 * 1024 * 1024,
                            function (fs) {
                                console.log("AudioInputCaptureProxy: Got file system: " + fs.name);
                                fileSystem = fs;
                                intialized = true;
                                onInitialized();
                            }, error);
                    }, error);
            }
            else {
                // Firefox and Safari/iOS require calling requestFileSystem directly
                window.requestFileSystem(
                    /file:\/\/\/temporary.*/.test(fileUrl) ? window.TEMPORARY : window.PERSISTENT,
                    10 * 1024 * 1024,
                    function (fs) {
                        console.log("AudioInputCaptureProxy: Got file system: " + fs.name);
                        fileSystem = fs;
                        intialized = true;
                        onInitialized();
                    }, error);
            }
            return;
        } // fileUrl set
        intialized = true;
    } // !initialized
    onInitialized();
}

function checkMicrophonePermission(success, error, opts) {
    console.log("AudioInputCaptureProxy: checkMicrophonePermission");
    success(microphonePermission);
}

function getMicrophonePermission(success, error, opts) {
    console.log("AudioInputCaptureProxy: getMicrophonePermission");
    if (microphonePermission) { // already got permission
        success(microphonePermission);
    }
    else { // start audio processing
        initAudio(success, error);
    }
}

function start(success, error, opts) {
    console.log("AudioInputCaptureProxy: start: " + JSON.stringify(opts));
    sampleRate = opts[0] || sampleRate;
    bufferSize = opts[1] || bufferSize;
    channels = opts[2] || channels;
    format = opts[3] || format;
    audioSourceType = opts[4] || audioSourceType;
    fileUrl = opts[5] || fileUrl;
    // the URL must be converted to a cdvfile:... URL to ensure it's readable from the outside
    fileUrl = fileUrl.replace("filesystem:file:///", "cdvfile://localhost/");
    console.log("AudioInputCaptureProxy: start - fileUrl: " + fileUrl);

    if (!audioRecorder) {
        error("Not initialized");
        return;
    }
    audioRecorder.clear();
    audioRecorder.record();

}

function stop(success, error, opts) {
    console.log("AudioInputCaptureProxy: stop");
    onStopped = success;
    onStopError = error;
    audioRecorder.stop();
    audioRecorder.getBuffers(gotBuffers);
}

// Private:

var sampleRate = 44100;
var bufferSize = 1024;
var channels = 1;
var format = null;
var audioSourceType = null;
var fileUrl = null;
var intialized = false;
var microphonePermission = false;
var audioContext = null;
var onInitialized = null;
var onSuccessGotStream = null;
var onStopped = null;
var onStopError = null;
var audioRecorder = null;
var fileSystem = null;

function initAudio(onSuccess, onError) {
    console.log("AudioInputCaptureProxy: initAudio");
    audioContext = new window.AudioContext();
    if (!navigator.getUserMedia) {
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    }
    if (!navigator.getUserMedia) {
        onSuccess(false, "getUserMedia not supported");
        return;
    }
    onSuccessGotStream = onSuccess;
    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, function (e) {
            console.log("AudioInputCaptureProxy: " + e);
            onSuccess(false, e);
        });
} // initiAudio

// callback by web audio when access to the microphone is gained (browser platform)
function gotStream(stream) {
    console.log("AudioInputCaptureProxy: gotStream");

    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    audioStream = stream;
    realAudioInput = audioContext.createMediaStreamSource(stream);
    if (channels = 1) {
        audioInput = convertToMono(realAudioInput);
    }
    else {
        audioInput = realAudioInput;
    }

    // we will end up downsampling, but recorderWorker.js does this by simply dropping samples
    // so we use a low pass filter to prevent aliasing of higher frequencies
    if (sampleRate < audioContext.sampleRate) {
        var lowPassFilter = audioContext.createBiquadFilter();
        audioInput.connect(lowPassFilter);
        lowPassFilter.connect(inputPoint);
        lowPassFilter.type = lowPassFilter.LOWPASS || "lowpass";
        lowPassFilter.frequency.value = sampleRate / 2;
        lowPassFilter.connect(inputPoint);
    }
    else {
        audioInput.connect(inputPoint);
    }

    console.log("AudioInputCaptureProxy: creating audioRecorder");
    audioRecorder = new Recorder(inputPoint, {sampleRate: sampleRate});

    // pump through zero gain so that the microphone input doesn't play out the speakers causing feedback
    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect(zeroGain);
    zeroGain.connect(audioContext.destination);

    microphonePermission = true;
    onSuccessGotStream(microphonePermission);
} // gotStream

function convertToMono(input) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect(splitter);
    splitter.connect(merger, 0, 0);
    splitter.connect(merger, 0, 1);
    return merger;
}

// callback from recorder invoked when recordin is finished
function gotBuffers(wav) {
    if (channels == 1) {
        audioRecorder.exportMonoWAV(doneEncoding, wav);
    }
    else {
        audioRecorder.exportWAV(doneEncoding, wav);
    }
}

function doneEncoding(blob) {
    console.log("AudioInputCaptureProxy: doneEncoding - write to: " + fileUrl);
    var fileName = fileUrl.replace(/.*\//, "");
    console.log("AudioInputCaptureProxy: doneEncoding - write to file: " + fileName);
    fileSystem.root.getFile(fileName, {create: true}, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {
            fileWriter.onwriteend = function (e) {
                onStopped(fileUrl);
            };
            fileWriter.onerror = function (e) {
                console.log("AudioInputCaptureProxy: " + fileUrl + " failed");
                onStopError(e);
            };
            console.log("AudioInputCaptureProxy: Saving " + fileUrl);
            fileWriter.write(blob);
        }, function (e) {
            console.log("AudioInputCaptureProxy: Could not create writer for " + fileUrl);
            onStopError(e);
        }); // createWriter .wav
    }, function (e) {
        console.log("AudioInputCaptureProxy: Could not get " + fileUrl + " -  " + e.toString());
        onStopError(e);
    }); // getFile .wav
}

// 2015-01-28 robert@fromont.net.nz Adding a unique query string ensures it's loaded
// which in turn ensures the workers starts (in Firefox)
var WORKER_PATH = 'RecorderWorker.js?' + new Date();

var Recorder = function (source, cfg) {
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if (!this.context.createScriptProcessor) {
        this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    }
    else {
        this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
        command: 'init',
        config: {
            sampleRate: this.context.sampleRate,
            downsampleRate: config.sampleRate || this.context.sampleRate
        }
    });
    var recording = false,
        currCallback;

    this.node.onaudioprocess = function (e) {
        if (!recording) return;
        worker.postMessage({
            command: 'record',
            buffer: [
                e.inputBuffer.getChannelData(0),
                e.inputBuffer.getChannelData(1)
            ]
        });
    };

    this.configure = function (cfg) {
        for (var prop in cfg) {
            if (cfg.hasOwnProperty(prop)) {
                config[prop] = cfg[prop];
            }
        }
    };

    this.record = function () {
        recording = true;
    };

    this.stop = function () {
        recording = false;
    };

    this.clear = function () {
        worker.postMessage({command: 'clear'});
    };

    this.getBuffers = function (cb) {
        currCallback = cb || config.callback;
        worker.postMessage({command: 'getBuffers'})
    };

    this.exportWAV = function (cb) {
        currCallback = cb || config.callback;
        type = config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
            command: 'exportWAV',
            type: type
        });
    };

    this.exportMonoWAV = function (cb) {
        currCallback = cb || config.callback;
        type = config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
        worker.postMessage({
            command: 'exportMonoWAV',
            type: type
        });
    };

    worker.onmessage = function (e) {
        var blob = e.data;
        currCallback(blob);
    };

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
};

// 2017-10-29 robert@fromont.net.nz Implement as a Cordova plugin for the 'browser' platform
// Define module exports:
module.exports = {
    initialize: initialize,
    checkMicrophonePermission: checkMicrophonePermission,
    getMicrophonePermission: getMicrophonePermission,
    start: start,
    stop: stop
};

require('cordova/exec/proxy').add('AudioInputCapture', module.exports);
