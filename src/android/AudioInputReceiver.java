/*
License (MIT)

Copyright © 2016 Edin Mujkanovic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

package com.exelerus.cordova.audioinputcapture;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.util.Base64;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import java.io.File;
import java.io.FileOutputStream;
import java.io.BufferedOutputStream;
import java.io.DataOutputStream;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.Arrays;


public class AudioInputReceiver extends Thread {

	private final int RECORDING_BUFFER_FACTOR = 5;
	private int channelConfig = AudioFormat.CHANNEL_IN_MONO;
	private int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
	private int sampleRateInHz = 44100;
	private int audioSource = 0;

	// Recording buffer
	private int minBufferSize = AudioRecord.getMinBufferSize(sampleRateInHz, channelConfig, audioFormat);
	private int recordingBufferSize = minBufferSize * RECORDING_BUFFER_FACTOR;

	// Reading from the AudioRecord buffer
	private int readBufferSize = minBufferSize;

	private AudioRecord recorder;
	private Handler handler;
	private Message message;
	private Bundle messageBundle = new Bundle();
	private URI fileUrl;

	public AudioInputReceiver() {
		recorder = new AudioRecord(MediaRecorder.AudioSource.DEFAULT, sampleRateInHz, channelConfig, audioFormat, minBufferSize * RECORDING_BUFFER_FACTOR);
	}

	public AudioInputReceiver(int sampleRate, int bufferSizeInBytes, int channels, String format, int audioSource, URI fileUrl) {
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
		this.fileUrl = fileUrl;
	}

	public void setHandler(Handler handler) {
		this.handler = handler;
	}

	@Override
	public void run() {
		if (fileUrl == null) {

			// Forward audio data to Cordova Web app
			//

			int numReadBytes = 0;
			short audioBuffer[] = new short[readBufferSize];
			synchronized(this) {
			    recorder.startRecording();

				try
				{
					while (!isInterrupted()) {
						numReadBytes = recorder.read(audioBuffer, 0, readBufferSize);

						if (numReadBytes > 0) {
							try {
								String decoded = Arrays.toString(audioBuffer);

								message = handler.obtainMessage();
								messageBundle = new Bundle();
								messageBundle.putString("data", decoded);
								message.setData(messageBundle);
								handler.sendMessage(message);
							}
							catch(Exception ex) {
								message = handler.obtainMessage();
								messageBundle = new Bundle();
								messageBundle.putString("error", ex.toString());
								message.setData(messageBundle);
								handler.sendMessage(message);
							}
						}
					}

					if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
						recorder.stop();
					}
				}
				catch(Exception ex)
				{
					message = handler.obtainMessage();
					messageBundle = new Bundle();
					messageBundle.putString("error", ex.toString());
					message.setData(messageBundle);
					handler.sendMessage(message);
				}

			    recorder.release();
			    recorder = null;
			}
		}
		else
		{
			// Recording to fileUrl
			//
			int numReadBytes = 0;
			byte audioBuffer[] = new byte[readBufferSize];

			synchronized(this) {
				URI finalUrl = fileUrl; // Even if the member changes, we use what we were originally given
				recorder.startRecording();

				try
				{
					File audioFile = File.createTempFile("AudioInputReceiver-", ".pcm");
					FileOutputStream os = new FileOutputStream(audioFile.getPath());

					while (!isInterrupted()) {
						numReadBytes = recorder.read(audioBuffer, 0, readBufferSize);

						if (numReadBytes > 0) {
							try {
								os.write(audioBuffer, 0, numReadBytes);
							}
							catch(Exception ex) {
								message = handler.obtainMessage();
								messageBundle = new Bundle();
								messageBundle.putString("error", ex.toString());
								message.setData(messageBundle);
								handler.sendMessage(message);
							}
						}
					}

					os.close();
					File wav = new File(finalUrl);
					addWavHeader(audioFile, wav);
					audioFile.delete();

					message = handler.obtainMessage();
					messageBundle = new Bundle();
					messageBundle.putString("file", wav.toURI().toString());
					message.setData(messageBundle);
					handler.sendMessage(message);

					if (recorder.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
						recorder.stop();
					}
				}
				catch(Throwable ex)
				{
					message = handler.obtainMessage();
					messageBundle = new Bundle();
					messageBundle.putString("error", ex.toString());
					message.setData(messageBundle);
					handler.sendMessage(message);
				}

				recorder.release();
				recorder = null;
			}
		}
	}

	private File addWavHeader(File fPCM, File wav) {
		try {
			long mySubChunk1Size = 16;
			int myBitsPerSample= audioFormat==AudioFormat.ENCODING_PCM_8BIT?8:16;
			int myFormat = 1;
			long myChannels = channelConfig==AudioFormat.CHANNEL_IN_STEREO?2:1;
			long mySampleRate = sampleRateInHz;
			long myByteRate = mySampleRate * myChannels * myBitsPerSample/8;
			int myBlockAlign = (int) (myChannels * myBitsPerSample/8);

			long myDataSize = fPCM.length();
			long myChunk2Size =  myDataSize * myChannels * myBitsPerSample/8;
			long myChunkSize = 36 + myChunk2Size;

			OutputStream os = new FileOutputStream(wav);
			BufferedOutputStream bos = new BufferedOutputStream(os);
			DataOutputStream outFile = new DataOutputStream(bos);

			outFile.writeBytes("RIFF");                                     // 00 - RIFF
			outFile.write(intToByteArray((int)myChunkSize), 0, 4);          // 04 - how big is the rest of this file?
			outFile.writeBytes("WAVE");                                     // 08 - WAVE
			outFile.writeBytes("fmt ");                                     // 12 - fmt
			outFile.write(intToByteArray((int)mySubChunk1Size), 0, 4);      // 16 - size of this chunk
			outFile.write(shortToByteArray((short)myFormat), 0, 2);         // 20 - what is the audio format? 1 for PCM = Pulse Code Modulation
			outFile.write(shortToByteArray((short)myChannels), 0, 2);       // 22 - mono or stereo? 1 or 2?  (or 5 or ???)
			outFile.write(intToByteArray((int)mySampleRate), 0, 4);         // 24 - samples per second (numbers per second)
			outFile.write(intToByteArray((int)myByteRate), 0, 4);           // 28 - bytes per second
			outFile.write(shortToByteArray((short)myBlockAlign), 0, 2);     // 32 - # of bytes in one sample, for all channels
			outFile.write(shortToByteArray((short)myBitsPerSample), 0, 2);  // 34 - how many bits in a sample(number)?  usually 16 or 24
			outFile.writeBytes("data");                                     // 36 - data
			outFile.write(intToByteArray((int)myDataSize), 0, 4);           // 40 - how big is this data chunk
            // 44 - the actual data itself - is written in loop below

			FileInputStream pcmIn = new FileInputStream(fPCM);
			byte buffer[] = new byte[1024];
			int iBytesRead = pcmIn.read(buffer);

			while (iBytesRead > 0)
			{
				outFile.write(buffer, 0, iBytesRead);
				iBytesRead = pcmIn.read(buffer);
			}

			pcmIn.close();

			outFile.flush();
			outFile.close();

		}
		catch (IOException e) {
			e.printStackTrace();
		}

		fPCM.delete();
		return wav;
	}

	private static byte[] intToByteArray(int i)
	{
		byte[] b = new byte[4];
		b[0] = (byte) (i & 0x00FF);
		b[1] = (byte) ((i >> 8) & 0x000000FF);
		b[2] = (byte) ((i >> 16) & 0x000000FF);
		b[3] = (byte) ((i >> 24) & 0x000000FF);
		return b;
	}

	// Convert a short to a byte array
	public static byte[] shortToByteArray(short data)
	{
		/*
 		 * NB have also tried: return new byte[]{(byte)(data & 0xff),(byte)((data >> 8) & 0xff)};
		 *
		 */

		return new byte[]{(byte)(data & 0xff),(byte)((data >>> 8) & 0xff)};
	}
}
