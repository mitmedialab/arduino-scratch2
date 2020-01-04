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
            videoElem.src = window.URL.createObjectURL(localMediaStream);
            // need to call videoElem.play()?
            window.webcamStream = localMediaStream;
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
    
    ext.getCameraURL = function() {
      window.canvas = document.createElement('canvas');
      // Context object for working with the canvas.
      window.ctx = canvas.getContext('2d');

      // Get the exact size of the video element.
      window.width = videoElem.videoWidth; // is there a size limit on tensorflow? dalton used 32
      window.height = videoElem.videoHeight; // is there a size limit on tensorflow? dalton used 32

      // Set the canvas to the same dimensions as the video.
      canvas.width = width;
      canvas.height = height;

      // Draw a copy of the current frame from the video on the canvas.
      ctx.drawImage(videoElem, 0, 0, width, height);

      // Get an image dataURL from the canvas.
      var imageDataURL = canvas.toDataURL('image/png');
      console.log('Image URL: ' + imageDataURL);
      return imageDataURL;
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
            ['r', 'recognize camera image', 'predictImage'],
            ['r', 'get camera url', 'getCameraURL']
        ],
        menus: {}
    };
    
  startImageWebcam().then(() => {
        ScratchExtensions.register('PRG Tensorflow', descriptor, ext);;
  });
  
  
})();

