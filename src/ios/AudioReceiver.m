//
//  AudioReceiver.m
//  AudioReceiver
//
//  Created by Edin Mujkanovic on 2016-02-06.
//
//

#import "AudioReceiver.h"


/**
    Audio Input callback
 */
void HandleInputBuffer(void* inUserData,
                       AudioQueueRef inAQ,
                       AudioQueueBufferRef inBuffer,
                       const AudioTimeStamp* inStartTime,
                       UInt32 inNumPackets,
                       const AudioStreamPacketDescription* inPacketDesc) {

    AQRecordState* pRecordState = (AQRecordState *)inUserData;

    if (inNumPackets == 0 && pRecordState->mDataFormat.mBytesPerPacket != 0) {
        inNumPackets = inBuffer->mAudioDataByteSize / pRecordState->mDataFormat.mBytesPerPacket;
    }

    if ( ! pRecordState->mIsRunning) {
        return;
    }

    long sampleStart = pRecordState->mCurrentPacket;
    long sampleEnd = pRecordState->mCurrentPacket + inBuffer->mAudioDataByteSize / pRecordState->mDataFormat.mBytesPerPacket - 1;

    short* samples = (short*)inBuffer->mAudioData;
    long nsamples = sampleEnd - sampleStart + 1;

    pRecordState->mCurrentPacket += inNumPackets;

    AudioQueueEnqueueBuffer(pRecordState->mQueue, inBuffer, 0, NULL);

    [pRecordState->mSelf didReceiveAudioData:samples dataLength:(int)nsamples];
}



/**
    AudioReceiver class implementation
 */
@implementation AudioReceiver

@synthesize mySampleRate, myBufferSize, myChannels, myBitRate, myFormat, delegate;

/**
    Init instance
 */
- (AudioReceiver*)init:(int)sampleRate bufferSize:(int)bufferSizeInBytes noOfChannels:(short)channels audioFormat:(NSString*)format sourceType:(int)audioSourceType fileUrl:(NSString*)url
{
	static const int maxBufferSize = 0x100000;

    if (self) {
        OSStatus status = noErr;

        AVAudioSession* avSession = [AVAudioSession sharedInstance];

        NSError *setCategoryError = nil;
        if (![avSession setCategory:AVAudioSessionCategoryPlayAndRecord
         withOptions:AVAudioSessionCategoryOptionMixWithOthers | AVAudioSessionCategoryOptionDefaultToSpeaker
         error:&setCategoryError]) {
            // handle error?
        }

        if(audioSourceType == 7) {
            [avSession setMode:AVAudioSessionModeVoiceChat error:nil];
        }
        else if(audioSourceType == 5) {
            [avSession setMode:AVAudioSessionModeVideoRecording error:nil];
        }
        else if(audioSourceType == 9) {
            [avSession setMode:AVAudioSessionModeMeasurement error:nil];
        }
        else {
            [avSession setMode:AVAudioSessionModeDefault error:nil];
        }

        int bitRate = 16;
        if([format isEqualToString:@"PCM_8BIT"]){
            bitRate = 8;
        }

        _recordState.mDataFormat.mFormatID = kAudioFormatLinearPCM;
        _recordState.mDataFormat.mSampleRate = 1.0 * sampleRate;
        _recordState.mDataFormat.mBitsPerChannel = bitRate;
        _recordState.mDataFormat.mChannelsPerFrame = channels;
        _recordState.mDataFormat.mFramesPerPacket = 1;
        _recordState.mDataFormat.mBytesPerPacket =_recordState.mDataFormat.mBytesPerFrame = (_recordState.mDataFormat.mBitsPerChannel / 8) * _recordState.mDataFormat.mChannelsPerFrame;
        _recordState.mDataFormat.mReserved = 0;
        _recordState.mDataFormat.mFormatFlags = kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked;
        _recordState.bufferByteSize = (UInt32) MIN(bufferSizeInBytes, maxBufferSize);

        if (url == nil || [url isKindOfClass:[NSNull class]]) {
            _fileUrl = nil;
        } else {
            // assign fileUrl
            NSCharacterSet *set = [NSCharacterSet URLHostAllowedCharacterSet];
            _fileUrl = [NSURL URLWithString:[url stringByAddingPercentEncodingWithAllowedCharacters:set]];
            if (_fileUrl.isFileURL) {
                _filePath = _fileUrl.path;
                NSLog(@"[INFO] iosaudiorecorder:temp file path: %@", _filePath);
            }

        }

    }

    return self;
}


/**
    Start Audio Input capture
 */
- (void)start {
    [self startRecording];
}


