//
//  AudioReceiver.h
//  AudioReceiver
//
//  Created by Edin Mujkanovic on 2016-02-06.
//
//

#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>
#import <AudioToolbox/AudioToolbox.h>
#include <limits.h>
#include <Accelerate/Accelerate.h>
#include <CoreFoundation/CFRunLoop.h>

#define kNumberBuffers 10

typedef struct {
    __unsafe_unretained id mSelf;
    AudioStreamBasicDescription mDataFormat;
    AudioQueueRef mQueue;
    AudioQueueBufferRef mBuffers[kNumberBuffers];
    UInt32 bufferByteSize;
    SInt64 mCurrentPacket;
    bool mIsRunning;
} AQRecordState;


@interface AudioReceiver : NSObject

    @property (nonatomic, assign) id delegate;

    @property (nonatomic, assign) AQRecordState recordState;

    @property (nonatomic) int mySampleRate;
    @property (nonatomic) int myBufferSize;
    @property (nonatomic) short myChannels;
    @property (nonatomic) short myBitRate;
    @property (nonatomic) NSString* myFormat;

- (void)start;
- (void)stop;
- (void)pause;
- (void)dealloc;
- (AudioReceiver*)init:(int)sampleRate bufferSize:(int)bufferSizeInBytes noOfChannels:(short)channels audioFormat:(NSString*)format sourceType:(int)audioSourceType;
- (void)didReceiveAudioData:(short*)samples dataLength:(int)length;
- (void)hasError:(int)statusCode:(char*)file:(int)line;

@end


@protocol AudioReceiverProtocol

- (void)didReceiveAudioData:(short*)data dataLength:(int)length;
- (void)didEncounterError:(NSString*)msg;

@end