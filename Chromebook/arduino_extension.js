(function(ext) {

  var INPUT = 0x00,
    OUTPUT = 0x01,
    ANALOG = 0x02,
    PWM = 0x03,
    SERVO = 0x04,
    SHIFT = 0x05,
    I2C = 0x06,
    onEWIRE = 0x07,
    STEPPER = 0x08,
    ENCODER = 0x09,
    IGNORE = 0x7F;

      var PIN_MODE = 0xF4,
    REPORT_DIGITAL = 0xD0,
    REPORT_ANALOG = 0xC0,
    DIGITAL_MESSAGE = 0x90,
    START_SYSEX = 0xF0,
    END_SYSEX = 0xF7,
    QUERY_FIRMWARE = 0x79,
    REPORT_VERSIon = 0xF9,
    ANALOG_MESSAGE = 0xE0,
    ANALOG_MAPPING_QUERY = 0x69,
    ANALOG_MAPPING_RESPonSE = 0x6A,
    CAPABILITY_QUERY = 0x6B,
    CAPABILITY_RESPonSE = 0x6C;
    STRING_DATA = 0x71;

    var LOW = 0, HIGH = 1;

	var poller = null;

  var CHROME_EXTENSION_ID = "opdjdfckgbogbagnkbkpjgficbampcel";//pnjoidacmeigcdbikhgjolnadkdiegca"; // APP ID
  var mConnection;
  var mStatus = 1;
  var stopServos = true;
  var redLight = false;
  var greenLight = false;
  var _selectors = {};
  
  var video;
  var webcamStream;

  var digitalOutputData = new Uint8Array(16);
  /* RANDI - not using and analog data
  //var analogInputData = new Uint16Array(16);
  //var analogRead1, analogRead2, analogRead3, analogRead0;
	var analog0enable = false;
	var analog1enable = false;
	var analog2enable = false;
	var analog3enable = false;
  */
	var pinmode = new Uint8Array(16);

	pinmode[2] = 0;
	pinmode[3] = 1;
	pinmode[4] = 0;
	pinmode[5] = 1;
	pinmode[6] = 1;
	pinmode[7] = 0;
	pinmode[8] = 0;
	pinmode[9] = 1;
	pinmode[10] = 1;
	pinmode[11] = 1;
	pinmode[12] = 1;
	pinmode[13] = 1;
	pinmode[14] = 1;
	pinmode[15] = 1;
	pinmode[16] = 1;


	var msg1 = {};
	var msg2 = {};

	var servo_smooth = [];
	var servo_position_smooth;

	var dist_read  = 0;
	var last_reading = 0;

  function pinMode(pin, mode) {
  var msg = {};
    msg.buffer = [PIN_MODE, pin, mode];
    mConnection.postMessage(msg);
    //addPackage(arrayBufferFromArray(msg.buffer), function(){});
  }

  function pinMode_init() {

  /* Ultrasonic sensor trigger and echo
  pinMode(6,OUTPUT);
  pinMode(8,INPUT);
  
  // Left and right servos
  pinMode(9,PWM);
  //pinMode(10,PWM);

  // RGB led
  pinMode(8,OUTPUT);
  pinMode(9,OUTPUT);
  pinMode(10,OUTPUT);*/
  console.log("Pins initialized");
  }


  function valBetween(v, min, max) {
    return (Math.min(max, Math.max(min, v)));
  }


   ext.set_output = function(rval, gval, bval) {	

    var msg = {}
   
    msg.buffer = [204,rval];
    mConnection.postMessage(msg);
    //mConnection.postMessage(msg);
    
    msg.buffer = [205,gval];
    mConnection.postMessage(msg);
    //mConnection.postMessage(msg);
	
	msg.buffer = [206,bval];  
    mConnection.postMessage(msg);
    //mConnection.postMessage(msg);

  }
  
  ext.rgb_off = function() {
  	ext.set_rgb('off');
  }
  
  ext.set_rgb = function(color) {
	if(color=='red') { // 255 seems too bright
		ext.set_output(200,0,0);
	}
	else if(color=='green'){
		ext.set_output(0,200,0);
	}
	else if(color=='blue'){
		ext.set_output(0,0,200);
	}
	else if(color=='white'){
		ext.set_output(20,200,200);
	}
	else if(color=='magenta'){
		ext.set_output(200,0,200);
	}
	else if(color=='yellow'){
		ext.set_output(200,200,0);
	}
	else if(color=='cyan'){
		ext.set_output(0,200,200);
	}
	else if(color=='off'){
		ext.set_output(0,0,0);
	} else if (color=='random') {
		var r = Math.floor(Math.random()*255);
		var g = Math.floor(Math.random()*255);
		var b = Math.floor(Math.random()*255);
		ext.set_output(r, g, b);
	}
  }
  
  ext.servos_off = function() {
	var msg = {};
  	stopServos = true;
	msg.buffer = [207,99];
    mConnection.postMessage(msg);
  }
  
  ext.drive_forward = function(secs, callback) {
	var msg = {}; 
	stopServos = false;
	msg.buffer = [208,99];   
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_backward = function(secs, callback) {
	var msg = {};
	  stopServos = false;
	  	msg.buffer = [209,99];
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_left = function(secs, callback) {
	var msg = {};
	stopServos = false;
	msg.buffer = [210,99];
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_right = function(secs, callback) {
	var msg = {};
	msg.buffer = [211,99];
    mConnection.postMessage(msg);
   	    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
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


  function messageParser(buf) {

    var msg = {};
  
    if (buf[0]==224){
      msg1 = buf;
    } else if (buf[0] != 224) {
      msg2 = buf;
    }
  
    msg.buffer = msg1.concat(msg2);
  
    if (msg.buffer.length > 10) {
      msg.buffer = msg.buffer.slice(0,10);
    }
  
  
    if (msg.buffer.length == 10){
      if (msg.buffer[8] == 240) {
        dist_read = Math.round(msg.buffer[9] );
      }
    }

  }

  ext.readUltrasonic = function(input) {
  
  	var distance = dist_read;
  	if (distance == 0) {
  	distance = 1000;
  	}
  
  return distance;

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
        // turn canvas into png and save it
        var img    = ctx.toDataURL("image/png");
        console.log('Img: ' + img);
        
        // get image data into var
        img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        //console.log('imgData: ' + img_data.data);
        callback(img_data);
        
      }





	var descriptor = {

	url: '', // update to something?

        blocks: [
	  [' ', 'set light to %m.colors', 'set_rgb', 'white'],
 	  [' ', 'turn light off', 'rgb_off'],
      ['w', 'drive forward %n steps', 'drive_forward', 1],
      ['w', 'drive backward %n steps', 'drive_backward', 1],
      ['w', 'turn right %n degrees', 'drive_right', 1],
      ['w', 'turn left %n degrees', 'drive_left', 1],
      ['r', 'read ultrasonic sensor', 'readUltrasonic'],
      ['b', 'read infrared sensor', 'readIR'],
      ['R', 'camera image', 'getCameraImage'],
			],
        menus: {

      servos: ['right','left'],
      colors: ['red', 'green', 'blue', 'magenta', 'yellow', 'cyan', 'white', 'random']
		}
    };


	ext._getStatus = function() {
        var statusMsg;
        if (mStatus == 0) {
          statusMsg = 'Error connecting to LOFI Robot Chrome app, Make sure you have added the extension and that you are on scratchx.org'
        } else if (mStatus == 1) {
          statusMsg = 'Robot is not connected. Open the LOFI Robot extension to connect to your robot';
        } else {
          statusMsg = 'Ready';
        }
        return {status: mStatus, msg:statusMsg};
    };
    
  ext._stop = function() {
      ext.servos_off();
	ext.set_output(0,0,0);
  };  
    
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    status = false;
        ext.stopWebcam();
	}

  function getAppStatus() {
      chrome.runtime.sendMessage(CHROME_EXTENSION_ID, {message: "STATUS"}, function (response) {
        if (response === undefined) { //Chrome app not found
          console.log("Chrome app not found");
          mStatus = 0;
          setTimeout(getAppStatus, 1000);
        }
        else if (response.status === false) { //Chrome app says not connected
          mStatus = 1;
          setTimeout(getAppStatus, 1000);
        }
        else {// successfully connected
          if (mStatus !== 2) {
            mConnection = chrome.runtime.connect(CHROME_EXTENSION_ID);
            mConnection.onMessage.addListener(onMsgApp);
            //mStatus = 1;
            setTimeout(getAppStatus, 1000);
          } else {
            console.log("Connected");
            ext.startImageWebcam();
          }
         // if (stopServos) {
          //	ext.servos_off();
          //}
        }
      });
    };


    function onMsgApp(msg) {
	    mStatus = 2;
      var buffer = msg.buffer;
      //console.log(buffer);
  
  
      if ( buffer[0]==224){
      messageParser(buffer);
      last_reading = 0;
      }
  
  
      if (buffer[0] != 224 && last_reading == 0){
          messageParser(buffer);
          last_reading = 1;
      }
    };

    getAppStatus();


	ScratchExtensions.register('PRG Arduino Robot', descriptor, ext);
})({});
