(function(ext) {

  var INPUT = 0x00,
    OUTPUT = 0x01,
    ANALOG = 0x02,
    PWM = 0x03,
    SERVO = 0x04,
    SHIFT = 0x05,
    I2C = 0x06,
    ONEWIRE = 0x07,
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
    REPORT_VERSION = 0xF9,
    ANALOG_MESSAGE = 0xE0,
    ANALOG_MAPPING_QUERY = 0x69,
    ANALOG_MAPPING_RESPONSE = 0x6A,
    CAPABILITY_QUERY = 0x6B,
    CAPABILITY_RESPONSE = 0x6C;
    STRING_DATA = 0x71;

    var LOW = 0, HIGH = 1;

	var poller = null;

    var LOFI_ID = "opdjdfckgbogbagnkbkpjgficbampcel"; // APP ID
    var mConnection;
    var mStatus = 0;
    var _selectors = {};

    var digitalOutputData = new Uint8Array(16);
    var analogInputData = new Uint16Array(16);

    var analogRead1, analogRead2, analogRead3, analogRead0;
	var analog0enable = false;
	var analog1enable = false;
	var analog2enable = false;
	var analog3enable = false;

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

  pinMode(2,OUTPUT);
  pinMode(4,OUTPUT);
  pinMode(3,PWM);

  pinMode(7,OUTPUT);
  pinMode(8,OUTPUT);
  pinMode(5,PWM);

  pinMode(10,PWM);
  pinMode(9,PWM);
  pinMode(6,PWM);

  pinMode(16,OUTPUT);
  console.log("Pins initialized");
  }


  function valBetween(v, min, max) {
    return (Math.min(max, Math.max(min, v)));
  }


  ext.buzzer = function(stan) {

	  var msg = {}

	  if (stan == 'włączony') {

    msg.buffer = [201,1];
     mConnection.postMessage(msg);
	  }
	  else {
		  msg.buffer = [201,0];
     mConnection.postMessage(msg);
	  }
  }






    ext.setOUTPUT = function(output, value) {

	var msg = {}
	value = valBetween(value,0,100);

     if (output == 'OUTPUT 1') {
   	msg.buffer = [204,value];
    }
       if (output == 'OUTPUT 2') {
    msg.buffer = [205,value];
    }
       if (output == 'OUTPUT 3') {
    msg.buffer = [206,value];
    }
       if (output == 'OUTPUT 4') {
    msg.buffer = [207,value];
    }

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

	if (motor == 'M1') {
	 msg.buffer = [202,speed];
	}
	if (motor == 'M2') {
	 msg.buffer = [203,speed];
	}

     mConnection.postMessage(msg);


  	}



  ext.servo_off = function() {
	  var msg = {};
	 msg.buffer = [212,99];
     mConnection.postMessage(msg);
     console.log('off');
  }

  ext.serwo = function(pin, deg) {

	  /*
	  servo_position_smooth = 0;
	  servo_smooth[0] = deg;

	  for (i = 20; i > 0; i--) {
		  servo_smooth[i] = servo_smooth[i-1];
		  //console.log(servo_smooth[i]);
	  }


	  for (i = 0; i < 20; i++) {
		  servo_position_smooth = servo_position_smooth + servo_smooth[i];
	  }

	  */



   	var msg = {};


   	var output;
   	if (pin == "OUTPUT 1") {
	   	output = 208;
	   //	console.log("111");
   	}
   	if (pin == "OUTPUT 2") {
	   	output = 209;
   	}
   	if (pin == "OUTPUT 3") {
	   	output = 210;
   	}
   	if (pin == "OUTPUT 4") {
	   	output = 211
   	}

    deg = valBetween(deg,0,100);
	  msg.buffer = [output,Math.round(deg)];

    mConnection.postMessage(msg);
   //console.log(msg);
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
	  //console.log("H");
	  //console.log(msg.buffer);
  }


  if (msg.buffer.length == 10){

		   if (msg.buffer[0] == 224) {
		   analogRead0 = Math.round(msg.buffer[1] );
  		   }
  		   if (msg.buffer[2] == 225) {
	  	   analogRead1 = Math.round(msg.buffer[3] );
  		   }
  		   if (msg.buffer[4] == 226) {
	  	   analogRead2 = Math.round(msg.buffer[5] );
  		   }
  		   if (msg.buffer[6] == 227) {
	  	   analogRead3 = Math.round(msg.buffer[7] );
  		   }
         if (msg.buffer[8] == 240) {
         dist_read = Math.round(msg.buffer[9] );
         }
	  //console.log(analogRead0);
  }

  }


    ext.readINPUTanalog = function(input) {

    var reading = 0;
    var msg = {};




    if (input == 'INPUT 1'){
    reading = analogRead0;
    }

    if (input == 'INPUT 2'){
    reading = analogRead1;
    }

    if (input == 'INPUT 3'){
    reading = analogRead2;
    }

    if (input == 'INPUT 4'){
    reading = analogRead3;
    }




    return reading;

  }


  ext.readUltrasound = function(input) {

    //var msg = new Uint8Array([0xF0,0x08,14,0xF7]);
    //device.send(msg.buffer);

    var msg = {};
    msg.buffer = [0xF0,0x08,14,0xF7];
    //240 8 14 247

    //mConnection.postMessage(msg);

  	var distance = dist_read;
  	if (distance == 0) {
  	distance = 1000;
  	}
      	//console.log(storedInputData[i]);
    //console.log(distance);

    //this.arduino.board.sp.write(new Buffer([0xF0, 0x08, pinNumber, 0xF7])

  return distance;

  }





	var descriptor = {

	url: 'http://www.lofirobot.com',

        blocks: [
			[' ', 'obracaj silnik %m.silnik w  kierunku %m.kierunek z mocą %n', 'silnik', 'M1','przód', 100],
			//[' ', '2obracaj silnik %m.silnik w  kierunku %m.kierunek z mocą %n', 'silnik2', 'M1','przód', 100],
			[' ', 'ustaw wyjście %m.output na wartość  %n%', 'setOUTPUT', 'OUTPUT 1', 100],
			//[' ', 'ustaw wyjście %m.output jako  %m.stan', 'setOUTPUTdigital', 'OUTPUT 1', 'włączony'],
			[' ', 'ustaw serwo na wyjściu %m.output na pozycję %n', 'serwo', 'OUTPUT 1', 0],
			//[' ', 'wyłącz wszystkie SERWO', 'servo_off'],
			[' ', 'ustaw BUZZER jako %m.stan', 'buzzer', 'włączony'],
			//[' ', 'ustaw BUZZER2 jako %m.stan', 'buzzer2', 'włączony'],
			['r', 'czujnik odległości', 'readUltrasound', 'INPUT 1'],
			['r', 'odczytaj wejście %m.input', 'readINPUTanalog', 'INPUT 1']

			],
        menus: {

      silnik: ['M1','M2'],
      kierunek: ['przód', 'tył'],
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



	ScratchExtensions.register('LOFI Robot Chrome v4', descriptor, ext);
})({});