# cordova-plugin-audioinput
This Cordova plugin enables audio capture from the device microphone, by in (near) real-time forwarding raw audio data to the web layer of your web application.
A typical usage scenario for this plugin would be to use the captured microphone audio as an audio source for [Web audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) based applications.

Since `Navigator.getUserMedia()` and `Navigator.mediaDevices.getUserMedia()` aren't supported by all browsers, this plugin provides similar functionality.

The plugin supports two different methods for microphone capture:

1. Let the plugin handle the encoding of raw data by using the `audioinput` object as an [AudioNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode), which can be connected to your Web audio API node chain.
2. Subscribing to `audioinput` events in order to receive chunks of raw audio data, which then can be processed by your app. Using this method doesn't require Web audio support on the device.

## Supported Platforms
* Android
* iOS
* browser

## Installation
From the Cordova Plugin Repository:
```
cordova plugin add cordova-plugin-audioinput
```

or by using the GitHub project URL:
```
cordova plugin add https://github.com/edimuj/cordova-plugin-audioinput.git
```

I haven't tested the plugin with PhoneGap build and ionic build, so feel free to message me if you tried it with success there.

## Events
When using the event based approach, the plugin emits the following `window` events:

* `audioinput`
* `audioinputerror`

## Basic Usage Example - AudioNode
After the Cordova `deviceready` event has fired:
```javascript

// Start with default values and let the plugin handle conversion of 
// raw data, and therefore will not send any audioinput events.
// If an audio context is not provided, the plugin will create one for you.``

function startCapture() {
	audioinput.start({
		streamToWebAudio: true
	});
	
	// Connect the audioinput to the device speakers in order to hear the captured sound.
	audioinput.connect(audioinput.getAudioContext().destination);
}

// First check whether we already have permission to access the microphone.
window.audioinput.checkMicrophonePermission(function(hasPermission) {
	if (hasPermission) {
		console.log("We already have permission to record.");
		startCapture();
	} 
	else {	        
		// Ask the user for permission to access the microphone
		window.audioinput.getMicrophonePermission(function(hasPermission, message) {
			if (hasPermission) {
				console.log("User granted us permission to record.");
				startCapture();
			} else {
				console.warn("User denied permission to record.");
			}
		});
	}
});


```

## Advanced Usage Example - Events
Use the event based method if you need more control over the capture process.

Subscribe to `audioinput` events: The event will continuously be fired during capture, allowing the application to 
receive chunks of raw audio data.

You can also subscribe to `audioinputerror` error events as seen in the example below:
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

After the Cordova `deviceready` event has fired (don't forget to first check/get microphone permissions 
as shown in the basic example above):
```javascript

// Start capturing audio from the microphone
audioinput.start({
    // Here we've changed the bufferSize from the default to 8192 bytes.
    bufferSize: 8192 
});

// Stop capturing audio input
audioinput.stop()

```

## Advanced Usage Example - Saving to files
Use `fileUrl` in the `captureCfg` if you want to save audio files directly to the file system.

This requires adding `cordova-plugin-file` to your project:
```javascript

// Get access to the file system
window.requestFileSystem(window.TEMPORARY, 5*1024*1024, function(fs) {
    console.log("Got file system: " + fs.name);
    fileSystem = fs;

    // Now you can initialize audio, telling it about the file system you want to use.
    var captureCfg = {
		sampleRate: 16000,
		bufferSize: 8192,
		channels: 1,
		format: audioinput.FORMAT.PCM_16BIT,
		audioSourceType: audioinput.AUDIOSOURCE_TYPE.DEFAULT,
		fileUrl: cordova.file.cacheDirectory
    };
    
    // Initialize the audioinput plugin.
    window.audioinput.initialize(captureCfg, function() {	
		// Now check whether we already have permission to access the microphone.
		window.audioinput.checkMicrophonePermission(function(hasPermission) {
		    if (hasPermission) {
				console.log("Already have permission to record.");
		    } 
		    else {	        
			    // Ask the user for permission to access the microphone
				window.audioinput.getMicrophonePermission(function(hasPermission, message) {
				    if (hasPermission) {
						console.log("User granted permission to record.");
				    } else {
						console.warn("User denied permission to record.");
				    }
				});
		    }
		});
    });
}, function (e) {
	console.log("Couldn't access file system: " + e.message)
});

// Later, when we want to record to a file...
var captureCfg = {
    fileUrl : cordova.file.cacheDirectory + "temp.wav"
}

// Start the capture.
audioinput.start(captureCfg);

// ...and when we're ready to stop recording.
audioinput.stop(function(url) {
    // Now you have the URL (which might be different to the one passed in to audioinput.start())
    // You might, for example, read the data into a blob.
    window.resolveLocalFileSystemURL(url, function (tempFile) {
	tempFile.file(function (tempWav) {
		    var reader = new FileReader();	    
		    reader.onloadend = function(e) {
		        // Create the blob from the result.
				var blob = new Blob([new Uint8Array(this.result)], { type: "audio/wav" });
				// Delete the temporary file.
				tempFile.remove(function (e) { console.log("temporary WAV deleted"); }, fileError);			
				// Do something with the blob.
				doSomethingWithWAVData(blob);		
		    }
		    reader.readAsArrayBuffer(tempWav);
		});
    }, function(e) {
		console.log("Could not resolveLocalFileSystemURL: " + e.message);
    });
});


```

