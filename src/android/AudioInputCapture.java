package com.exelerus.cordova.audioinputcapture;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.io.File;
import java.net.URI;
import java.net.URISyntaxException;


import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.content.pm.PackageManager;
import org.apache.cordova.PermissionHelper;
import android.Manifest;

public class AudioInputCapture extends CordovaPlugin
{
    private static final String LOG_TAG = "AudioInputCapture";

    private CallbackContext callbackContext = null;
    private CallbackContext getPermissionCallbackContext = null;
    private AudioInputReceiver receiver;
    private final AudioInputCaptureHandler handler = new AudioInputCaptureHandler(this);

    public static String[]  permissions = { Manifest.permission.RECORD_AUDIO };
    public static int       RECORD_AUDIO = 0;
    public static final int PERMISSION_DENIED_ERROR = 20;
    public static final int INVALID_URL_ERROR = 30;
    public static final int INVALID_STATE_ERROR = 40;

    private boolean initialized = false;
    private int sampleRate = 44100;
    private int bufferSize = 4096;
    private int channels = 1;
    private String format = null;
    private int audioSource = 0;
    private URI fileUrl = null;
   
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("initialize")
	    // allow "start" to be called without "initialize", to keep backward compatibility
	    || (action.equals("start") && !initialized)) {

            this.callbackContext = callbackContext;
	    
            try {
	       this.sampleRate = args.getInt(0);
	       this.bufferSize = args.getInt(1);
	       this.channels = args.getInt(2);
	       this.format = args.getString(3);
	       this.audioSource = args.getInt(4);	       
	       if (args.isNull(5))  {
		  this.fileUrl = null;
	       } else {
		  String fileUrlString = args.getString(5);
		  this.fileUrl = new URI(fileUrlString);
		  // ensure it's a file URL
		  new File(this.fileUrl);
	       }
            }
	    catch (URISyntaxException e) { // not a valid URL
	       if (receiver != null) receiver.interrupt();
	       this.fileUrl = null;
	       
	       this.callbackContext.sendPluginResult(
		  new PluginResult(PluginResult.Status.ERROR, INVALID_URL_ERROR));
	       return false;
	    }
	    catch (IllegalArgumentException e) { // not a file URL
	       if (receiver != null) receiver.interrupt();
	       
	       this.callbackContext.sendPluginResult(
		  new PluginResult(PluginResult.Status.ERROR, INVALID_URL_ERROR));
	       return false;
	    }
            catch (Exception e) {
                if (receiver != null) receiver.interrupt();

                this.callbackContext.sendPluginResult(
		   new PluginResult(PluginResult.Status.ERROR, PERMISSION_DENIED_ERROR));
                return false;
            }

	    if (action.equals("initialize")) {
	       // Invoke callback
	       PluginResult result = new PluginResult(PluginResult.Status.OK);
	       callbackContext.sendPluginResult(result);
	       return true;
	    }
        } // allow fall-through through to "start"...

	if (action.equals("checkMicrophonePermission")) {
	   if(PermissionHelper.hasPermission(this, permissions[RECORD_AUDIO])) {
	      PluginResult result = new PluginResult(PluginResult.Status.OK, Boolean.TRUE);
	      callbackContext.sendPluginResult(result);
	   } 
	   else {
	      PluginResult result = new PluginResult(PluginResult.Status.OK, Boolean.FALSE);
	      callbackContext.sendPluginResult(result);
	   }
	   return true;
        }
	
	if (action.equals("getMicrophonePermission")) {
	   if(PermissionHelper.hasPermission(this, permissions[RECORD_AUDIO])) {
	      PluginResult result = new PluginResult(PluginResult.Status.OK, Boolean.TRUE);
	      callbackContext.sendPluginResult(result);
	   } 
	   else {
	      // save context for when we know whether they've given permission
	      getPermissionCallbackContext = callbackContext;

	      // return nothing in particular for now...
	      PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
	      pluginResult.setKeepCallback(true);
	      callbackContext.sendPluginResult(pluginResult);

	      // ask for permission
	      getMicPermission(RECORD_AUDIO);

	   }
	   return true;
        }

        if (action.equals("start")) {
            try {
                this.sampleRate = args.getInt(0);
                this.bufferSize = args.getInt(1);
                this.channels = args.getInt(2);
                this.format = args.getString(3);
                this.audioSource = args.getInt(4);
	       if (args.isNull(5))  {
		  this.fileUrl = null;
	       } else {
		   String fileUrlString = args.getString(5);
		   this.fileUrl = new URI(fileUrlString);
		   // ensure it's a file URL
		   new File(this.fileUrl);
	       }

                promptForRecord();
            }
	    catch (URISyntaxException e) { // not a valid URL
                if (receiver != null) receiver.interrupt();
		this.fileUrl = null;

                this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR,
                INVALID_URL_ERROR));
                return false;
	    }
	    catch (IllegalArgumentException e) { // not a file URL
                if (receiver != null) receiver.interrupt();

                this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR,
                INVALID_URL_ERROR));
                return false;
	    }
            catch (Exception e) {
                if (receiver != null) receiver.interrupt();

                this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR,
                PERMISSION_DENIED_ERROR));
                return false;
            }

            // Don't return any result now, since status results will be sent when events come in from broadcast receiver
            PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
            pluginResult.setKeepCallback(true);
            callbackContext.sendPluginResult(pluginResult);
            return true;
        }

	if (action.equals("stop")) {
	    if (receiver != null)
	    {
	       receiver.interrupt();
	       // only do this if we're not saving to a file,
	       // otherwise we won't get the event about the file being complete
	       if (fileUrl == null) {
		  this.sendUpdate(new JSONObject(), false); // release status callback in JS side
		  this.callbackContext = null;
	       }
	       callbackContext.success();
	       return true;
	    }
	    else
	    { // not recording, so can't stop
                this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR,
                INVALID_STATE_ERROR));
                return false;
	    }
        }

        return false;
    }

    public void onDestroy() {
        if (receiver != null && !receiver.isInterrupted()) {
            receiver.interrupt();
        }
    }

    public void onReset() {
        if (receiver != null && !receiver.isInterrupted()) {
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
                try {
                    info.put("error", msg.getData().getString("error"));
                }
                catch (JSONException e) {
                    Log.e(LOG_TAG, e.getMessage(), e);
                }
		if (activity.fileUrl != null) {
		   try {
		      info.put("file", msg.getData().getString("file"));
		      activity.sendUpdate(info, false); // release status callback in JS side
		      activity.callbackContext = null;
		   }
		   catch (JSONException e) {
		      Log.e(LOG_TAG, e.getMessage(), e);
		   }
		}
		else {
		   activity.sendUpdate(info, true);
		}
            }
        }
    }

    /**
     * Prompt user for record audio permission
     */
    protected void getMicPermission(int requestCode) {
        PermissionHelper.requestPermission(this, requestCode, permissions[RECORD_AUDIO]);
    }

    /**
     * Ensure that we have gotten record audio permission
     */
    private void promptForRecord() {
        // if we've already got a receiver, stop it
        if (receiver != null) receiver.interrupt();
	
        if(PermissionHelper.hasPermission(this, permissions[RECORD_AUDIO])) {
	   receiver = new AudioInputReceiver(this.sampleRate, this.bufferSize, this.channels, this.format, this.audioSource, this.fileUrl);
            receiver.setHandler(handler);
            receiver.start();
        }
        else {
            getMicPermission(RECORD_AUDIO);
        }
    }

    /**
     * Handle request permission result
     */
    public void onRequestPermissionResult(int requestCode, String[] permissions,
                                              int[] grantResults) throws JSONException {
       
        for(int r:grantResults) {
            if(r == PackageManager.PERMISSION_DENIED) {
	       if (this.getPermissionCallbackContext == null) {
		  // called directly from "start"
		  this.callbackContext.sendPluginResult(
		     new PluginResult(PluginResult.Status.ERROR, PERMISSION_DENIED_ERROR));
		  return;
	       }
	       else { // called from "getMicrophonePermission"
		  PluginResult result = new PluginResult(PluginResult.Status.OK, Boolean.FALSE);
		  this.getPermissionCallbackContext.sendPluginResult(result);
	       }
            }
        }

	if (this.getPermissionCallbackContext == null) {
	   // called directly from "start"
	   promptForRecord();
	}
	else { // called from "getMicrophonePermission"
	   PluginResult result = new PluginResult(PluginResult.Status.OK, Boolean.TRUE);
	   this.getPermissionCallbackContext.sendPluginResult(result);
	}
    }
}