- (void) startRecording{
  NSLog(@"[INFO] startRecording: %d", _recordState.mIsRunning);
    OSStatus status = noErr;

    if (_recordState.mIsRunning == YES) {
      [self stop];
    }

    if (_fileUrl == nil || [_fileUrl isKindOfClass:[NSNull class]]) {
      _recordState.mCurrentPacket = 0;
      _recordState.mSelf = self;

      status = AudioQueueNewInput(&_recordState.mDataFormat,
				  HandleInputBuffer,
				  &_recordState,
				  CFRunLoopGetCurrent(),
				  kCFRunLoopCommonModes,
				  0,
				  &_recordState.mQueue);

      [self hasError:status:__FILE__:__LINE__];

      for (int i = 0; i < kNumberBuffers; i++) {
        status = AudioQueueAllocateBuffer(_recordState.mQueue, _recordState.bufferByteSize, &_recordState.mBuffers[i]);
        [self hasError:status:__FILE__:__LINE__];

        status = AudioQueueEnqueueBuffer(_recordState.mQueue, _recordState.mBuffers[i], 0, NULL);
        [self hasError:status:__FILE__:__LINE__];
      }

      _recordState.mIsRunning = YES;

      status = AudioQueueStart(_recordState.mQueue, NULL);
      [self hasError:status:__FILE__:__LINE__];

    } else { /* recording direct to file */

      NSDictionary *recordingSettings = @{AVFormatIDKey : @(kAudioFormatLinearPCM),
                                        AVNumberOfChannelsKey : @(_recordState.mDataFormat.mChannelsPerFrame),
                                        AVSampleRateKey : @(_recordState.mDataFormat.mSampleRate),
                                        AVLinearPCMBitDepthKey : @(16),
                                        AVLinearPCMIsBigEndianKey : @NO,
                                        //AVLinearPCMIsNonInterleaved : @YES,
                                        AVLinearPCMIsFloatKey : @NO,
                                        AVEncoderAudioQualityKey : @(AVAudioQualityMax)
                                        };

      NSError *error = nil;

      if (_filePath == nil) {
	/* URL was not a valid file URL */
	NSString *msg = [NSString stringWithFormat:@"Invalid file URL: %@", _fileUrl];
	[self.delegate didEncounterError:msg];
      } else {

	AVAudioSession *audioSession = [AVAudioSession sharedInstance];
	[audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
			    error:nil];

	_audioRecorder = [[AVAudioRecorder alloc]
                              initWithURL:_fileUrl
				 settings:recordingSettings
				    error:&error];

	if (error) {
	  NSLog(@"[INFO] iosaudiorecorder: error: %@", [error localizedDescription]);
	  NSString *msg = [NSString stringWithFormat:@"AVAudioRecorder error: %@", [error localizedDescription]];
	  [self.delegate didEncounterError:msg];
	} else {
	  [_audioRecorder prepareToRecord];
	  [_audioRecorder record];
	  _recordState.mIsRunning = YES;
	  NSLog(@"[INFO] iosaudiorecorder:Recording...");
	}
      }
      _startedFileUrl = _fileUrl;
    } /* recording direct to file */
}

/**
    Stop Audio Input capture
 */
- (void)stop {
  NSLog(@"[INFO] stop: %d", _recordState.mIsRunning);

    if (_recordState.mIsRunning) {
      _recordState.mIsRunning = false;
      if (_fileUrl == nil || [_fileUrl isKindOfClass:[NSNull class]]) {
        AudioQueueStop(_recordState.mQueue, true);
      } else {
	[_audioRecorder stop];
	[self didFinish:_startedFileUrl.absoluteString];
      }
    }
  NSLog(@"[INFO] stopped: %d", _recordState.mIsRunning);
}


/**
    Pause Audio Input capture
 */
- (void)pause {
    AudioQueuePause(_recordState.mQueue);
}


/**
    Deallocate audio queue
 */
- (void)dealloc {
  if (_fileUrl == nil) {
    AudioQueueDispose(_recordState.mQueue, true);
  }
}


/**
    Forward sample data
 */
- (void)didReceiveAudioData:(short*)samples dataLength:(int)length {
    [self.delegate didReceiveAudioData:samples dataLength:length];
}


/**
    Debug
 */
-(void)hasError:(int)statusCode:(char*)file:(int)line
{
    if (statusCode) {
        NSLog(@"Error Code responded %d in file %s on line %d\n", statusCode, file, line);
		NSString *msg = [NSString stringWithFormat:@"AudioReceiver error [%d]", statusCode];
		[self.delegate didEncounterError:msg];
    }
}

/**
    Finished
 */
- (void)didFinish:(NSString*)file {
    [self.delegate didFinish:file];
}


@end
