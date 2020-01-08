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
  
  async function loadAffdexJS() {
    if (typeof affdex !== 'undefined') {
      console.log('Affdex library is already loaded');
    } else {
      $.getScript('https://download.affectiva.com/js/3.2/affdex.js') // should save this in github?
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
      console.log("The detector reports initialized");
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

  ext.recognizeFace = function(callback) {
    ext.updateWebcam();
    
    // Pass the image to the detector to track emotions
    if (detector && detector.isRunning) {
      detector.process(ctx.getImageData(0, 0, width, height), 0);
    }
    callback();
  };
  
  ext.getNumFaces = function() {
    return numFaces;
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
      if (webcamStats <= affdexStatus) { 
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
      ['w', 'recognize face emotion from camera', 'recognizeFace'],
      ['r', 'number of faces', 'getNumFaces']
    ],
    menus: {}
  };
  
  loadAffdexJS().then(() => {
    ScratchExtensions.register('PRG Affectiva', descriptor, ext);
  });
  
})();