// Determines which platform the demo runs on
var isMobile = {
    Android: function () {
        return /Android/i.test(navigator.userAgent);
    },
    BlackBerry: function () {
        return /BlackBerry/i.test(navigator.userAgent);
    },
    iOS: function () {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    any: function () {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS());
    }
};


/**
 * Debug output messages
 *
 * @param msg The message to show
 */
var consoleMessage = function (msg) {
    console.log(msg);
    document.getElementById("infoMessage").innerHTML = msg;
};


/**
 * Generates some random audio input data and dispatches an audioinput event for each buffer
 *
 * @param bufferSize
 * @param numberOfIterations
 */
var generateSimulatedAudioInput = function (bufferSize, numberOfIterations) {

    var bufSize = bufferSize || 16000,
        iterations = numberOfIterations || 100;

    for (var i = 0; i < iterations; i++) {
        var data = [];

        for (var k = 0; k < bufSize; k++) {
            data.push((parseFloat(Math.random() * 1.0) - 0.5));
        }

        // Dispatch an event
        var event = new CustomEvent('audioinput');
        event.data = data;
        window.dispatchEvent(event);
    }
};

/**
 * Get a formatted YYYYMMDDHHMMSS string from the date
 * @returns {*}
 */
Date.prototype.YYYYMMDDHHMMSS = function () {
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    return this.getFullYear() +
        pad2(this.getMonth() + 1) +
        pad2(this.getDate()) +
        pad2(this.getHours()) +
        pad2(this.getMinutes()) +
        pad2(this.getSeconds());
};

var disableStartButton = function() {
    document.getElementById("startCapture").disabled = true;
    document.getElementById("stopCapture").disabled = false;
};

var disableStopButton = function() {
    document.getElementById("startCapture").disabled = false;
    document.getElementById("stopCapture").disabled = true;
};

var disableAllButtons = function() {
    document.getElementById("startCapture").disabled = true;
    document.getElementById("stopCapture").disabled = true;
};