# com.exelerus.cordova.audioinput

Since Navigator.getUserMedia() isn't supported by all browsers, this plugin enables similar audio capture from the device's microphone audio, by forwarding the raw audio data to the HTML5 app using callbacks.

It adds the following `window` event:

* audioinput

## Installation

```
cordova plugin add https://github.com/edimuj/cordova-plugin-audioinput.git
```

## Supported Platforms

* Android

## Example

First define a function to receive the audio input data:

```javascript
function onAudioInput(e) {
    console.log("Audio data received: " + e.data.length + " samples");
    
    // ... do something with the data ...
}
```

After the Cordova deviceready event has fired:

```javascript
// Listen to audioinput events.
window.addEventListener("audioinput", onAudioInput, false);

// Capture configuration
var captureCfg = {
    sampleRate: 44100, // Hz
    bufferSize: 8192, // bytes
    channels: 1, // Mono
    format: 'PCM_16BIT' // either PCM_16BIT or PCM_8BIT
};

// Start capturing the audio input
audioinput.start(captureCfg);

// Stop capturing the audio input
audioinput.stop()
```

The demo folder contains an example where the captured microphone audio data is used together with the Web Audio API.
