new (function() {
    var ext = this;
    var videoElem = undefined;
    var extStatus = 1;
    var extStatusMsg = '';
    /*
     * variables
     */

    async function startImageWebcam() {
      console.log("Starting webcam");
      if (navigator.getUserMedia) {
        extStatus = 2;
        navigator.getUserMedia (
          // options
          {
            video: true,
            audio: false
          },

          // success callback
          function(localMediaStream) {
            videoElem = document.createElement('video');
            videoElem.src = '';
            videoElem.srcObject = localMediaStream;
            // need to call videoElem.play()?
            console.log(videoElem);
            window.webcamStream = localMediaStream; // what is this?
          },

          // error callback
          function(err) {
            extStatus = 0;
            extStatusMsg = 'Please load the website from a secure URL: https://scratchx.org';
            console.log("Error starting webcam: " + err);
          }
       );
      } else {
        extStatus = 0;
        extStatusMsg = 'Please allow access to the webcam.';
        console.log("getUserMedia not supported");
      }  
    }
    
    ext.stopWebcam = function() {
      window.webcamStream.getVideoTracks().forEach(function(track) {
        track.stop();
      });
    }
    
    ext.getCameraURL = function(callback) {
      window.canvas = document.createElement('canvas');
      // Context object for working with the canvas.
      window.ctx = canvas.getContext('2d');

      // Get the exact size of the video element.
      window.width = 32;// videoElem.videoWidth; // is there a size limit on tensorflow? dalton used 32
      window.height = 32; // videoElem.videoHeight; // is there a size limit on tensorflow? dalton used 32

      // Set the canvas to the same dimensions as the video.
      canvas.width = 32; // width;
      canvas.height = 32; // height;

      // Draw a copy of the current frame from the video on the canvas
      console.log(videoElem);
      ctx.drawImage(videoElem, 0, 0, 32, 32); //width, height);

      // Get an image dataURL from the canvas.
      setTimeout(function() {
              var imageDataURL = canvas.toDataURL('image/png');
      console.log('Image URL: ' + imageDataURL);
      if (typeof callback=="function") callback();
      }, 2000);

      //return imageDataURL;
    
    
    };
    
    /*ext.callbackFunc = function (args callback) {
      if (typeof callback=="function") callback();
    };*/
    
    //ext.dataFunc = function () {return data;};
    
    ext._shutdown = function() {
      ext.stopWebcam();
    };

    ext._getStatus = function() {
        if (extStatus !== 2) {
            return {status: extStatus, msg: extStatusMsg};
        }
        return {status: 2, msg: 'Ready'};
    };

    var descriptor = {
        blocks: [
            ['r', 'recognize camera image', 'predictImage'], // function dne
            ['w', 'get camera url', 'getCameraURL']
        ],
        menus: {}
    };
    
  startImageWebcam().then(() => {
        ScratchExtensions.register('PRG Tensorflow', descriptor, ext);;
  });
  
  
})();

