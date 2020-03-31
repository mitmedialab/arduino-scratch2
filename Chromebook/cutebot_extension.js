/* Extension using Gizmo Robot Chrome extension to communicate with micro:bit cutebot */
/* Code originally from Lofi Robot Extension */
/* Randi Williams <randiw12@mit.edu> March 2020 to work with micro:bit cutebot */

(function(ext) {

  var CHROME_EXTENSION_ID = "jpehlabbcdkiocalmhikacglppfenoeo"; // APP ID on Chrome Web Store
  var mConnection;
  var mStatus = 1;


  var msg1 = {};

  var analog1 = 0;	
  var dist_read  = 0;

  ext.set_output = function(rval, gval, bval) {	

    var msg = {}
   
    msg.buffer = [204,rval];
    mConnection.postMessage(msg);
    
    msg.buffer = [205,gval];
    mConnection.postMessage(msg);
	
	msg.buffer = [206,bval];  
    mConnection.postMessage(msg);

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
  
  ext.servos_off = function() {
	var msg = {};
	msg.buffer = [207,99];
    mConnection.postMessage(msg);
  }
  
 ext.drive_forward = function(secs, callback) {
    var msg = {}; 
    msg.buffer = [208,secs];   
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
           ext.stop_steppers(callback);
        }, secs*1000); // RANDI - approximate how long this should take with time?
  }
  
  ext.drive_backward = function(secs, callback) {
    var msg = {}; 
    msg.buffer = [209,secs];   
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
           ext.stop_steppers(callback);
        }, secs*1000); // RANDI - approximate how long this should take with time?
  }
	
ext.stop_steppers = function(callback){
    var msg = {}; 
    msg.buffer = [207,99];   
    mConnection.postMessage(msg);
    callback();
}
	
  ext.drive_left = function(secs, callback) {
    var msg = {}; 
    msg.buffer = [210,secs];   
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
           ext.stop_steppers(callback);
        }, secs*1000); // RANDI - approximate how long this should take with time?
  }
  
  ext.drive_right = function(secs, callback) {
    var msg = {}; 
    msg.buffer = [211,secs];   
    mConnection.postMessage(msg);
    
    window.setTimeout(function() {
           ext.stop_steppers(callback);
        }, secs*1000); // RANDI - approximate how long this should take with time?
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
      msg1 = msg1.concat(buf);
    }
  
    msg.buffer = msg1;
  
    if (msg.buffer.length > 10) {
      msg.buffer = msg.buffer.slice(0,10);
    }
	  
    if (msg.buffer.length == 10) {
      if (msg.buffer[0] == 224) {
	analog1 = Math.round(msg.buffer[1] );  
      }
      if (msg.buffer[8] == 240) {
        dist_read = Math.round(msg.buffer[9] );
      }
    }

  }

  ext.read_ultrasonic = function(input) {
  
  	var distance = dist_read;
  	if (distance == 0) {
  	distance = -1;
  	}
  
  return distance;

  }
	
ext.readIR = function(input) {
  
  	var distance = analog1;
  	if (distance == 0) {
  	distance = -1;
  	}
  
  return distance;

  }
	
