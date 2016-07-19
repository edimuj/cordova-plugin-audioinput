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

    private final int RECORDING_BUFFER_FACTOR = 5;
    private int channelConfig = AudioFormat.CHANNEL_IN_MONO;
    private int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
    private int sampleRateInHz = 44100;
    private int audioSource = 0;

    // For the recording buffer
    private int minBufferSize = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat);
    private int recordingBufferSize = minBufferSize * RECORDING_BUFFER_FACTOR;

    // Used for reading from the AudioRecord buffer
    private int readBufferSize = minBufferSize;

    private AudioRecord recorder;
    private Handler handler;
    private Message message;
    private Bundle messageBundle = new Bundle();

    public AudioInputReceiver() {
        recorder = new AudioRecord(MediaRecorder.AudioSource.DEFAULT, sampleRateInHz, channelConfig, audioFormat, minBufferSize * RECORDING_BUFFER_FACTOR);
    }

    public AudioInputReceiver(int sampleRate, int bufferSizeInBytes, int channels, String format, int audioSource) {
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

        readBufferSize = bufferSizeInBytes;

        // Get the minimum recording buffer size for the specified configuration
        minBufferSize = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat);

        // We use a recording buffer size larger than the one used for reading to avoid buffer underrun.
        recordingBufferSize = readBufferSize * RECORDING_BUFFER_FACTOR;

        // Ensure that the given recordingBufferSize isn't lower than the minimum buffer size allowed for the current configuration
        //
        if (recordingBufferSize < minBufferSize) {
            recordingBufferSize = minBufferSize;
        }

        recorder = new AudioRecord(audioSource, sampleRateInHz, channelConfig, audioFormat, recordingBufferSize);
    }

    public void setHandler(Handler handler) {
        this.handler = handler;
    }

    @Override
    public void run() {
        int numReadBytes = 0;
        short audioBuffer[] = new short[readBufferSize];

        synchronized(this) {
            recorder.startRecording();

            while (!isInterrupted()) {
                numReadBytes = recorder.read(audioBuffer, 0, readBufferSize);

                if (numReadBytes > 0) {
                    try {
                        String decoded = Arrays.toString(audioBuffer);

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