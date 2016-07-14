package com.exelerus.cordova.audioinputcapture;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;

import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import java.util.Arrays;

import android.util.Base64;

public class AudioInputReceiver extends Thread {

    private int channelConfig = AudioFormat.CHANNEL_IN_MONO;

    private int audioFormat = AudioFormat.ENCODING_PCM_16BIT;

    private int sampleRateInHz = 44100;

    private int bufferSize = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat);

    private AudioRecord recorder;

    private Handler handler;

    private Message message;

    private Bundle messageBundle = new Bundle();

    public AudioInputReceiver() {
        recorder = new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, sampleRateInHz, channelConfig, audioFormat, bufferSize);
    }

    public AudioInputReceiver(int sampleRate, int bufferSizeInBytes, int channels, String format) {

		sampleRateInHz = sampleRate;

		switch (channels) {
            case 2:
                channelConfig = AudioFormat.CHANNEL_IN_STEREO;
                break;
			case 1:
            default:
                channelConfig = AudioFormat.CHANNEL_IN_MONO;
                break;
        }
		if(format == "PCM_8BIT") {
			audioFormat = AudioFormat.ENCODING_PCM_8BIT;
		}
		else {
			audioFormat = AudioFormat.ENCODING_PCM_16BIT;
		}

        bufferSize = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat);
        // Ensure that the given bufferSize isn't lower than the minimum buffer sized allowed for the current configuration
        if (bufferSizeInBytes < bufferSize) {
            bufferSize = bufferSizeInBytes;
        }
        recorder = new AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, sampleRateInHz, channelConfig, audioFormat, bufferSize);
    }

    public void setHandler(Handler handler) {
        this.handler = handler;
    }

    @Override
    public void run() {
        int numReadBytes = 0;
        short audioBuffer[] = new short[bufferSize];

        synchronized(this)
        {
            recorder.startRecording();

            while (!isInterrupted()) {
                numReadBytes = recorder.read(audioBuffer, 0, bufferSize);

                if (numReadBytes > 0) {

					try {
						//String decoded = Base64.encodeToString(audioBuffer,Base64.NO_WRAP);
						String decoded = Arrays.toString(audioBuffer);

	                    // send data to handler
	                    message = handler.obtainMessage();
	                    messageBundle.putString("data", decoded);
	                    message.setData(messageBundle);
	                    handler.sendMessage(message);
                    }
                    catch(Exception ex) {
	                    message = handler.obtainMessage();
	                    messageBundle.putString("error", ex.toString());
	                    message.setData(messageBundle);
	                    handler.sendMessage(message);
                    }
                }
            }

            if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
                recorder.stop();
            }

            recorder.release();
            recorder = null;
        }
    }
}
