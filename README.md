# cordova-plugin-audioinput

Cordova plugin which provides real-time audio data capture from the device's microphone.
It can be used for apps that apply effects to microphone input using for example the HTML5 Web Audio API.

Since 'Navigator.getUserMedia()' isn't supported by all browsers, this plugin enables similar functionality by forwarding raw audio data to the HTML5 app using continuous callbacks.

It adds the following `window` event:

* audioinput

## Installation

```
cordova plugin add cordova-plugin-audioinput
```

or

```
cordova plugin add https://github.com/edimuj/cordova-plugin-audioinput.git
```

## Supported Platforms

* Android

(iOS support is on the way.)

## Example

Define a callback function to receive audio input data. It will continuously be called during capture:

```javascript
function onAudioInput(evt) {
    
    // 'evt.data' is an integer array containing normalized audio data.
    //   
    console.log("Audio data received: " + evt.data.length + " samples");
    
    // ... do something with the evt.data array ...
}

// Listen to audioinput events.
window.addEventListener("audioinput", onAudioInput, false);
```

After the Cordova `deviceready` event has fired:

```javascript
var captureCfg = {
    sampleRate: 44100,
    bufferSize: 8192, 
    channels: 1,
    format: 'PCM_16BIT'
};

// Start capturing audio from the microphone
audioinput.start(captureCfg);

// Stop capturing audio input
audioinput.stop()
```

## Demo
The `demo` folder contains an simple example where the captured microphone audio data is used to playback the audio to the device speaker using the Web Audio API.

## API

Start capturing audio from the microphone:

```javascript
audioinput.start(captureCfg);
```

Where `captureCfg` can contain any of the following parameters (Please note that not all configurations are supported by all devices):

```javascript
var captureCfg = {
    sampleRate: 44100, // The Sample Rate in Hz. Default: 44100.
    bufferSize: 8192, // Maximum size in bytes of the capture buffer. Default: 16384.
    channels: 1, // The number of channels to use: Mono (1) or Stereo (2). Default: 1.
    format: 'PCM_16BIT' // The audio format. Currently PCM_16BIT and PCM_8BIT are supported. Default: 'PCM_16BIT'.
};
```

Stop capturing audio from the microphone:

```javascript
audioinput.stop();
```

##Credits

The plugin is created and maintained by Edin Mujkanovic.