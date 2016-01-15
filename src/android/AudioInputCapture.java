package com.exelerus.cordova.audioinputcapture;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;

import android.os.Handler;
import android.os.Message;
import android.util.Log;

public class AudioInputCapture extends CordovaPlugin
{
    private static final String LOG_TAG = "AudioInputCapture";

    private CallbackContext callbackContext = null;

    private AudioInputReceiver receiver;

    private final AudioInputCaptureHandler handler = new AudioInputCaptureHandler(this);

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("start")) {
            if (this.callbackContext != null) {
                callbackContext.error( "AudioInputCapture listener already running.");
                return true;
            }
            this.callbackContext = callbackContext;

            try {
                // cfg.sampleRate, cfg.bufferSize, cfg.channels, cfg.format
                int sampleRate = args.getInt(0);
                int bufferSize = args.getInt(1);
                int channels = args.getInt(2);
                String format = args.getString(3);

                receiver = new AudioInputReceiver(sampleRate, bufferSize, channels, format); // 16384
                receiver.setHandler(handler);
                receiver.start();
            } catch (Exception e) {
                e.printStackTrace();
                receiver.interrupt();
            }

            // Don't return any result now, since status results will be sent when events come in from broadcast receiver
            PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
            pluginResult.setKeepCallback(true);
            callbackContext.sendPluginResult(pluginResult);
            return true;
        }

        else if (action.equals("stop")) {
            receiver.interrupt();
            this.sendUpdate(new JSONObject(), false); // release status callback in JS side
            this.callbackContext = null;
            callbackContext.success();
            return true;
        }

        return false;
    }

    public void onDestroy() {
        if (!receiver.isInterrupted()) {
            receiver.interrupt();
        }
    }

    public void onReset() {
        if (!receiver.isInterrupted()) {
            receiver.interrupt();
        }
    }

    /**
     * Create a new plugin result and send it back to JavaScript
     */
    private void sendUpdate(JSONObject info, boolean keepCallback) {
        if (this.callbackContext != null) {
            PluginResult result = new PluginResult(PluginResult.Status.OK, info);
            result.setKeepCallback(keepCallback);
            this.callbackContext.sendPluginResult(result);
        }
    }

    private static class AudioInputCaptureHandler extends Handler {
        private final WeakReference<AudioInputCapture> mActivity;

        public AudioInputCaptureHandler(AudioInputCapture activity) {
            mActivity = new WeakReference<AudioInputCapture>(activity);
        }

        @Override
        public void handleMessage(Message msg) {
            AudioInputCapture activity = mActivity.get();
            if (activity != null) {
                JSONObject info = new JSONObject();
                try {
                    info.put("data", msg.getData().getString("data"));
                }
                catch (JSONException e) {
                    Log.e(LOG_TAG, e.getMessage(), e);
                }
                activity.sendUpdate(info, true);
            }
        }
    }
}