/* Functions for TTS and STT. Code adapted from Sayamindu Dasgupta */
var recognized_speech = '';

    function _get_voices() {
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
        var ret = [];
        console.log('Getting voices');
        console.log(speechSynthesis);
        var voices = speechSynthesis.getVoices();
        
        for(var i = 0; i < voices.length; i++ ) {
            ret.push(voices[i].name);
            console.log(voices.toString());
        }

        return ret;
    }

    ext.set_voice = function() {
    };

    ext.speak_text = function (text, callback) {
        var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function(event) {
            console.log(callback);
            if (typeof callback=="function") callback();
        };
        
        speechSynthesis.speak(u);
    };
    
    ext.recognize_speech = function (callback) {
        var recognition = new webkitSpeechRecognition();
        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                console.log(callback);
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback=="function") callback();
            }
        };
        recognition.start();
    };
    
    ext.recognized_speech = function () {return recognized_speech;};

    ext.ask = function (text,callback) {
        console.log(text);
        console.log(callback);
        ext.speak_text(text, ext.recognize_speech(callback));
        //if (typeof callback=="function") callback();
    };
	
	ext.ping_cutebot = function() {
    	var msg = {}; 
		console.log('Pinging cutebot');
    	msg.buffer = [207,99,44]; //44 is ASCII comma   
    	mConnection.postMessage(msg);
		console.log('Done pinging');
    };
	
    ext.ping_cutebot2 = function() {
    	var msg = {}; 
		console.log('Pinging cutebot');
    	msg.buffer = [207,99,',']; //44 is ASCII comma   
    	mConnection.postMessage(msg);
		console.log('Done pinging');
    };




    var descriptor = {

	url: 'https://aieducation.mit.edu/poppet.html', // update to something?

        blocks: [
	  [' ', 'test cutebot','ping_cutebot'],
	  [' ', 'test cutebot2','ping_cutebot2'],
	  //[' ', 'set led to %m.colors', 'set_rgb', 'white'],
      	  //[' ', 'turn led off', 'rgb_off', 'off'],
      	  //['w', 'drive forward %n sec(s)', 'drive_forward', 1],
          //['w', 'drive backward %n sec(s)', 'drive_backward', 1],
          //['w', 'turn right %n sec(s)', 'drive_right', 1],
          //['w', 'turn left %n sec(s)', 'drive_left', 1],
	  //[' ', 'stop motors', 'stop_steppers', 1],
          ['r', 'read distance', 'read_ultrasonic']
          //['w', 'speak %s', 'speak_text', 'Hello!'],
	  //['w', 'listen for response', 'recognize_speech'],
          //['w', 'ask %s and wait', 'ask', 'What\'s your name?'],
          //['r', 'answer', 'recognized_speech']
			
			],
        menus: {
	      colors: ['red', 'green', 'blue', 'magenta', 'yellow', 'cyan', 'white', 'random']
		}
    };


    ext._getStatus = function() {
        var statusMsg;
        if (mStatus == 0) {
          statusMsg = 'Error connecting to Gizmo Robot Chrome extension. Make sure you have added the extension and that you used the correct extension ID.'
        } else if (mStatus == 1) {
          statusMsg = 'Robot is not connected. Open the Gizmo Robot extension to connect to your robot';
        } else {
	  if (window.SpeechSynthesisUtterance === undefined || window.webkitSpeechRecognition === undefined) {
            mStatus = 1;
	    statusMsg = 'Your browser does not support text to speech. Try using Google Chrome';
          } else {
          statusMsg = 'Ready';
	  }
        }
        return {status: mStatus, msg:statusMsg};
    };
    
  ext._stop = function() {
      //ext.drive();
      ext.set_output(0,0,0);
      ext.servos_off();
  };  
    
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    status = false;
	}

  function getAppStatus() {
      chrome.runtime.sendMessage(CHROME_EXTENSION_ID, {message: "STATUS"}, function (response) {
        if (response === undefined) { //Chrome app not found
          console.log("Chrome app not found");
	  CHROME_EXTENSION_ID = window.localStorage.getItem('gizmo_extension_id');
          console.log("Chrome ID: " + CHROME_EXTENSION_ID);
	  if (CHROME_EXTENSION_ID === undefined || CHROME_EXTENSION_ID === "" || CHROME_EXTENSION_ID === null) {
	     CHROME_EXTENSION_ID = window.prompt("Enter the correct Chrome Extension ID", "pnjoidacmeigcdbikhgjolnadkdiegca");
	  }
          mStatus = 0;
          setTimeout(getAppStatus, 1000);
        }
        else if (response.status === false) { //Chrome app says not connected
          mStatus = 1;
          setTimeout(getAppStatus, 1000);
        }
        else {// successfully connected
          if (mStatus !== 2) {
            mConnection = chrome.runtime.connect(CHROME_EXTENSION_ID);	  window.localStorage.setItem('gizmo_extension_id', CHROME_EXTENSION_ID);
            mConnection.onMessage.addListener(onMsgApp);
            mStatus = 1; // not sure why this is 1 but it works
            setTimeout(getAppStatus, 1000);
          }
          console.log("Connected");
        }
      });
    };


    function onMsgApp(msg) {
	  mStatus = 2;
      var buffer = msg.buffer;
  	  console.log(buffer);
  
      if ( buffer[0]==224){
      messageParser(buffer);
      } else {
          messageParser(buffer);
      }
    };

    getAppStatus();

	ScratchExtensions.register('micro:bit Cutebot', descriptor, ext);
})({});
