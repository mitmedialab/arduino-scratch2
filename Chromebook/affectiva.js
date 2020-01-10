/* Extension using Affectiva API to recognize the emotion on faces */
/* Randi Williams <randiw12@mit.edu> January 2020 */
(function() {
  // extension variables
  var ext = this;
  var extStatus = 1;
  var affdexStatus = 0;
  var webcamStatus = 0;
  var extStatusMsg = '';
  // camera variables
  var ctx, canvas, videoElem;
  // affdex variables    
  var detector;
  var numFaces = 0;
  var faceAge = 'unknown';
  var faceEmotion = 'unknown';
  var faceGender = 'unknown';
  var faceEngagement = 0;
  var lastUpdateTime = 0;
  
  async function loadAffdexJS() {
    if (typeof affdex !== 'undefined') {
      console.log('Affdex library is already loaded');
    } else {
      $.getScript('https://mitmedialab.github.io/arduino-scratch2/Chromebook/affdex.js') // should save this in github?
        .done(function(script, textStatus) {
          console.log('Loaded AffdexJS');
          startExtension(); // intialize Affdex?
        }).fail(function(jqxhr, settings, exception) {
          console.log('Error loading AffdexJS');
          affdexStatus = 0;
          extStatusMsg = 'Could not load Affdex library';
          loadAffdexJS(); // try again?
        });
    }
  }

  function startExtension() {
    // start affdex
    var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
    detector = new affdex.PhotoDetector(faceMode); //Construct a PhotoDetector and specify the image width / height and face detector mode.
    //Enable detection of Expressions, Emotions and Emojis classifiers. https://developer.affectiva.com/metrics/
    detector.detectAllEmotions();
    detector.detectAppearance.age = true;
    detector.detectAppearance.gender = true;
    detector.detectAppearance.ethnicity = true;
    detector.detectAppearance.glasses = true;
    //Add a callback to notify when the detector is initialized and ready for runing.
    detector.addEventListener("onInitializeSuccess", function() {
      console.log("Affdex detector initialized");
      affdexStatus = 2;
    });
    //Add a callback to receive the results from processing an image.
    //The faces object contains the list of the faces detected in an image.
    //Faces object contains probabilities for all the different expressions, emotions and appearance metrics
    detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
      console.log('#results', "Number of faces found: " + faces.length); // save in a variable?
      numFaces = faces.length;
      // how should we handle multiple faces?
      if (faces.length > 0) {
        console.log("Appearance: " + JSON.stringify(faces[0].appearance));
        faceAge = faces[0].appearance.age;
        faceGender = faces[0].appearance.gender;
        console.log("Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
          return val.toFixed ? Number(val.toFixed(0)) : val;
        }));
      }
    });
    //Add a callback to notify if failed receive the results from processing an image.
    detector.addEventListener("onImageResultsFailure", function(image, timestamp, error) {
      console.log('Failed to process image err=' + error);
    });
    //Initialize the emotion detector
    console.log("Starting the detector .. please wait");
    detector.start();
    affdexStatus = 1;
    extStatusMsg = 'Waiting for Affdex detector to load';
    // start webcam
    startImageWebcam();
  }
  
    function startImageWebcam() { // should be async?
    console.log("Starting webcam");
    if (navigator.getUserMedia) {
      webcamStatus = 2;
      navigator.getUserMedia(
        // options
        {
          video: true
        },
        // success callback
        function(localMediaStream) {
          // Setup the video element that will contain the webcam stream      
          videoElem = document.createElement('video');
          try {
            videoElem.srcObject = localMediaStream;
          } catch (e) {
            videoElem.src = window.URL.createURLObject(localMediaStream);
          }
          videoElem.play();
          window.webcamStream = localMediaStream; // what is this?
        },
        // error callback
        function(err) {
          webcamStatus = 0;
          extStatusMsg = 'Please load the website from a secure URL: https://scratchx.org';
          console.log("Error starting webcam: " + err);
        });
    } else {
      webcamStatus = 0;
      extStatusMsg = 'Please allow access to the webcam and refresh the page';
      console.log("getUserMedia not supported");
    }
  }
  
  function currentTimeSec() {
    return new Date().getTime() / 1000;
  }

  ext.recognizeFace = function(callback, returnVar) {
    ext.updateWebcam();
    
    // Pass the image to the detector to track emotions
    if (detector && detector.isRunning) {
      detector.process(ctx.getImageData(0, 0, width, height), 0);
    }
    callback(returnVar);
  };
  
  ext.recognizeEmotion = function(callback) {
    if (currentTimeSec() - lastUpdateTime > 1) { recognizeFace(callback, faceEmotion); }
    else { callback(faceEmotion); }
  };
  
  ext.recognizeAge = function(callback) {
    if (currentTimeSec() - lastUpdateTime > 1) { recognizeFace(callback, faceAge); }
    else { callback(faceAge); }
  };
  
  ext.recognizeGender = function(callback) {
    if (currentTimeSec() - lastUpdateTime > 1) { recognizeFace(callback, faceGender); }
    else { callback(faceGender); }
  };
  
  ext.recognizeEngagement = function(callback) {
    if (currentTimeSec() - lastUpdateTime > 1) { recognizeFace(callback, faceEngagement); }
    else { callback(faceEngagement); }
  };
  
  ext.getNumFaces = function(callback) {
    if (currentTimeSec() - lastUpdateTime > 1) { recognizeFace(callback, numFaces); }
    else { callback(numFaces); }
  };
  
  ext.stopWebcam = function() {
    window.webcamStream.getVideoTracks().forEach(function(track) {
      track.stop();
    });
  };
  
  ext.updateWebcam = function() {
    // Setup the canvas object that will hold an image snapshot            
    canvas = document.createElement('canvas');
    // Get the exact size of the video element.
    window.width = 320; // videoElem.videoWidth; going to try to scale the image down 
    window.height = 240; // videoElem.videoHeight; 
    // Set the canvas to the same dimensions as the video.
    canvas.width = width;
    canvas.height = height;
    // Setup the context object for working with the canvas
    ctx = canvas.getContext('2d');
    // Draw a copy of the current frame from the video on the canvas
    ctx.drawImage(videoElem, 0, 0, width, height);
  };

  /*ext.callbackFunc = function (args callback) {
    if (typeof callback=="function") callback();
  };*/
  //ext.dataFunc = function () {return data;};
  ext._shutdown = function() {
    ext.stopWebcam();
    detector.stop();
  };
  
  ext._getStatus = function() {
    if (webcamStatus !== 2 || affdexStatus !== 2) {
      if (webcamStatus <= affdexStatus) { 
        return {
          status: webcamStatus,
          msg: extStatusMsg
        };
      } else {
        return {
          status: affdexStatus,
          msg: extStatusMsg
        };  
      }
    }
    return {
      status: 2,
      msg: 'Ready'
    };
  };
  
  var descriptor = {
    blocks: [
      ['R', 'detect emotion (label)', 'emotionLabel'],
      ['R', 'detect emotion (confidence)', 'emotionConfidence'],
      ['R', 'detect %m.appearance', 'recognizeAppearance', 'age'],
      ['R', 'detect face engagement', 'recognizeEngagement'],
      ['R', 'number of faces', 'getNumFaces'],
      ['B', 'has glasses', 'recognizeGlasses']
      //['h', 'when %m.emotion > %n', 'whenEmotion', 'joy', '50'],
      //[' ', 'turn %m.onOff face tracker', 'enableFaceTracker', 'on']
    ],
    menus: {
        appearance: ['age','gender'],
    	emotion: ['joy','sadness','anger','disgust','fear','contempt','surprise'],
    	onOff: ['on', 'off']
    }
  };
  
  loadAffdexJS().then(() => {
    ScratchExtensions.register('PRG Affectiva', descriptor, ext);
  });
  
})();
