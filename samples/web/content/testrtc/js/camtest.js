/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

// Test spec
// 1. TODO: Enumerate cameras.
// 2. Try opening the (a) camera in VGA.
// 3. TODO: Try camera in other resolutions, particularly HD.
// 4. TODO: Translate gum failures to user friendly messages, using
//   MediaStreamError.name in { NotSupportedError, PermissionDeniedError,
//   ConstrainNotSatisfiedError, OverconstrainedError, NotFoundError,
//   AbortError, SourceUnavailableError }.
// 4.Check that the MediaStreamTrack associated with the camera looks good.
// 4.a Capture for a couple of seconds and monitor the events on the
//   MediaStreamTrack: onEnded(), onMute(), onUnmute().
// 4.b If onEnded() fires, reportFatal() is called (e.g. camera is unplugged).
// 4.c We keep a local |isMuted| state during the capture period (4.a) to check
//   it at the end. (TODO: local isMuted can be deprecated once
//   mediaStreamTrack.muted property is wired up in Chrome).
// 4.d After the wait period we check that the video tag where the |stream| is
//   plugged in has the appropriate width and height.
// 5. Tear down the |stream|. TODO: this should be done in the test harness.

var CamCaptureTest = {};
CamCaptureTest.isMuted = false;
CamCaptureTest.stream = null;

CamCaptureTest.CamCaptureTest = function () {
  var constraints = { video: true, audio: false};
  doGetUserMedia(constraints, function(stream) {
    CamCaptureTest.stream = stream;
    if (CamCaptureTest.checkVideoTracks(stream)) {
      CamCaptureTest.checkVideoStart(stream);

    var video = document.getElementById('main-video');
      attachMediaStream(video, stream);

      reportInfo("Checking if your camera is delivering frames for five " +
                 "seconds...");
      setTimeout(function() {
        CamCaptureTest.checkVideoFinish(video);
      }, 5000);
    }
  });
}

addTestSuite("CamCaptureTest", CamCaptureTest.CamCaptureTest);

CamCaptureTest.checkVideoTracks = function(stream) {
  reportSuccess("getUserMedia succeeded.");
  var tracks = stream.getVideoTracks();
  if (tracks.length < 1) {
    return reportFatal("No video track in returned stream.");
  }
  var videoTrack = tracks[0];
  reportSuccess("Video track exists with label = " + videoTrack.label);
  return true;
}

CamCaptureTest.setupCanvas = function() {
  var video = document.getElementById('main-video');
  var canvas = document.getElementById('main-video-canvas');
  var context = canvas.getContext("2d");

  var canvasWidth = Math.floor(canvas.clientWidth / 1);
  var canvasHeight = Math.floor(canvas.clientHeight / 1);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  function draw(video,context,width,height) {
    if(video.paused || video.ended) return false;
    context.drawImage(video,0,0,canvas.width,canvas.height);
    setTimeout(draw,20,video,context,width,height);
  }

  video.addEventListener('play', function () {
    draw(this, context, canvasWidth, canvasHeight);
  }, false);

}


CamCaptureTest.checkVideoStart = function(stream) {
  CamCaptureTest.setupCanvas();


  var videoTrack = stream.getVideoTracks()[0];
  videoTrack.onended = function() {
    reportError('Video track ended, camera stopped working');
  }
  videoTrack.onmute = function() {
    reportError('Your camera reported itself as muted.');
    // MediaStreamTrack.muted property is not wired up in Chrome yet, checking
    // isMuted local state.
    CamCaptureTest.isMuted = true;
  }
  videoTrack.onunmute = function() {
    CamCaptureTest.isMuted = false;
  }
}

CamCaptureTest.checkVideoFinish = function(videoTag) {
  assertEquals(640, videoTag.videoWidth, 'Incorrect width', 'Width OK');
  assertEquals(480, videoTag.videoHeight, 'Incorrect height', 'Height OK');
  if (CamCaptureTest.stream.getVideoTracks()[0].readyState != 'ended'){
    assertEquals(false, CamCaptureTest.isMuted, 'Your camera reported ' +
                 'itself as muted! It is probably not delivering frames. ' +
                 'Please try another webcam.', 'Camera is delivering frames');
  }

  CamCaptureTest.stream.getVideoTracks()[0].onended = null;
  // CamCaptureTest.stream.stop();
  testSuiteFinished();
}