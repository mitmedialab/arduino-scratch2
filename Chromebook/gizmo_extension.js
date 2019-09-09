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

  //var CHROME_EXTENSION_ID = "molfimodiodghknifkeikkldkogpapki"; // APP ID on Linux
  var CHROME_EXTENSION_ID = "bllfgkceddeiellapodgilchdcobbgjn"; // APP ID on Windows
  var mConnection;
  var mStatus = 1;
  var stopServos = true;
  var _selectors = {};

  var digitalOutputData = new Uint8Array(16);


	var msg1 = {};
	var msg2 = {};

	var analog1 = 0;
	
	var dist_read  = 0
	var last_reading = 0;


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
  
  ext.set_rgb = function(color)
  {
	if(color=='red') {
		ext.set_output(255,0,0);
	}
	else if(color=='green'){
		ext.set_output(0,255,0);
	}
	else if(color=='blue'){
		ext.set_output(0,0,255);
	}
	else if(color=='white'){
		ext.set_output(255,255,255);
	}
	else if(color=='magenta'){
		ext.set_output(255,0,255);
	}
	else if(color=='yellow'){
		ext.set_output(255,255,0);
	}
	else if(color=='cyan'){
		ext.set_output(0,255,255);
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
  
  ext.drive = function(dir, secs, callback) {
	stopServos = false;
   	if (dir == "forward") {
      ext.turn_servo("right","forward");
      ext.turn_servo("left","forward");
   	} else if (dir == "backward") {
      ext.turn_servo("right","backward");
      ext.turn_servo("left","backward");
   	} else if (dir == "left") {
      ext.turn_servo("right","forward");
      ext.turn_servo("left","backward");
   	} else if (dir == "right") {
      ext.turn_servo("right","backward");
      ext.turn_servo("left","forward");
   	}
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_forward = function(secs, callback) {
	stopServos = false;
   	ext.turn_servo("right","forward");
    ext.turn_servo("left","forward");
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_backward = function(secs, callback) {
	stopServos = false;
   	ext.turn_servo("right","backward");
    ext.turn_servo("left","backward");
   	
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_left = function(secs, callback) {
	stopServos = false;
   	ext.turn_servo("right","forward");
    ext.turn_servo("left","backward");
    
    window.setTimeout(function() {
            ext.servos_off(); callback();
        }, secs*1000);
  }
  
  ext.drive_right = function(secs, callback) {
	stopServos = false;
   	ext.turn_servo("right","backward");
    ext.turn_servo("left","forward");
   	    
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
      if (msg.buffer[0] == 224) {
	analog1 = Math.round(msg.buffer[1] );  
      }
      if (msg.buffer[8] == 240) {
        dist_read = Math.round(msg.buffer[9] );
      }
    }

  }

  ext.readUltrasonic = function(input) {

  /* RANDI
    var msg = {};
    msg.buffer = [0xF0,0x08,14,0xF7];
    //240 8 14 247 */

  
  	var distance = dist_read;
  	if (distance == 0) {
  	distance = -1;
  	}
  
  return distance;

  }
	
ext.readIR = function(input) {

  

    /*RANDI - what is this for?
        var msg = {};
	msg.buffer = [0xF0,0x08,14,0xF7]; 
    //240 8 14 247 */

  
  	var distance = analog1;
  	if (distance == 0) {
  	distance = -1;
  	}
  
  return distance;

  }





	var descriptor = {

	url: '', // update to something?

        blocks: [
	  [' ', 'set led to %m.colors', 'set_rgb', 'red'],
      	  [' ', 'turn led off', 'rgb_off', 'off'],
      	  ['w', 'drive forward %n step(s)', 'drive_forward', 1],
          ['w', 'drive backward %n step(s)', 'drive_backward', 1],
          ['w', 'turn right %n degrees', 'drive_right', 90],
          ['w', 'turn left %n degrees', 'drive_left', 90],
          ['r', 'read distance', 'readUltrasonic'],
          ['r', 'read infrared', 'readIR'],
			
			],
        menus: {

      servos: ['right','left'],
      arm_dir: ['up','down'],
      servo_dir: ['forward','backward'],
      colors: ['red', 'green', 'blue', 'magenta', 'yellow', 'cyan', 'white', 'random']
		}
    };


	ext._getStatus = function() {
        return {status: mStatus, msg: mStatus==2?'Ready':'Not Ready'};
    };
    
  ext._stop = function() {
      //ext.drive();
      ext.set_output(0,0,0);
  };  
    
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    status = false;
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
            mStatus = 1; // not sure why this is 1 but it works
            setTimeout(getAppStatus, 1000);
          }
          console.log("Connected");
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


	ScratchExtensions.register('Gizmo Robot', descriptor, ext);
})({});
