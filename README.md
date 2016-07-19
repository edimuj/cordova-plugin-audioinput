# cordova-plugin-audioinput
This Cordova plugin enables audio capture from the device microphone, by in (near) real-time forwarding raw audio data to the web layer of your web application.
A typical usage scenario for this plugin would be to use the captured microphone audio as a source for a Web audio API based applications.

Since `Navigator.getUserMedia()` still isn't supported by all browsers, this plugin provides similar functionality.
This is especially true for Safari mobile on iOS devices, where the Web Audio API is supported, but currently has no support for `getUserMedia`.

The plugin supports two different methods for microphone capture:

1. Let the plugin handle the encoding of raw data by using the `audioinput` object as an [AudioNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode), which can be connected to your Web audio API node chain.
2. Subscribing to `audioinput` events in order to receive chunks of raw audio data, which then can be processed by your app. Using this method doesn't require Web audio support on the device.

## Supported Platforms
* Android
* iOS

## Installation
From the Cordova Plugin Repository:
```
cordova plugin add cordova-plugin-audioinput
```

or by using the GitHub project URL:
```
cordova plugin add https://github.com/edimuj/cordova-plugin-audioinput.git
```

Building with the Intel XDK is also supported. I haven't tested the plugin with PhoneGap build, so feel free to message me if you tried it with success there.

## Events
When using the event based approach, the plugin sends the following `window` events:

* `audioinput`
* `audioinputerror`

## Basic Usage Example - AudioNode
After the Cordova `deviceready` event has fired:
```javascript

// Start with default values and let the plugin handle conversion of 
// raw data, and therefore will not send any audioinput events.
// If an audio context is not provided, the plugin will create one for you.

audioinput.start({
    streamToWebAudio: true
});

// Connect the audioinput to the device speakers in order to hear the captured sound.

audioinput.connect(audioinput.getAudioContext().destination);

```

## Advanced Usage Example - Events
Use the event based method if you need more control over the capture process.

Subscribe to `audioinput` events: The event will continuously be fired during capture, allowing the application to receive chunks of raw audio data.

You can also subscribe to `audioinputerror` error events as seen in the example below.
```javascript

function onAudioInput( evt ) {
    // 'evt.data' is an integer array containing raw audio data
    //   
    console.log( "Audio data received: " + evt.data.length + " samples" );
    
    // ... do something with the evt.data array ...
}

// Listen to audioinput events
window.addEventListener( "audioinput", onAudioInput, false );

var onAudioInputError = function( error ) {
    alert( "onAudioInputError event recieved: " + JSON.stringify(error) );
};

// Listen to audioinputerror events
window.addEventListener( "audioinputerror", onAudioInputError, false );

```

After the Cordova `deviceready` event has fired:
```javascript

// Start capturing audio from the microphone
audioinput.start({
    // Here we've changed the bufferSize from the default to 8192 bytes.
    bufferSize: 8192 
});

// Stop capturing audio input
audioinput.stop()

```

## Demos
The `demo` folder contains some usage examples.

Remember that unfiltered microphone output likely will create a nasty audio feedback loop, so lower the volume before trying out the demos!

* webaudio-demo - How to use the audioinput object as a Web Audio API AudioNode that can be connected to your own chain of AudioNodes.
* events-demo - How to subscribe to the audioinput events to get and handle chunks of raw audio data.
* wav-demo - How to encode recorded data to WAV format and use the resulting blob as a source for Audio elements.
* file-demo - How to encode recorded data to WAV format and save the resulting blob as a file.

## API
**Start capturing audio** from the microphone.
If your app doesn't have recording permission on the users device, the plugin will ask for permission when start is called. And the new Android 6.0 runtime permissions are also supported.
```javascript
audioinput.start( captureCfg );
```

Where `captureCfg` can either be empty, null or contain/override any of the following parameters and their default values. 
Please note that not all audio configuration combinations are supported by all devices, the default settings seems to work on most devices though:
```javascript
var captureCfg = {

    // The Sample Rate in Hz.
    // For convenience, use the audioinput.SAMPLERATE constants to set this parameter.
    sampleRate: audioinput.SAMPLERATE.CD_AUDIO_44100Hz,
    
    // Maximum size in bytes of the capture buffer.
    bufferSize: 16384,
    
    // The number of channels to use: Mono (1) or Stereo (2).
    // For convenience, use the audioinput.CHANNELS constants to set this parameter.
    channels: audioinput.CHANNELS.MONO,
    
    // The audio format. Currently PCM_16BIT and PCM_8BIT are supported.
    // For convenience, use the audioinput.FORMAT constant to access the possible 
    // formats that the plugin supports.
    format: audioinput.FORMAT.PCM_16BIT,
    
    // Specifies if the audio data should be normalized or not.
    normalize: true,
    
    // Specifies the factor to use if normalization is performed.
    normalizationFactor: 32767.0,
    
    // If set to true, the plugin will handle all conversion of the data to 
    // web audio. The plugin can then act as an AudioNode that can be connected 
    // to your web audio node chain.
    streamToWebAudio: false,
    
    // Used in conjunction with streamToWebAudio. If no audioContext is given, 
    // one (prefixed) will be created by the plugin.
    audioContext: null,
    
    // Defines how many chunks will be merged each time, a low value means lower latency
    // but requires more CPU resources.
    concatenateMaxChunks: 10,
    
    // Specifies the type of the type of source audio your app requires.
    // For convenience, use the audioinput.AUDIOSOURCE_TYPE constants to set this parameter:
    // -DEFAULT
    // -CAMCORDER - Microphone audio source with same orientation as camera if available.
    // -UNPROCESSED - Unprocessed sound if available.
    // -VOICE_COMMUNICATION - Tuned for voice communications such as VoIP.
    // -MIC - Microphone audio source. (Android only)
    // -VOICE_RECOGNITION - Tuned for voice recognition if available (Android only)
    audioSourceType: audioinput.AUDIOSOURCE_TYPE.DEFAULT
    
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

When using the `streamToWebAudio` option, you can **connect the plugin** to your own Web audio node chain:
```javascript
audioinput.connect( audioNode );
```

When using `streamToWebAudio` you can **disconnect the previously connected plugin** from your your own Web audio node chain:
```javascript
audioinput.disconnect();
```

When using `streamToWebAudio`, and have not supplied the plugin with an Audio context, the following method is used to **get the internally created Web Audio context**:
```javascript
audioinput.getAudioContext();
```

## Motivate us!
Do you use this plugin in an published app? Feel free to star the project and/or message me about it. It is always super-exciting to see real-world applications using this plugin, and it helps us to prioritize new features and bug fixes.

## Contributing
This project is open-source, so contributions are welcome. Just ensure that your changes doesn't break backward compatibility!

1. Fork the project.
2. Create your feature branch (git checkout -b my-new-feature).
3. Commit your changes (git commit -am 'Add some feature').
4. Push to the branch (git push origin my-new-feature).
5. Create a new Pull Request.

## Todo list
[Enhancements](https://github.com/edimuj/cordova-plugin-audioinput/labels/enhancement)

## Credits
* The plugin is created by Edin Mujkanovic.

* [zyf0330](https://github.com/zyf0330) 
* [Tattomoosa](https://github.com/Tattomoosa)

## License
[MIT License](https://github.com/edimuj/cordova-plugin-audioinput/blob/master/LICENSE)
