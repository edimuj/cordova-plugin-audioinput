# cordova-plugin-audioinput

Cordova plugin which provides real-time audio data capture from the device's microphone.
It can be used for apps that apply effects to microphone input using for example the HTML5 Web Audio API.

Since 'Navigator.getUserMedia()' isn't supported by all browsers, this plugin enables similar functionality by forwarding raw audio data to the HTML5 app using continuous callbacks.

It adds the following `window` events:

* audioinput
* audioinputerror

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
* iOS

## Basic Usage Example

```javascript

// Start with default values and let the plugin handle conversion from raw data to web audio and will not send any events.
audioinput.start({
    streamToWebAudio: true
});

// Connect the audioinput to the device speakers in order to hear the captured sound. If an audio context is not provided, the plugin will create one for you.
audioinput.connect(audioinput.getAudioContext().destination);

// Remember that this will create an audio feedback loop so lower the volume!

```

## Advanced Usage Example - Events

Use this event based method if you want more control over the capture process.

Define a callback function to subscribe to `audioinput` events.
The callback function will continuously be called during capture, allowing your application to receive chunks of raw audio data.
You can also subscribe to error events `audioinputerror` as seen in the example below.

```javascript
function onAudioInput(evt) {
    
    // 'evt.data' is an integer array containing normalized audio data.
    //   
    console.log("Audio data received: " + evt.data.length + " samples");
    
    // ... do something with the evt.data array ...
}

// Listen to audioinput events.
window.addEventListener("audioinput", onAudioInput, false);

var onAudioInputError = function(error) {
    alert("onAudioInputError event recieved: " + error);
};

// Listen to audioinputerror events.
window.addEventListener("audioinputerror", onAudioInput, false);

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
The `demo` folder contains examples showing both basic and advanced usage, where the captured microphone audio data is used to playback the audio to the device speaker using the Web Audio API.

## API
Start capturing audio from the microphone:

```javascript
audioinput.start( captureCfg );
```

Where `captureCfg` can contain any of the following parameters (Please note that not all audio configurations are supported by all devices):

```javascript
var captureCfg = {
    sampleRate: 44100, // The Sample Rate in Hz. Default: 44100.
    bufferSize: 8192, // Maximum size in bytes of the capture buffer. Default: 16384.
    channels: 1, // The number of channels to use: Mono (1) or Stereo (2). Default: 1.
    format: 'PCM_16BIT' // The audio format. Currently PCM_16BIT and PCM_8BIT are supported. Default: 'PCM_16BIT'.
    normalize // Specifies if the audio data should be normalized or not. Default: true.
    normalizationFactor // Specifies the factor to use when normalization is performed. Default: 32767.0.
    streamToWebAudio // If set to true, the plugin will handle all conversion of the data to web audio. The audioplugin can then act as an AudioNode that can be connected to your web audio node chain. Default: false
    audioContext // Used in conjunction with streamToWebAudio. If no audioContext is given, one will be created by the plugin.
    concatenateMaxChunks // Defines how many chunks will be merged each time, a low value means lower latency but requires more CPU resources. Default: 10.
};
```

Stop capturing audio from the microphone:

```javascript
audioinput.stop();
```

Check if the audioinput plugin is capturing, i.e. started or not:

```javascript
audioinput.isCapturing();
```

Get the current configuration from the audioinput plugin:

```javascript
audioinput.getCfg();
```

When using `streamToWebAudio` you can connect the audioinput plugin to your web audio node chain:

```javascript
audioinput.connect( audioNode );
```

When using `streamToWebAudio` you can disconnect the previously connected audioinput plugin from your your web audio node chain:

```javascript
audioinput.disconnect();
```

When using `streamToWebAudio`, and have not supplied the audioinput plugin with an audio context, the following method is used to get the internally created audio context:

```javascript
audioinput.getAudioContext();
```

##Credits

The plugin is created and maintained by Edin Mujkanovic.