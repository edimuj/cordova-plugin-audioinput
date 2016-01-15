# com.exelerus.cordova.audioinputcapture

This plugin captures the device's microphone and forwards the raw audio data to your HTML5 app.

It adds the following `window` event:

* audioinput

## Installation

```
cordova plugin add com.exelerus.cordova.audioinput
```

## Supported Platforms

* iOS
* Android

## Example

First define an function to receive audio input data:

```javascript
function onAudioInput(e) {
    console.log("Audio data received: " + e.data.length + " samples");
}
```

After the deviceready event has fired:

```javascript
window.addEventListener("audioinput", onAudioInput, false);

// To start capturing the audio input
audioinput.start();

// To stop capturing the audio input
audioinput.stop()
```
