/********* CDVAudioInputCapture.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import "AudioReceiver.h"

@interface CDVAudioInputCapture : CDVPlugin <AudioReceiverProtocol> {
}

@property (strong, nonatomic) AudioReceiver* audioReceiver;
@property (strong) NSString* callbackId;

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)stop:(CDVInvokedUrlCommand*)command;
- (void)startRecording:(CDVInvokedUrlCommand*)command;
- (void)didReceiveAudioData:(short*)data dataLength:(int)length;
- (void)didEncounterError:(NSString*)msg;

@end

@implementation CDVAudioInputCapture

- (void)pluginInitialize
{
    NSNotificationCenter* listener = [NSNotificationCenter defaultCenter];

    [listener addObserver:self
                 selector:@selector(didEnterBackground)
                     name:UIApplicationDidEnterBackgroundNotification
                   object:nil];

    [listener addObserver:self
                 selector:@selector(willEnterForeground)
                     name:UIApplicationWillEnterForegroundNotification
                   object:nil];
}


- (void)start:(CDVInvokedUrlCommand*)command
{
    self.callbackId = command.callbackId;

    [self startRecording:command];
}


- (void)startRecording:(CDVInvokedUrlCommand*)command
{
    int sampleRate = [[command.arguments objectAtIndex:0] intValue];
    int bufferSizeInBytes = [[command.arguments objectAtIndex:1] intValue];
    short channels = [[command.arguments objectAtIndex:2] intValue];
    NSString* format = [command.arguments objectAtIndex:3];
    int audioSourceType = [[command.arguments objectAtIndex:4] intValue];

    self.audioReceiver = [[AudioReceiver alloc] init:sampleRate bufferSize:bufferSizeInBytes noOfChannels:channels audioFormat:format sourceType:audioSourceType];

    self.audioReceiver.delegate = self;

    [self.audioReceiver start];
}


- (void)stop:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        [self.audioReceiver stop];

        if (self.callbackId) {
            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDouble:0.0f];
            [result setKeepCallbackAsBool:NO];
            [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
        }

        self.callbackId = nil;
    }];
}


- (void)didReceiveAudioData:(short*)data dataLength:(int)length
{
    [self.commandDelegate runInBackground:^{
        @try {
            NSMutableArray *mutableArray = [NSMutableArray arrayWithCapacity:length];

            if(length == 0) {
                // We'll ignore empty data for now
            }
            else {
                for (int i = 0; i < length; i++) {
                    NSNumber *number = [[NSNumber alloc] initWithShort:data[i]];
                    [mutableArray addObject:number];
                }

                NSString *str = [mutableArray componentsJoinedByString:@","];
                NSString *dataStr = [NSString stringWithFormat:@"[%@]", str];
                NSDictionary* audioData = [NSDictionary dictionaryWithObject:[NSString stringWithString:dataStr] forKey:@"data"];

                if (self.callbackId) {
                    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:audioData];
                    [result setKeepCallbackAsBool:YES];
                    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
                }
            }
        }
        @catch (NSException *exception) {
            if (self.callbackId) {
                            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                            messageAsString:@"Exception in didReceiveAudioData"];
                            [result setKeepCallbackAsBool:YES];
                            [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
                        }
        }
    }];
}



- (void)didEncounterError:(NSString*)msg
{
    [self.commandDelegate runInBackground:^{
        @try {
            if (self.callbackId) {
                NSDictionary* errorData = [NSDictionary dictionaryWithObject:[NSString stringWithString:msg] forKey:@"error"];
                CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsDictionary:errorData];
                [result setKeepCallbackAsBool:YES];
                [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
            }
        }
        @catch (NSException *exception) {
            if (self.callbackId) {
                            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR
                            messageAsString:@"Exception in didEncounterError"];
                            [result setKeepCallbackAsBool:YES];
                            [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
                        }
        }
    }];
}




- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationDidEnterBackgroundNotification object:nil];
    [[NSNotificationCenter defaultCenter] removeObserver:self name:UIApplicationWillEnterForegroundNotification object:nil];

    [self stop:nil];
}


- (void)onReset
{
    [self stop:nil];
}


- (void)didEnterBackground
{
    [self.audioReceiver pause];
}


- (void)willEnterForeground
{
    [self.audioReceiver start];
}

@end
