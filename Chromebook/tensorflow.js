//import * as tf from '@tensorflow/tfjs';
//import * as tmImage from '@teachablemachine/image';

(function(ext) {

  var _selectors = {};
  
  var video;
  var webcamStream;
  const URL = "https://teachablemachine.withgoogle.com/models/PU-63hTh/";
  let model, webcam, labelContainer, maxPredictions;

  
  function appendBuffer( buffer1, buffer2 ) {
    var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
    var i;
    
    for (i = 0; i < buffer1.byteLength; i++) {
      tmp[i] = buffer1[i];
    }
    for (var j = 0; j < buffer2.byteLength; j++) {
      tmp[i] = buffer2[j];
      i++;
    }
    return tmp.buffer;
}
  
      // Load the image model and setup the webcam
    ext.loadModel = async function() {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // or files from your local hard drive
        // Note: the pose library adds "tmImage" object to your window (window.tmImage)
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
    }
  
  ext.startImageWebcam = function() {
    console.log('Starting Webcam');
    if (navigator.getUserMedia) {
       navigator.getUserMedia (

          // constraints
          {
             video: true,
             audio: false
          },

          // successCallback
          function(localMediaStream) {
            console.log('Success in opening media stream: ' + localMediaStream);
            video = document.createElement('video');
            video.srcObject = localMediaStream;
            webcamStream = localMediaStream;
            console.log('webcamStream: ' + webcamStream);
          },

          // errorCallback
          function(err) {
             console.log("The following error occured: " + err);
          }
       );
    } else {
       console.log("getUserMedia not supported");
    }  
      }

  ext.stopWebcam = function() {
    console.log('Stopping media stream');
    console.log('Webcamstream: ' + webcamstream);
          webcamStream.getVideoTracks().forEach(function(track) {
            track.stop();
          });
      }



     ext.getCameraImage = function(callback) {
      console.log('in getCameraImage');
        
        
        //---------------------
        // TAKE A SNAPSHOT CODE
        //---------------------
        canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        ctx = canvas.getContext('2d');
        console.log('Canvas: ' + canvas);
    
         // Draws current image from the video element into the canvas
        console.log('video: ' + video);
        ctx.drawImage(video, 0,0, canvas.width, canvas.height);
        // turn canvas into png and save it -- HANGS FOREVER
        var img    = ctx.toDataURL("image/png");
        console.log('Img: ' + img);
        
        // get image data into var
        img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        //console.log('imgData: ' + img_data.data);
        callback(img_data);
        
      }
      
      // run the webcam image through the image model
    ext.predictImage =  async function() { 
        // predict can take in an image, video or canvas html element
        console.log("Predicting image");
        /*const prediction = await model.predict(webcam.canvas);
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction =
                prediction[i].className + ": " + prediction[i].probability.toFixed(2);
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }*/
    }





	var descriptor = {

	url: '', // update to something?

        blocks: [
      ['w', 'recognize camera image', 'predictImage'],
      ['R', 'camera image', 'getCameraImage'],
			]
        //,menus: {}
    };


	ext._getStatus = function() {
        var statusMsg;
        if (mStatus == 0) {
          statusMsg = ''
        } else if (mStatus == 1) {
          statusMsg = '';
        } else {
          statusMsg = 'Ready';
        }
        return {status: mStatus, msg:statusMsg};
    };
    
  ext._stop = function() {
  };  
    
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    status = false;
        ext.stopWebcam();
	}

  function getAppStatus() {
          mStatus = 1;
            ext.startImageWebcam();
 
    };

    getAppStatus();


	ScratchExtensions.register('PRG Tensorflow', descriptor, ext);
})({});
