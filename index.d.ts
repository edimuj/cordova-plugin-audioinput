declare module 'cordova-plugin-audioinput' { }

export interface AudioInputConfiguration {
  // The Sample Rate in Hz.
  // For convenience, use the audioinput.SAMPLERATE constants to set this parameter
  sampleRate?: number;

  // Maximum size in bytes of the capture buffer. Should be a power of two and <= 16384
  bufferSize?: number;

  // The number of channels to use: Mono (1) or Stereo (2).
  // For convenience, use the audioinput.CHANNELS constants to set this parameter.
  channels?: number;

  // The audio format. Currently PCM_16BIT and PCM_8BIT are supported.
  // For convenience, use the audioinput.FORMAT constant to access the possible
  // formats that the plugin supports
  format?: string;

  // Specifies if the audio data should be normalized or not.
  normalize?: boolean;

  // Specifies the factor to use if normalization is performed.
  normalizationFactor?: number;

  // If set to true, the plugin will handle all conversion of the data to
  // web audio. The plugin can then act as an AudioNode that can be connected
  // to your web audio node chain.
  streamToWebAudio?: boolean;

  // Used in conjunction with streamToWebAudio. If no audioContext is given,
  // one (prefixed) will be created by the plugin.
  audioContext?: AudioContext;


  // Defines how many chunks will be merged each time, a low value means lower latency
  // but requires more CPU resources.
  concatenateMaxChunks?: number;

  // Specifies the type of the type of source audio your app requires.
  // For convenience, use the audioinput.AUDIOSOURCE_TYPE constants to set this parameter:
  // -DEFAULT
  // -CAMCORDER - Microphone audio source with same orientation as camera if available.
  // -UNPROCESSED - Unprocessed sound if available.
  // -VOICE_COMMUNICATION - Tuned for voice communications such as VoIP.
  // -MIC - Microphone audio source. (Android only)
  // -VOICE_RECOGNITION - Tuned for voice recognition if available (Android only)
  audioSourceType?: number;

  // Optionally specifies a file://... URL to which the audio should be saved.
  // If this is set, then no audioinput events will be raised during recording.
  // When stop is called, a single audioinputfinished event will be raised, with
  // a "file" argument that contains the URL to which the audio was written,
  // and the callback passed into stop() will be invoked.
  // Currently, only WAV format files are guaranteed to be supported on all platforms.
  // When called initialize(), this should be a URL to the directory in which files will
  // be saved when calling start(), so that initialize() can ensure access to the directory
  // is available.
  fileUrl?: string;

  // Guess it?
  debug?: boolean;
}

declare interface AudioInput {

  FORMAT:  {
    PCM_16BIT: string;
    PCM_8BIT: string;
  }

  CHANNELS: {
    MONO: number;
    STEREO: number;
  }

  SAMPLERATE: {
    TELEPHONE_8000Hz: number;
    CD_QUARTER_11025Hz: number;
    VOIP_16000Hz: number;
    CD_HALF_22050Hz: number;
    MINI_DV_32000Hz: number;
    CD_XA_37800Hz: number;
    NTSC_44056Hz: number;
    CD_AUDIO_44100Hz: number;
  }

  AUDIOSOURCE_TYPE: {
    DEFAULT: number;
    CAMCORDER: number;
    MIC: number;
    UNPROCESSED: number;
    VOICE_COMMUNICATION: number;
    VOICE_RECOGNITION: number;
  }

  initialize(cfg: AudioInputConfiguration, onComplete: any): void;
  checkMicrophonePermission(onComplete: any): void;
  getMicrophonePermission(onComplete: any): void;
  start(cfg: AudioInputConfiguration): void;
  stop(onStopped: any): void;
  connect(audioNode: any): void;
  disconnect(): void;
  getAudioContext(): AudioContext;
  getCfg(): AudioInputConfiguration;
  isCapturing(): boolean | any[];
}
