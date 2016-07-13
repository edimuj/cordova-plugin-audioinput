# cordova-plugin-audioinput

This Cordova/PhoneGap plugin enables audio capture from the device microphone, by in near real-time forwarding raw audio data to the web layer of your application.
A typical usage scenario for this plugin would be to use the captured audio as source for a web audio node chain, where it then can be manipulated or analyzed with or without playback through the speakers.

Since `Navigator.getUserMedia()` still isn't supported by all browsers, this plugin provides similar functionality.
This is especially true for Safari mobile on iOS devices, where the Web Audio API is supported, but currently has no support for `getUserMedia`.

The plugin supports two different methods for capture:

1. Using the `audioinput` object as an Audio Node, which can be connected to your Web Audio node chain.
2. Using events to receive chunks of raw audio data, which then can be processed by your app.

When using the second method, the following `window` events are used:

* audioinput
* audioinputerror

## Installation
From the Cordova Plugin Repository:

```
cordova plugin add cordova-plugin-audioinput
```

or by using the GitHub project URL:

```
cordova plugin add https://github.com/edimuj/cordova-plugin-audioinput.git
```

Building with the Intel XDK is also supported. I haven't tested the plugin with PhoneGap build, so feel free to message me if you tried it there.

## Supported Platforms
* Android
* iOS

## Basic Usage Example - Audio Node
After the Cordova `deviceready` event has fired:

```javascript

// Start with default values and let the plugin handle conversion of raw data to web audio and therefore will not send any events.
audioinput.start({
    streamToWebAudio: true
});

// Then connect the audioinput to the device speakers in order to hear the captured sound. If an audio context is not provided, the plugin will create one for you.
audioinput.connect(audioinput.getAudioContext().destination);

```

## Advanced Usage Example - Events
Use the event based method if you need more control over the capture process.

Subscribe to `audioinput` events: The event will continuously be fired during capture, allowing the application to receive chunks of raw audio data.

You can also subscribe to `audioinputerror` error events as seen in the example below.

```javascript
function onAudioInput( evt ) {
    // 'evt.data' is an integer array containing normalized audio data
    //   
    console.log( "Audio data received: " + evt.data.length + " samples" );
    
    // ... do something with the evt.data array ...
}

// Listen to audioinput events
window.addEventListener( "audioinput", onAudioInput, false );

var onAudioInputError = function( error ) {
    alert( "onAudioInputError event recieved: " + error );
};

// Listen to audioinputerror events
window.addEventListener( "audioinputerror", onAudioInputError, false );

```

After the Cordova `deviceready` event has fired:

```javascript
var captureCfg = {
    bufferSize: 8192 // Here we've changed the bufferSize from the default to 8192 bytes
};

// Start capturing audio from the microphone
audioinput.start( captureCfg );

// Stop capturing audio input
audioinput.stop()
```

## Demo
The `demo` folder contains examples showing both basic and advanced (events) usage, where the captured microphone audio data is used to playback the audio to the device speaker using the Web Audio API.
Remember that unfiltered microphone output likely will create a nasty audio feedback loop so lower the volume before trying them out!

## API
**Start capturing audio** from the microphone:

```javascript
audioinput.start( captureCfg );
```

Where `captureCfg` can either be empty, null or contain any of the following parameters. 
Please note that not all audio configuration combinations are supported by all devices, and that all of them have default values:

```javascript
var captureCfg = {

    // The Sample Rate in Hz.
    sampleRate: 44100,
    
    // Maximum size in bytes of the capture buffer.
    bufferSize: 16384,
    
    // The number of channels to use: Mono (1) or Stereo (2).
    channels: 1,
    
    // The audio format. Currently PCM_16BIT and PCM_8BIT are supported.
    // For convienence use the audioinput.FORMAT constant to access the possible formats that the plugin supports. For example:
    // format: audioinput.FORMAT.PCM_16BIT
    format: 'PCM_16BIT',
    
    // Specifies if the audio data should be normalized or not.
    normalize: true,
    
    // Specifies the factor to use if normalization is performed.
    normalizationFactor: 32767.0,
    
    // If set to true, the plugin will handle all conversion of the data to web audio.
    // The plugin can then act as an AudioNode that can be connected to your web audio node chain.
    streamToWebAudio: false,
    
    // Used in conjunction with streamToWebAudio. If no audioContext is given, one (prefixed) will be created by the plugin.
    audioContext: null,
    
    // Defines how many chunks will be merged each time, a low value means lower latency but requires more CPU resources.
    concatenateMaxChunks: 10
};
```

**Stop capturing audio** from the microphone:

```javascript
audioinput.stop();
```

**Check if the plugin is capturing**, i.e. if it is started or not:

```javascript
audioinput.isCapturing(); // Returns true if it is started
```

**Get the current configuration** from the plugin:

```javascript
audioinput.getCfg();
```

When using the `streamToWebAudio` option, you can **connect the plugin** to your own web audio node chain:

```javascript
audioinput.connect( audioNode );
```

When using `streamToWebAudio` you can **disconnect the previously connected plugin** from your your own web audio node chain:

```javascript
audioinput.disconnect();
```

When using `streamToWebAudio`, and have not supplied the plugin with an audio context, the following method is used to **get the internally created audio context**:

```javascript
audioinput.getAudioContext();
```

## Contributing
This project is open-source, so contributions are welcome. Just ensure that your changes doesn't break backward compatibility.

1. Fork the project.
2. Create your feature branch (git checkout -b my-new-feature).
3. Commit your changes (git commit -am 'Add some feature').
4. Push to the branch (git push origin my-new-feature).
5. Create a new Pull Request.

## License
[MIT License](https://github.com/edimuj/cordova-plugin-audioinput/blob/master/LICENSE)

## Todo list
[Enhancements](https://github.com/edimuj/cordova-plugin-audioinput/labels/enhancement)

## Credits
The plugin is created by Edin Mujkanovic.