## Demo app
[app-audioinput-demo](https://github.com/edimuj/app-audioinput-demo) is a Cordova app project using this plugin based 
on the examples below.

## Examples
The `demo` folder contains some usage examples.

Remember that unfiltered microphone output likely will create a nasty audio feedback loop, so lower the volume before trying out the demos!

* `webaudio-demo` - How to use the audioinput object as a Web Audio API AudioNode that can be connected to your own chain of AudioNodes.
* `events-demo` - How to subscribe to the audioinput events to get and handle chunks of raw audio data.
* `wav-demo` - How to encode recorded data to WAV format and use the resulting blob as a source for Audio elements.
* `file-demo` - How to encode recorded data to WAV format and save the resulting blob as a file. To run this demo ```cordova plugin add cordova-plugin-file``` is required.

## API
**Prepare for capturing audio** from the microphone.
Performs any required preparation for recording audio on the given platform.
```javascript
audioinput.initialize( captureCfg, onInitialized );
```

**Check whether the module already has permission to access the microphone.**
The callback function has a single boolean argument, which is true if access to the microphone
has been granted, and false otherwise. The check is silent - the user is not asked for permission
if they haven't already granted it.
```javascript
audioinput.checkMicrophonePermission( onComplete );
```

**Obtains permission to access the microphone from the user.**
This function will prompt the user for access to the microphone if they haven't already granted it.
The callback function has two arguments:
 * `hasPermission` - true if access to the microphone has been granted, and false otherwise.
```javascript
audioinput.getMicrophonePermission( onComplete );
```

**Start capturing audio** from the microphone.
Ensure that initialize and at least `checkMicrophonePermission` have been called before calling this.
The `captureCfg` parameter can include more configuration than previously passed to initialize.
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
    
    // Maximum size in bytes of the capture buffer. Should be a power of two and <= 16384.
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
    audioSourceType: audioinput.AUDIOSOURCE_TYPE.DEFAULT,

    // Optionally specifies a file://... URL to which the audio should be saved.
    // If this is set, then no audioinput events will be raised during recording.
    // When stop is called, a single audioinputfinished event will be raised, with
    // a "file" argument that contains the URL to which the audio was written,
    // and the callback passed into stop() will be invoked.
    // Currently, only WAV format files are guaranteed to be supported on all platforms.
    // When called initialize(), this should be a URL to the directory in which files will
    // be saved when calling start(), so that initialize() can ensure access to the directory
    // is available.
    fileUrl: null
    
};

```

**Stop capturing audio** from the microphone:
The callback function has a single string argument, which is the url where the file was saved,
if a fileUrl was passed in to start as part of captureCfg.
Note that the url passed out from stop is not guaranteed to be the same as the fileUrl passed in.
```javascript
audioinput.stop( onStopped );
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

## Todo list
[Enhancements](https://github.com/edimuj/cordova-plugin-audioinput/labels/enhancement)

## Motivate us!
Do you use this plugin in an published app? Feel free to star the project and/or message me about it. It is always super-exciting to see real-world applications using this plugin, and it helps us to prioritize new features and bug fixes.

And if you find this plugin useful, ensure that it is kept alive by donating:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=R9WGMBB2BMS34)

## Contributing
This project is open-source, so contributions are welcome. Just ensure that your changes doesn't break backward compatibility!

1. Fork the project.
2. Create your feature branch (git checkout -b my-new-feature).
3. Commit your changes (git commit -am 'Add some feature').
4. Push to the branch (git push origin my-new-feature).
5. Create a new Pull Request.

## Credits
* The plugin is created by Edin Mujkanovic.

[Other contributors](https://github.com/edimuj/cordova-plugin-audioinput/graphs/contributors)

## License
[MIT License](https://github.com/edimuj/cordova-plugin-audioinput/blob/master/LICENSE)
