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

  var LOFI_ID = "opdjdfckgbogbagnkbkpjgficbampcel"; // APP ID
  var mConnection;
  var mStatus = 0;
  var _selectors = {};

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

  // Ultrasonic sensor trigger and echo
  pinMode(6,OUTPUT);
  pinMode(8,INPUT);
  
  // Left and right servos
  pinMode(9,PWM);
  pinMode(10,PWM);

  // Red and green leds
  pinMode(11,OUTPUT);
  pinMode(12,OUTPUT);
  console.log("Pins initialized");
  }


  function valBetween(v, min, max) {
    return (Math.min(max, Math.max(min, v)));
  }


   ext.setOUTPUT = function(output, setting) {

	var msg = {}
  var value = 0;
  
  if (settting == 'on') {
    value = 0;
  } else {
    value = 100;
  }

    if (output == 'red') {
      msg.buffer = [204,value];
    } else if (output == 'green') {
      msg.buffer = [205,value];
    }
    console.log("Turning on LED");
    mConnection.postMessage(msg);

  }


  	ext.silnik = function(motor,direction,speed) {

	var msg = {};
	speed = valBetween(speed,0,100);

	if (direction == 'tył' && speed > 0) {
		speed = speed + 100;
	}
	if (direction == 'tył' && speed == 0) {
		speed = 0;
	}

  console.log('Motor: ' + motor + '\tSpeed: ' + speed);
	if (motor == 'M1') {
	 msg.buffer = [202,speed];
	}
	if (motor == 'M2') {
	 msg.buffer = [203,speed];
	}

     mConnection.postMessage(msg);


  	}



  ext.servo_off = function(pin) {
	  var msg = {};
 	 // RANDI this is what was used before msg.buffer = [212,99];
    var output;
   	if (pin == "right") {
	   	output = 208;
   	} else if (pin == "left") {
	   	output = 209;
   	}
    msg.buffer = [output,Math.round(51)];
    mConnection.postMessage(msg);
  }

  ext.servo = function(pin, dir) {
   	var msg = {};
    var deg;

   	var output;
   	if (pin == "right") {
	   	output = 208;
      if (dir == 'forward') {
        deg = 0;
      } else if (dir == 'backward') {
        deg = 100;  
      } 
   	} else if (pin == "left") {
	   	output = 209;
      if (dir == 'forward') {
        deg = 100;
      } else if (dir == 'backward') {
        deg = 0;  
      } 
   	}
    
	  msg.buffer = [output,Math.round(deg)];    
    mConnection.postMessage(msg);
  }







  function messageParser(buf) {

  var msg = {};

  if (buf[0]==224){
  msg1 = buf;
  }
  else if (buf[0] != 224) {
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

  ext.readUltrasound = function(input) {

  
    var msg = {};
    msg.buffer = [0xF0,0x08,14,0xF7];
    //240 8 14 247

  
  	var distance = dist_read;
  	if (distance == 0) {
  	distance = 1000;
  	}
  
  return distance;

  }





	var descriptor = {

	url: '', // update to something?

        blocks: [
      [' ', 'turn %m.leds light %m.led_on', 'setOUTPUT', 'red', 'on'], 
			[' ', 'turn %m.servos servo %m.servo_dir', 'servo', 'right', 'forward'], // RANDI update serwo to understand forward/backward and left/right
      [' ', 'stop %m.servos', 'servo_off', 'right'],
      ['r', 'read distance', 'readUltrasound', 'INPUT 1'],
			
			],
        menus: {

      servos: ['right','left'],
      servo_dir: ['forward','backward'],
      leds: ['red', 'green'],
      led_on: ['on','off'],
      input: ['INPUT 1','INPUT 2','INPUT 3','INPUT 4'],
      output: ['OUTPUT 1','OUTPUT 2', 'OUTPUT 3', 'OUTPUT 4'],
      stan: ['włączony', 'wyłączony']
		}
    };


	ext._getStatus = function() {
        return {status: mStatus, msg: mStatus==2?'Ready':'Not Ready'};
    };
	ext._shutdown = function() {
	    if(poller) poller = clearInterval(poller);
	    status = false;
	}
    function getAppStatus() {
        chrome.runtime.sendMessage(LOFI_ID, {message: "STATUS"}, function (response) {
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
                if (mStatus !==2) {
                    console.log("Connected");
                    mConnection = chrome.runtime.connect(LOFI_ID);
                    mConnection.onMessage.addListener(onMsgApp);

                    //pinMode_init();
                }
                mStatus = 1;
                setTimeout(getAppStatus, 1000);
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



	ScratchExtensions.register('PopPet Robot', descriptor, ext);
})({});