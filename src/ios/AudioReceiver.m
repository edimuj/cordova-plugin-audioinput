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

    /*if (pRecordState->mIsRunning) {
        [(AMRecorder *)pRecordState->mSelf stop];
    }*/
}



/**
	AudioReceiver class implementation
 */
@implementation AudioReceiver

@synthesize mySampleRate, myBufferSize, myChannels, myBitRate, myFormat, delegate;

/**
	Init instance
 */
- (AudioReceiver*)init:(int)sampleRate bufferSize:(int)bufferSizeInBytes noOfChannels:(short)channels audioFormat:
 (NSString*)format
{
	static const int maxBufferSize = 0x10000;

    if (self) {
		OSStatus status = noErr;

        AudioSessionInitialize(NULL,
                               NULL,
                               nil,
                               (__bridge void*) self);

        UInt32 sessionCategory = kAudioSessionCategory_PlayAndRecord;
        AudioSessionSetProperty(kAudioSessionProperty_AudioCategory,
                                sizeof(sessionCategory),
                                &sessionCategory);
        AudioSessionSetActive(true);

		int bitRate = 16;

        if([format isEqualToString:@"PCM_8BIT"]){
            bitRate = 8;
        }
        else {
            bitRate = 16;
        }

        _recordState.mDataFormat.mFormatID = kAudioFormatLinearPCM;
        _recordState.mDataFormat.mSampleRate = 44100.00; //(float)sampleRate;
        _recordState.mDataFormat.mBitsPerChannel = 16; //bitRate;
        _recordState.mDataFormat.mChannelsPerFrame = 1; //channels;
        _recordState.mDataFormat.mFramesPerPacket = 1;
        _recordState.mDataFormat.mBytesPerFrame = _recordState.mDataFormat.mBytesPerPacket = _recordState.mDataFormat.mChannelsPerFrame * sizeof(SInt16);
        _recordState.mDataFormat.mReserved = 0;
        _recordState.mDataFormat.mFormatFlags = kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked;
		// kLinearPCMFormatFlagIsNonInterleaved |
        _recordState.bufferByteSize = (UInt32) MIN(bufferSizeInBytes, maxBufferSize);
    }

    return self;
}


/**
	Start Audio Input capture
 */
- (void)start {
	OSStatus status = noErr;

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
}


/**
	Stop Audio Input capture
 */
- (void)stop {
    if (_recordState.mIsRunning) {
        AudioQueueStop(_recordState.mQueue, true);
        _recordState.mIsRunning = false;
    }
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
    AudioQueueDispose(_recordState.mQueue, true);
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
        exit(-1);
	}
}


@end
