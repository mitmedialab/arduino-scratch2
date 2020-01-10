/* Extension using Affectiva API to recognize the emotion on faces */
/* Randi Williams <randiw12@mit.edu> January 2020 */
(function() {
  // extension variables
  var ext = this;
  var extStatus = 1;
  var affdexStatus = 0;
  var webcamStatus = 0;
  var extStatusMsg = '';
  // affdex variables    
  var detector, canvasDiv;
  var numFaces = 0;
  var faceAge = 'unknown';
  var faceGender = 'unknown';
  var faceGlasses = false;
  var faceEmotion = 'unknown';
  var faceEmotionConfidence = 0;
  var faceEmotions =
    {'joy':0,'sadness':0,'anger':0,'disgust':0,'fear':0,'contempt':0,'surprise':0, 'valence':0, 'engagement':0};
  
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
    // Get the exact size of the video element.
    window.width = 320;
    window.height = 240;
    
    
    canvasDiv = document.createElement('div');
    // Set the canvas to the same dimensions as the video.
    canvas.width = width;
    canvas.height = height;
    
    // start affdex
    var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
    detector = new affdex.CameraDetector(canvasDiv, width, height, faceMode); //Construct a PhotoDetector and specify the image width / height and face detector mode.
    
    //Enable detection of Expressions, Emotions and Emojis classifiers. https://developer.affectiva.com/metrics/
    detector.detectAllEmotions();
    detector.detectAppearance.age = true;
    detector.detectAppearance.gender = true;
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
        faceGlasses = (faces[0].appearance.glasses === "Yes");
        
        faceEmotion = 'unknown';
        faceEmotionConfidence = 0;
        console.log("Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
          faceEmotions[key] = val;
          // Find the greatest emotion
          if (val > faceEmotionConfidence && key !== "valence" && key !== "engagement") {
            faceEmotionConfidence = val;
            faceEmotion = key;
          }
          return val.toFixed ? Number(val.toFixed(0)) : val;
        }));
        
      }
    });
    //Add a callback to notify if failed receive the results from processing an image.
    detector.addEventListener("onImageResultsFailure", function(image, timestamp, error) {
      console.log('Failed to process image err=' + error);
    });
    //Add a callback to notify when camera access is denied
      detector.addEventListener("onWebcamConnectSuccess", function() {
        webcamStatus = 2;
        console.log("Connected to the webcam");
      //Initialize the emotion detector
      if (detector && !detector.isRunning) {
        detector.start();
        affdexStatus = 1;
        extStatusMsg = 'Waiting for Affdex detector to load';
        console.log("Starting the detector .. please wait");
        }
      });
      //Add a callback to notify when camera access is denied
      detector.addEventListener("onWebcamConnectFailure", function() {
        webcamStatus = 0;
        extStatusMsg = 'Please allow access to the webcam and refresh the page';
        console.log("Webcam connect failure");
      });

      //Add a callback to notify when detector is stopped
      detector.addEventListener("onStopSuccess", function() {
        affdexStatus = 1;
        extStatusMsg = 'Detector has stopped.';
      });
  }
 
  ext.getNumFaces = function() {
    return numFaces;
  };
  ext.getGreatestEmotion = function() {
    return faceEmotion;
  };
  ext.getEmotionConfidence = function() {
    return faceEmotionConfidence;
  };  
  ext.recognizeAppearance = function(feature) {
    if (feature === 'age') {
      return faceAge;
    } else if (feature === 'gender') {
      return faceGender;
    }
  };
  ext.hasGlasses = function() {
    return faceGlasses;
  };
  ext.whenEmotion = function(feature, val) {
    return (faceEmotions[feature] > val);
  };
  ext.whenFace = function() {
    return (numFaces > 0);
  };

  /*ext.callbackFunc = function (args callback) {
    if (typeof callback=="function") callback();
  };*/
  //ext.dataFunc = function () {return data;};
  ext._shutdown = function() {
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
      ['r', 'number of faces', 'getNumFaces'],
      ['r', 'recognize %m.appearance', 'recognizeAppearance', 'age'],
      ['b', 'has glasses', 'hasGlasses'],
      ['r', 'recognize emotion (label)', 'getGreatestEmotion'],
      ['r', 'recognize emotion (confidence)', 'getEmotionConfidence'],
      ['h', 'when %m.emotionCharacteristics > %n', 'whenEmotion', 'engagement', 50],
      ['h', 'when %m.emotion > %n', 'whenEmotion', 'joy', 50],
      ['h', 'when face found', 'whenFace']
      //[' ', 'turn %m.onOff face tracker', 'enableFaceTracker', 'on']
    ],
    menus: {
      appearance: ['age','gender'],
    	emotion: ['joy','sadness','anger','disgust','fear','contempt','surprise'],
      emotionCharacteristics: ['engagement', 'valence'],
    	onOff: ['on', 'off']
    }
  };
  
  loadAffdexJS().then(() => {
    ScratchExtensions.register('PRG Affectiva', descriptor, ext);
  });
  
})();
