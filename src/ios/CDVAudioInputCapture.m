/********* CDVAudioInputCapture.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import "AudioReceiver.h"

@interface CDVAudioInputCapture : CDVPlugin <AudioReceiverProtocol> {
}

@property (strong, nonatomic) AudioReceiver* audioReceiver;
@property (strong, nonatomic) NSString* fileUrl;
@property (strong) NSString* callbackId;

- (void)start:(CDVInvokedUrlCommand*)command;
- (void)stop:(CDVInvokedUrlCommand*)command;
- (void)startRecording:(CDVInvokedUrlCommand*)command;
- (void)didReceiveAudioData:(short*)data dataLength:(int)length;
- (void)didEncounterError:(NSString*)msg;
- (void)didFinish:(NSString*)url;

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

- (void)initialize:(CDVInvokedUrlCommand*)command
{
    _fileUrl = [command.arguments objectAtIndex:5];
    CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:nil];
    [result setKeepCallbackAsBool:NO];
    [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)checkMicrophonePermission:(CDVInvokedUrlCommand*)command
{
  BOOL hasPermission = FALSE;
  if ([[AVAudioSession sharedInstance] recordPermission] == AVAudioSessionRecordPermissionGranted) {
    hasPermission = TRUE;
  }
  CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:hasPermission];
  [result setKeepCallbackAsBool:NO];
  [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
}

- (void)getMicrophonePermission:(CDVInvokedUrlCommand*)command
{
  [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
      NSLog(@"permission : %d", granted);
      
      CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:granted];
      [result setKeepCallbackAsBool:NO];
      [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];
    }];
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
    _fileUrl = [command.arguments objectAtIndex:5];

    if (self.audioReceiver != nil) {
        [self.audioReceiver stop];
        /* TODO [self.audioReceiver dealloc]; */
	self.audioReceiver = nil;
    }

    self.audioReceiver = [[AudioReceiver alloc] init:sampleRate bufferSize:bufferSizeInBytes noOfChannels:channels audioFormat:format sourceType:audioSourceType fileUrl:_fileUrl];

    self.audioReceiver.delegate = self;

    [self.audioReceiver start];
}


- (void)stop:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        [self.audioReceiver stop];

        if (self.callbackId) {
            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDouble:0.0f];
	    /* if we are recording directly to file, we want to keep the callback */
            [result setKeepCallbackAsBool:(_fileUrl == nil?NO:YES)];
            [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];
        }

	if (_fileUrl == nil) {
	  self.callbackId = nil;
	}
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

- (void)didFinish:(NSString*)url
{
    [self.commandDelegate runInBackground:^{
        @try {
            if (self.callbackId) {
                NSDictionary* messageData = [NSDictionary dictionaryWithObject:[NSString stringWithString:url] forKey:@"file"];
                CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:messageData];
                [result setKeepCallbackAsBool:NO];
                [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];

		self.callbackId = nil;
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
  // only pause recording when we go into the background if we're not recording to a file
  // (otherwis it generates a spurious finished event, and starting again when in the foreground resets the file)
  if (_fileUrl == nil) [self.audioReceiver pause];
}


- (void)willEnterForeground
{
  // only start recording when we go into the foreground if we're not recording to a file
  // (otherwise starting again resets the file)
  if (_fileUrl == nil) [self.audioReceiver start];
}

@end
