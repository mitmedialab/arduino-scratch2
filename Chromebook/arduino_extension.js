/*
 *This program is free software: you can redistribute it and/or modify
 *it under the terms of the GNU General Public License as published by
 *the Free Software Foundation, either version 3 of the License, or
 *(at your option) any later version.
 *
 *This program is distributed in the hope that it will be useful,
 *but WITHOUT ANY WARRANTY; without even the implied warranty of
 *MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *GNU General Public License for more details.
 *
 *You should have received a copy of the GNU General Public License
 *along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function (ext) {

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
        SERIAL = 0x0A,
        PULLUP = 0x0B,
        IGNORE = 0x7F,
        TOTAL_PIN_MODES = 13;

  var LOW = 0,
        HIGH = 1;

  var MAX_DATA_BYTES = 4096;
  var MAX_PINS = 128;

  var parsingSysex = false,
    waitForData = 0,
    executeMultiByteCommand = 0,
    multiByteChannel = 0,
    sysexBytesRead = 0,
    storedInputData = new Uint8Array(MAX_DATA_BYTES);

  var digitalOutputData = new Uint8Array(16),
    digitalInputData = new Uint8Array(16),
    analogInputData = new Uint16Array(16);

  var analogChannel = new Uint8Array(MAX_PINS);
  var pinModes = [];
  for (var i = 0; i < TOTAL_PIN_MODES; i++) pinModes[i] = [];

  var majorVersion = 0,
    minorVersion = 0;

  var connected = false;
  var notifyConnection = false;
  var device = null;
  var inputData = null;

  // TEMPORARY WORKAROUND
  // Since _deviceRemoved is not used with Serial devices
  // ping device regularly to check connection
  var pinging = false;
  var pingCount = 0;
  var pinger = null;

  var leftservo = 5,
    rightservo = 6,
    redpin = 9,
    greenpin = 10,
    bluepin = 11;

  var lightson = true,
    carmoving = false;

  var rgb = [0, 0, 0];
  var colorMap = {'white':[0,0,0], 'red':[0,255,255], 'orange':[0,95,255], 'yellow':[15,70,255], 'green':[255,0,255], 'blue':[255,255,0], 'purple':[60,255,60], 'pink':[60,255,90]};

/************* FROM SNAP ****************/
/* s4/arduino.js */
// utility functions
unique = function (anArray) {
    return anArray.filter(function (elem, pos) { 
        return anArray.indexOf(elem) == pos; 
    });
};

// Arduino prototype
function Arduino (owner) {
    this.owner = owner;
    this.board = undefined;	// Reference to arduino board - to be created by new firmata.Board()
    this.connecting = false;	// Flag to avoid multiple attempts to connect
    this.disconnecting = false;  // Flag to avoid serialport communication when it is being closed
    this.justConnected = false;	// Flag to avoid double attempts
    this.keepAliveIntervalID = null;
};

// This function just asks for the version and checks if we've received it after a timeout
Arduino.prototype.keepAlive = function () {
    if (Arduino.keepAlive) {
        if (this.board.version.major !== undefined) {
            // Everything looks fine, let's try again
            this.board.version = {};
            try {
                this.board.reportVersion(nop);
            } catch (err) {
                this.disconnect();
            }
        } else {
            // Connection dropped! Let's disconnect!
            this.disconnect(); 
        }
    }
};

Arduino.prototype.disconnect = function (silent, force) {
    // Prevent disconnection attempts before board is actually connected
    if ((this.board && this.isBoardReady()) || force) {
        this.disconnecting = true;
        if (this.port === 'network') {
            this.board.sp.destroy();
        } else {
            if (this.board.sp && !this.board.sp.disconnected) {
                if (!this.connecting || force) {
                    // otherwise something went wrong in the middle of a connection attempt
                    this.board.sp.close();
                } 
            }
        }
        this.closeHandler(silent);
    } else {
        if (!silent) {
            console.log('Board is not connected');
        }
    } 
};

Arduino.prototype.closeHandler = function (silent) {

    var portName = 'unknown';

    clearInterval(this.keepAliveIntervalID);

    if (this.board) {
        portName = this.board.sp.path;

        this.board.sp.removeAllListeners();
        this.board.sp = undefined;

        this.board = undefined;
    };

    Arduino.unlockPort(this.port);
    this.connecting = false;
    this.disconnecting = false;
    this.justConnected = false;

    if (this.gotUnplugged & !silent) {
		console.log('Board was disconnected from port' + portName 
                + 'It seems that someone pulled the cable!');
        this.gotUnplugged = false;
    } else if (!silent) {
        console.log('Board was disconnected from port' + portName);
    }
};

Arduino.prototype.disconnectHandler = function () {
    // This fires up when the cable is unplugged
    this.gotUnplugged = true;
};

Arduino.prototype.errorHandler = function (err) {
    console.log('An error was detected on the board '
            + err);
            this.disconnect(true);
};

Arduino.prototype.networkDialog = function () {
    var myself = this;
    new DialogBoxMorph(
            this, // target
            function (hostName) { myself.connect(hostName, false, 'network'); }, // action
            this // environment
            ).prompt(
                'Enter hostname or ip address:', // title
                this.hostname, // default
                );
};

Arduino.prototype.verifyPort = function (port, okCallback, failCallback) {
    // The only way to know if this is a proper serial port is to attempt a connection
    try {
        chrome.serial.connect(
                port, 
                { bitrate: 57600 },
                function (info) { 
                    if (info) { 
                        chrome.serial.disconnect(info.connectionId, okCallback);
                    } else {
                        failCallback('Port ' + port + ' does not seem to exist');
                    }
                });
    } catch(err) {
        failCallback(err);
    }
};

Arduino.prototype.isBoardReady = function () {
    return ((this.board !== undefined) 
            && (this.board.pins.length > 0) 
            && (!this.disconnecting));
};

Arduino.prototype.pinsSettableToMode = function (aMode) {
    // Retrieve a list of pins that support a particular mode
    var myself = this,
        pinNumbers = {};

    this.board.pins.forEach(
        function (each) { 
            if (each.supportedModes.indexOf(aMode) > -1) { 
                var number = myself.board.pins.indexOf(each).toString(); 
                pinNumbers[number] = number;
            }
        }
    );

    return pinNumbers;
};


// Class attributes and methods

try {
    Arduino.firmata = require('firmata');
} catch (err) {
    console.log('Could not require "firmata", hopefully you are overriding this somewhere');
}

Arduino.portList = [];
Arduino.usedPorts = [];

/**
 * Locks the given port to prevent its use in other connections (until it is unlocked)
 */

Arduino.lockPort = function (port) {
    var usedPorts = this.usedPorts;

    if (usedPorts.indexOf(port) === -1) {
        usedPorts.push(port);
    }
};

/**
 * Unlocks a previously Locked port to permit its use in new connections
 * Should be called when closing connections
 */
Arduino.unlockPort = function (port) {
    var usedPorts = this.usedPorts;

    if (usedPorts.indexOf(port) > -1) {
        usedPorts.splice(usedPorts.indexOf(port));
    }
};

/**
 * Informs whether the port is locked or unlocked
 */
Arduino.isPortLocked = function (port) {
    return (this.usedPorts.indexOf(port) > -1);
};

/**
 * Gets a list of available serial ports (paths) and return it through callback function
 */

Arduino.getSerialPorts = function (callback) {
    var myself = this,
        portList = [],
        portcheck = /usb|DevB|rfcomm|acm|^com|ttyS/i; // Not sure about rfcomm! We must dig further how bluetooth works in Gnu/Linux

    console.log('Calling getDevices now');
    chrome.serial.getDevices(function (devices) {
        if (devices) { 
        console.log('We got devices yall!');
            devices.forEach(function (device) { 
                if (!myself.isPortLocked(device.path) && portcheck.test(device.path)) {
                	console.log('Got device');
                    portList[device.path] = device.path; 
                } else {
                  console.log('Couldn\'t check this port: ' + device.path);
                }
            });
        }
        callback(portList);
    });
    
};

/* Transpilation from Snap! to Arduino C sketches
 * ==============================================
 *
 * Currently supporting:
 * - Almost all operators
 * - Most control structures
 * - Synchronous broadcasts
 * - All Arduino blocks
 * - Local variables
 *
 * Probably supported in the future:
 * - Async broadcasts
 * - Custom blocks
 * - Simple, homogeneous, fixed-size lists
 *
 * Never going to be supported:
 * - Lists of lists
 * - Heterogeneous lists
 * - Growable lists
 * - Lambda
 * - Sprites, Stage, Sounds, etc.
 * - Multiple boards
 * 
 */

Arduino.transpile = function (body, hatBlocks) {
    var header = '',
        setupHeader = '',
        broadcasts = '',
        assignments = '';

    // First of all, let's deal with possible broadcasts
    if (body.indexOf('!call!') > 0) {
        // Message names are now function names, not strings
        body = body.replace(/!call!"(.*)"/g, '$1');
        broadcasts = this.processBroadcasts(hatBlocks, body);
    }

    header +=
      '/* ============================================\n'
    + ' *              General Config                 \n'
    + ' * ============================================\n'
    + ' */\n'
    + '#include "Boards.h"\n'
    + '#include <Servo.h>\n'
    + 'Servo servos[MAX_SERVOS];\n'
    + 'byte servoPinMap[TOTAL_PINS];\n'
    + 'byte detachedServos[MAX_SERVOS];\n'
    + 'byte detachedServoCount = 0;\n'
    + 'byte servoCount = 0;\n\n';

    varLines = body.match(/int .* = 0;\n/g) || [];
    body = body.replace(/int .* = 0;\n/g, '');
    varLines.forEach(function (each) {
        assignments += each + '\n';
    });

    body = assignments + '\n' + body;

    // adding setupHeader right after "void setup() {"
    setupHeader += '\n  for (byte i = 0; i < TOTAL_PINS; i++) { servoPinMap[i] = 255; } // Auto-generated by Snap4Arduino. Do not remove.\n';
    body = body.replace('void setup() {', '$&' + setupHeader);

    body = body.replace(/, clockwise\)/g, ', 1200)');
    body = body.replace(/, stopped\)/g, ', 1500)');
    body = body.replace(/, counter-clockwise\)/g, ', 1800)');
    body = body.replace(/, disconnected\)/g, ', -1)');

    // If there's no loop function, we need to add an empty one
    if (body.indexOf('void loop()') < 0) {
        body += '\n}\n\nvoid loop() {}\n';
    }

    return this.headerMessage + header + this.S4Afunctions + body + broadcasts;
};

Arduino.headerMessage =
      '/* ============================================\n'
    + ' *        AUTO-Generated by Snap4Arduino       \n'
    + ' * ============================================\n'
    + ' *\n'
    + ' * Please review this sketch before pushing it.\n'
    + ' *\n'
    + ' * This is an experimental feature, and there  \n'
    + ' * are _several_ Snap!-related functionalities \n'
    + ' * that are, by definition, untranslatable to  \n'
    + ' * static, compiled languages.                 \n'
    + ' *\n'
    + ' * There is NO WARRANTY whatsoever that this   \n'
    + ' * sketch is going to work exactly in the same \n'
    + ' * way as the original Snap4Arduino script.    \n'
    + ' */\n\n';

Arduino.processBroadcasts = function (hatBlocks) {
    var myself = this,
        fullCode = '\n\n';
    
    hatBlocks.forEach(function (each) {
        fullCode += myself.processBroadcast(each);
    });

    return fullCode;
};

Arduino.processBroadcast = function (hatBlock, body) {
    var code = hatBlock.mappedCode().replace(/void "(.*)"\(\) {/g, 'void $1() {') + '\n}\n\n';
    return code;
};


/* arduino.js */
Arduino.prototype.attemptConnection = function () {
    var myself = this;

    if (!this.connecting) {
        if (this.board === undefined) {
            // Get list of ports (Arduino compatible)
            var ports = Arduino.getSerialPorts(function (ports) {
            	// RANDI just connect to the first one...these are empty 2/22/19
              console.log(myself);
            	console.log('Callback to connect: ' + Object.keys(ports));
            	console.log('Callback to connect: ' + ports);
                myself.connect(Object.keys(ports)[0]);
            });
        } else {
        console.log('Already a board connected to this sprite');
        }
    }

    if (this.justConnected) {
        this.justConnected = undefined;
        return;
    }
};

window.onunload = function (evt) {
    ide.sprites.asArray().forEach(function (each) { each.arduino.disconnect(true); });
};

Arduino.prototype.connect = function (port) {
    var myself = this;

    this.disconnect(true);

    console.log('Connecting board at port:' + port);
    this.connecting = true;

    // Hyper convoluted due to the async nature of Firmata
    // Brace yourselves, you're about to dive into the Amazing Callback Vortex
    new Arduino.firmata.Board(port, function (boardId) { 
        var board,
        retries = 0,
        boardReadyInterval = setInterval(
                function () {
                    postal.sendCommand('getBoard', [ boardId ], function (board) {
                        myself.board = board;
                        if (board && board.versionReceived) {
                            clearInterval(boardReadyInterval);
                            // We need to populate the board with functions that make use of the browser plugin
                            myself.populateBoard(myself.board);

                            myself.keepAliveIntervalID = setInterval(function() { myself.keepAlive() }, 5000);

                            Arduino.lockPort(port);
                            myself.port = myself.board.sp.path;
                            myself.connecting = false;
                            myself.justConnected = true;
                            myself.board.connected = true;
							console.log('Connected!');
                        }
                    });

                    if (retries > 40) {
                        clearInterval(boardReadyInterval);
                        myself.board = null;
                        console.log('Could not talk to Arduino in port'
                         + port + 'Check if firmata is loaded.');
                     }

                    retries ++;
                },
        250);
    });
};

Arduino.prototype.populateBoard = function (board) {
    board.events = {};

    board.sp.close = postal.commandSender('closeSerial', board.id);
    board.sp.removeListener = nop;
    board.sp.removeAllListeners = nop;

    board.sp.write = function (contents) { postal.sendCommand('serialWrite', [ board.id, contents ]); };

    board.transport = board.sp;

    // pin is already converted to absolute position, we don't care whether it's analog or not
    board.pinMode = function (pin, mode) { postal.sendCommand('pinMode', [ board.id, pin, mode ], function() { board.pins[pin].mode = mode; }); };
    board.digitalWrite = function (pin, value) { postal.sendCommand('digitalWrite', [ board.id, pin, value ]); };
    board.servoWrite = function (pin, value) { postal.sendCommand('servoWrite', [ board.id, pin, value ]); };
    board.servoConfig = function (pin, value1, value2) { postal.sendCommand('servoConfig', [ board.id, pin, value1, value2 ]); };
    board.analogWrite = function (pin, value) { postal.sendCommand('analogWrite', [ board.id, pin, value ]); };
    board.once = function (name, callback) { postal.sendCommand('once', [ board.id, name ], function (response) { board[name] = response; }); };
    board.reportDigitalPin = function (pin, value) { postal.sendCommand('reportDigitalPin', [board.id, pin, value ]);};
    board.getDigitalPinValue = function (pin) { postal.sendCommand('getDigitalPinValue', [board.id, pin], function (response) { board.pins[pin].value = response; board.pins[pin].report = 2;}); };
    board.getAnalogPinValue = function (aPin) { postal.sendCommand('getAnalogPinValue', [board.id, aPin], function (response) { board.pins[aPin].value = response; board.pins[aPin].report = 2;}); };
    board.getArduinoBoardParam = function (name) {postal.sendCommand('getArduinoBoardParam', [board.id, name], function (response) { board[name] = response;}); };
    board.checkArduinoBoardParam = function (name) {postal.sendCommand('checkArduinoBoardParam', [board.id, name], function (response) { board[name] = response;}); };
    board.i2cConfig = function () {postal.sendCommand('i2cConfig', [board.id]); };
    board.i2cWrite = function (address, reg, bytes) { postal.sendCommand('i2cWrite', [board.id, address, reg, bytes]); };
    board.i2cReadOnce = function (address, reg, callback) { postal.sendCommand('i2cReadOnce', [board.id, address, reg], function (response) { board['i2cResponse-' + Number(address)] = response; }); };

};

// Fake Buffer definition, needed by some Firmata extensions

function Buffer (data) {
    return data;
};

/* plugin.js */
var extensionId = 'meajklokhjoflbimamdbhpdjlondmgpi',
    postal = new Postal(),
    firmata = {
        Board: function(port, callback) {
            chrome.runtime.sendMessage(extensionId, { command: 'connectBoard', args: [ port ] }, callback)
        }
    },
    require = function () {};

// Messaging between web client and plugin

function Postal() {};

// Command sender function factory
Postal.prototype.commandSender = function () {
    var myself = this,
        command = arguments[0],
        args = Array.from(arguments).slice(1),
        callback = typeof args[args.length - 1] === 'function' ? args.splice(args.length - 1) : null;

    return function () { myself.sendCommand(command, args, callback); };
};

Postal.prototype.sendCommand = function (command, args, callback) {
    chrome.runtime.sendMessage(extensionId, { command: command, args: args }, callback);
};

chrome.serial = {
    getDevices: function (callback) { postal.sendCommand('getDevices', null, callback) }
};



/* END FROM SNAP */
	console.log("Can we see Arduino?");
	console.log(Arduino);
	Arduino.prototype.attemptConnection();

 /* RANSI see if calling hw list messes something up somehow */
  //var hwList = new HWList();

  function HWList() {
  console.log("Running HWList");
    this.devices = [];

    this.add = function(dev, pin) {
      var device = this.search(dev);
      if (!device) {
        device = {name: dev, pin: pin, val: 0};
        this.devices.push(device);
      } else {
        device.pin = pin;
        device.val = 0;
      }
    };

    this.search = function(dev) {
      for (var i=0; i<this.devices.length; i++) {
        if (this.devices[i].name === dev)
          return this.devices[i];
      }
      return null;
    };
  }

  function init() {

    for (var i = 0; i < 16; i++) {
      var output = new Uint8Array([REPORT_DIGITAL | i, 0x01]);
      device.send(output.buffer);
    }

    queryCapabilities();

    // TEMPORARY WORKAROUND
    // Since _deviceRemoved is not used with Serial devices
    // ping device regularly to check connection
    pinger = setInterval(function() {
      if (pinging) {
        if (++pingCount > 6) {
          clearInterval(pinger);
          pinger = null;
          connected = false;
          if (device) device.close();
          device = null;
          return;
        }
      } else {
        if (!device) {
          clearInterval(pinger);
          pinger = null;
          return;
        }
        queryFirmware();
        pinging = true;
      }
    }, 100);
  }

  function hasCapability(pin, mode) {
    if (pinModes[mode].indexOf(pin) > -1)
      return true;
    else
      return false;
  }

  function queryFirmware() {
    var output = new Uint8Array([START_SYSEX, QUERY_FIRMWARE, END_SYSEX]);
    device.send(output.buffer);
  }

  function queryCapabilities() {
    console.log('Querying ' + device.id + ' capabilities');
    var msg = new Uint8Array([
        START_SYSEX, CAPABILITY_QUERY, END_SYSEX]);
    device.send(msg.buffer);
  }

  function queryAnalogMapping() {
    console.log('Querying ' + device.id + ' analog mapping');
    var msg = new Uint8Array([
        START_SYSEX, ANALOG_MAPPING_QUERY, END_SYSEX]);
    device.send(msg.buffer);
  }

  function setDigitalInputs(portNum, portData) {
    digitalInputData[portNum] = portData;
  }

  function setAnalogInput(pin, val) {
    analogInputData[pin] = val;
  }

  function setVersion(major, minor) {
    majorVersion = major;
    minorVersion = minor;
  }

  function processSysexMessage() {
    switch(storedInputData[0]) {
      case CAPABILITY_RESPONSE:
        for (var i = 1, pin = 0; pin < MAX_PINS; pin++) {
          while (storedInputData[i++] != 0x7F) {
            pinModes[storedInputData[i-1]].push(pin);
            i++; //Skip mode resolution
          }
          if (i == sysexBytesRead) break;
        }
        queryAnalogMapping();
        break;
      case ANALOG_MAPPING_RESPONSE:
        for (var pin = 0; pin < analogChannel.length; pin++)
          analogChannel[pin] = 127;
        for (var i = 1; i < sysexBytesRead; i++)
          analogChannel[i-1] = storedInputData[i];
        for (var pin = 0; pin < analogChannel.length; pin++) {
          if (analogChannel[pin] != 127) {
            var out = new Uint8Array([
                REPORT_ANALOG | analogChannel[pin], 0x01]);
            device.send(out.buffer);
          }
        }
        notifyConnection = true;
        setTimeout(function() {
          notifyConnection = false;
        }, 100);
        break;
      case QUERY_FIRMWARE:
        if (!connected) {
          clearInterval(poller);
          poller = null;
          clearTimeout(watchdog);
          watchdog = null;
          connected = true;
          setTimeout(init, 200);
        }
        pinging = false;
        pingCount = 0;
        break;
    }
  }

  function processInput(inputData) {
    for (var i=0; i < inputData.length; i++) {
      if (parsingSysex) {
        if (inputData[i] == END_SYSEX) {
          parsingSysex = false;
          processSysexMessage();
        } else {
          storedInputData[sysexBytesRead++] = inputData[i];
        }
      } else if (waitForData > 0 && inputData[i] < 0x80) {
        storedInputData[--waitForData] = inputData[i];
        if (executeMultiByteCommand !== 0 && waitForData === 0) {
          switch(executeMultiByteCommand) {
            case DIGITAL_MESSAGE:
              setDigitalInputs(multiByteChannel, (storedInputData[0] << 7) + storedInputData[1]);
              break;
            case ANALOG_MESSAGE:
              setAnalogInput(multiByteChannel, (storedInputData[0] << 7) + storedInputData[1]);
              break;
            case REPORT_VERSION:
              setVersion(storedInputData[1], storedInputData[0]);
              break;
          }
        }
      } else {
        if (inputData[i] < 0xF0) {
          command = inputData[i] & 0xF0;
          multiByteChannel = inputData[i] & 0x0F;
        } else {
          command = inputData[i];
        }
        switch(command) {
          case DIGITAL_MESSAGE:
          case ANALOG_MESSAGE:
          case REPORT_VERSION:
            waitForData = 2;
            executeMultiByteCommand = command;
            break;
          case START_SYSEX:
            parsingSysex = true;
            sysexBytesRead = 0;
            break;
        }
      }
    }
  }

  function pinMode(pin, mode) {
    var msg = new Uint8Array([PIN_MODE, pin, mode]);
    device.send(msg.buffer);
  }

  function analogRead(pin) {
    if (pin >= 0 && pin < pinModes[ANALOG].length) {
      return Math.round((analogInputData[pin] * 100) / 1023);
    } else {
      var valid = [];
      for (var i = 0; i < pinModes[ANALOG].length; i++)
        valid.push(i);
      console.log('ERROR: valid analog pins are ' + valid.join(', '));
      return;
    }
  }

  function digitalRead(pin) {
    if (!hasCapability(pin, INPUT)) {
      console.log('ERROR: valid input pins are ' + pinModes[INPUT].join(', '));
      return;
    }
    pinMode(pin, INPUT);
    return (digitalInputData[pin >> 3] >> (pin & 0x07)) & 0x01;
  }

  function analogWrite(pin, val) {
    if (!hasCapability(pin, PWM)) {
      console.log('ERROR: valid PWM pins are ' + pinModes[PWM].join(', '));
      return;
    }
    if (val < 0) val = 0;
    else if (val > 100) val = 100;
    val = Math.round((val / 100) * 255);
    pinMode(pin, PWM);
    var msg = new Uint8Array([
        ANALOG_MESSAGE | (pin & 0x0F),
        val & 0x7F,
        val >> 7]);
    device.send(msg.buffer);
  }

  function digitalWrite(pin, val) {
    if (!hasCapability(pin, OUTPUT)) {
      console.log('ERROR: valid output pins are ' + pinModes[OUTPUT].join(', '));
      return;
    }
    var portNum = (pin >> 3) & 0x0F;
    if (val == LOW)
      digitalOutputData[portNum] &= ~(1 << (pin & 0x07));
    else
      digitalOutputData[portNum] |= (1 << (pin & 0x07));
    pinMode(pin, OUTPUT);
    var msg = new Uint8Array([
        DIGITAL_MESSAGE | portNum,
        digitalOutputData[portNum] & 0x7F,
        digitalOutputData[portNum] >> 0x07]);
    device.send(msg.buffer);
  }

  function rotateServo(pin, deg) {
    if (!hasCapability(pin, SERVO)) {
      console.log('ERROR: valid servo pins are ' + pinModes[SERVO].join(', '));
      return;
    }
    pinMode(pin, SERVO);
    var msg = new Uint8Array([
        ANALOG_MESSAGE | (pin & 0x0F),
        deg & 0x7F,
        deg >> 0x07]);
    device.send(msg.buffer);
  }

  function freeMotor() {
    return new Promise(resolve => {var interval = setInterval(function() {
      if (carmoving == false){
        clearInterval(interval);
        resolve(carmoving);
      }
    }, 1000);
  });
  }

  ext.whenConnected = function() {
    if (notifyConnection) return true;
    return false;
  };

  ext.analogWrite = function(pin, val) {
    analogWrite(pin, val);
  };

  ext.digitalWrite = function(pin, val) {
    if (val == menus[lang]['outputs'][0])
      digitalWrite(pin, HIGH);
    else if (val == menus[lang]['outputs'][1])
      digitalWrite(pin, LOW);
  };

  ext.analogRead = function(pin) {
    return analogRead(pin);
  };

  ext.digitalRead = function(pin) {
    return digitalRead(pin);
  };

  ext.whenAnalogRead = function(pin, op, val) {
    if (pin >= 0 && pin < pinModes[ANALOG].length) {
      if (op == '>')
        return analogRead(pin) > val;
      else if (op == '<')
        return analogRead(pin) < val;
      else if (op == '=')
        return analogRead(pin) == val;
      else
        return false;
    }
  };

  ext.whenDigitalRead = function(pin, val) {
    if (hasCapability(pin, INPUT)) {
      if (val == menus[lang]['outputs'][0])
        return digitalRead(pin);
      else if (val == menus[lang]['outputs'][1])
        return digitalRead(pin) === false;
    }
  };

  ext.connectHW = function(hw, pin) {
    hwList.add(hw, pin);
  };

  ext.rotateServo = function(servo, deg) {
    var hw = hwList.search(servo);
    if (!hw) return;
    if (deg < 0) deg = 0;
    else if (deg > 180) deg = 180;
    rotateServo(hw.pin, deg);
    hw.val = deg;
  };

  ext.changeServo = function(servo, change) {
    var hw = hwList.search(servo);
    if (!hw) return;
    var deg = hw.val + change;
    if (deg < 0) deg = 0;
    else if (deg > 180) deg = 180;
    rotateServo(hw.pin, deg);
    hw.val = deg;
  };

  var speed = 1;

  ext.moveForward = function(time) {
    var doIt = freeMotor();
    doIt.then(response => {
      carmoving = true;
      console.log(carmoving);
      rotateServo(rightservo, Math.round(90 - speed*35));
      rotateServo(leftservo, Math.round(90 + speed*25));
      setTimeout(function(){
        rotateServo(rightservo, 90);
        rotateServo(leftservo, 90);
        carmoving = false;
        console.log(carmoving);
      }, time*1000);
    })
  };

  ext.moveBackward = function(time) {
    var doIt = freeMotor();
    doIt.then(response => {
      carmoving = true;
      console.log(carmoving);
      rotateServo(rightservo, Math.round(90+ speed*25));
      rotateServo(leftservo, Math.round(90 - speed*35));
      setTimeout(function(){
        rotateServo(rightservo, 90);
        rotateServo(leftservo, 90);
        carmoving = false;
        console.log(carmoving);
      }, time*1000);
    })
  };

  ext.easyturn = function(direction) {
    carmoving = true;
    if (direction == 'right'){
      rotateServo(rightservo, Math.round(90+ speed*25));
      rotateServo(leftservo, Math.round(90+ speed*25));
      setTimeout(function(){
        rotateServo(rightservo, 90);
        rotateServo(leftservo, 90);
        carmoving = false;
      }, 2300);
    } else if (direction == 'left') {
      rotateServo(rightservo, Math.round(90 - speed*35)); //slower?
      rotateServo(leftservo, Math.round(90 - speed*35)); //slower?
      setTimeout(function(){
        rotateServo(rightservo, 90);
        rotateServo(leftservo, 90);
        carmoving = false;
      }, 2300);
    }
    else if (direction == 'around') {
      rotateServo(rightservo, Math.round(90 - speed*35)); //slower?
      rotateServo(leftservo, Math.round(90 - speed*35)); //slower?
      setTimeout(function(){
        rotateServo(rightservo, 90);
        rotateServo(leftservo, 90);
        carmoving = false;
      }, 4350);
    };
  };

  ext.turn = function(direction, time) {
    carmoving = true;
    if (direction == 'clockwise'){
      rotateServo(rightservo, Math.round(90+ speed*25));
      rotateServo(leftservo, Math.round(90+ speed*25));
    } else if (direction == 'counterclockwise') {
      rotateServo(rightservo, Math.round(90 - speed*35)); //slower?
      rotateServo(leftservo, Math.round(90 - speed*35)); //slower?
    };
    setTimeout(function(){
      rotateServo(rightservo, 90);
      rotateServo(leftservo, 90);
      carmoving = false;
    }, time*1000);

  };

  ext.setSpeed = function(percent) {
  if (percent > 100) percent = 100;
  if (percent < 0) percent = 0;
  speed = percent/100
  };

  ext.isCarMoving = function(state) {
    if (carmoving) {
      if (state == 'moving')
        return true;
      else
        return false;
    }
    else {
      if (state == 'moving')
        return false;
      else
        return true;
    }
  };

  ext.setLED = function(led, val) {
    var hw = hwList.search(led);
    if (!hw) return;
    analogWrite(hw.pin, val);
    hw.val = val;
  };

  ext.setColor = function(newcolor) {
    color = newcolor;
    if (color == 'random'){
      rgb = [Math.round(255*Math.random()), Math.round(255*Math.random()), Math.round(255*Math.random())];
      do {
        rgb = [Math.round(255*Math.random()), Math.round(255*Math.random()), Math.round(255*Math.random())];
      }
      while (rgb[0] > 90 && rgb[1] > 90 && rgb[2] > 90)
    } else {
      rgb = colorMap[color];
    }
    if (lightson) {
      analogWrite(redpin, rgb[0]);
      analogWrite(greenpin, rgb[1]);
      analogWrite(bluepin, rgb[2]);
    }
  };

  ext.setLEDstrip = function(val) {
    if (val == 'on') {
      analogWrite(redpin, rgb[0]);
      analogWrite(greenpin, rgb[1]);
      analogWrite(bluepin, rgb[2]);
      lightson = true;
    } else if (val == 'off') {
      analogWrite(redpin, 255);
      analogWrite(greenpin, 255);
      analogWrite(bluepin, 255);
      lightson = false;
    }
  };

  ext.RedRead = function() {
    return rgb[0];
  };

  ext.GreenRead = function() {
    return rgb[1];
  };

  ext.BlueRead = function() {
    return rgb[2];
  };

  ext.changeLED = function(led, val) {
    var hw = hwList.search(led);
    if (!hw) return;
    var b = hw.val + val;
    if (b < 0) b = 0;
    else if (b > 100) b = 100;
    analogWrite(hw.pin, b);
    hw.val = b;
  };

  ext.digitalLED = function(led, val) {
    var hw = hwList.search(led);
    if (!hw) return;
    if (val == 'on') {
      digitalWrite(hw.pin, HIGH);
      hw.val = 255;
    } else if (val == 'off') {
      digitalWrite(hw.pin, LOW);
      hw.val = 0;
    }
  };

  ext.areLightsOn = function(state) {
    if (lightson) {
      if (state == 'on')
        return true;
      else
        return false;
    }
    else {
      if (state == 'on')
        return false;
      else
        return true;
    }
  };

  ext.readInput = function(name) {
    var hw = hwList.search(name);
    if (!hw) return;
    return analogRead(hw.pin);
  };

  ext.whenButton = function(btn, state) {
    var hw = hwList.search(btn);
    if (!hw) return;
    if (state === 'pressed')
      return digitalRead(hw.pin);
    else if (state === 'released')
      return !digitalRead(hw.pin);
  };

  ext.isButtonPressed = function(btn) {
    var hw = hwList.search(btn);
    if (!hw) return;
    return digitalRead(hw.pin);
  };

  ext.whenInput = function(name, op, val) {
    var hw = hwList.search(name);
    if (!hw) return;
    if (op == '>')
      return analogRead(hw.pin) > val;
    else if (op == '<')
      return analogRead(hw.pin) < val;
    else if (op == '=')
      return analogRead(hw.pin) == val;
    else
      return false;
  };

  ext.mapValues = function(val, aMin, aMax, bMin, bMax) {
    var output = (((bMax - bMin) * (val - aMin)) / (aMax - aMin)) + bMin;
    return Math.round(output);
  };

  ext._getStatus = function() {
    if (!connected)
      return { status:1, msg:'Disconnected' };
    else
      return { status:2, msg:'Connected' };
  };

  ext._deviceRemoved = function(dev) {
    console.log('Device removed');
    // Not currently implemented with serial devices
  };

  var potentialDevices = [];
  ext._deviceConnected = function(dev) {
    potentialDevices.push(dev);
    if (!device)
      tryNextDevice();
  };

  var poller = null;
  var watchdog = null;
  function tryNextDevice() {
    device = potentialDevices.shift();
    if (!device) return;

    device.open({ stopBits: 0, bitRate: 57600, ctsFlowControl: 0 });
    console.log('Attempting connection with ' + device.id);
    device.set_receive_handler(function(data) {
      var inputData = new Uint8Array(data);
      processInput(inputData);
    });

    poller = setInterval(function() {
      queryFirmware();
    }, 1000);

    watchdog = setTimeout(function() {
      clearInterval(poller);
      poller = null;
      device.set_receive_handler(null);
      device.close();
      device = null;
      tryNextDevice();
    }, 5000);
  }

  ext._shutdown = function() {
    // TODO: Bring all pins down
    if (device) device.close();
    if (poller) clearInterval(poller);
    device = null;
  };

  // Check for GET param 'lang'
  var paramString = window.location.search.replace(/^\?|\/$/g, '');
  var vars = paramString.split("&");
  var lang = 'en';
  for (var i=0; i<vars.length; i++) {
    var pair = vars[i].split('=');
    if (pair.length > 1 && pair[0]=='lang')
      lang = pair[1];
  }

  var blocks = {
    en: [
      ['h', 'when device is connected', 'whenConnected'],
      [' ', 'connect %m.hwOut to pin %n', 'connectHW', 'led A', 3],
      [' ', 'connect %m.hwIn to analog %n', 'connectHW', 'rotation knob', 0],
      ['-'],
      [' ', 'set %m.leds %m.outputs', 'digitalLED', 'led A', 'on'],
      [' ', 'set %m.leds brightness to %n%', 'setLED', 'led A', 100],
      [' ', 'change %m.leds brightness by %n%', 'changeLED', 'led A', 20],
      [' ', 'turn light strip %m.outputs', 'setLEDstrip', 'on'],
      [' ', 'set light color to %m.colors', 'setColor', 'white'],
      ['b', 'lights %m.outputs ?', 'areLightsOn', 'on'],
      ['r', 'red value', 'RedRead'],
      ['r', 'green value', 'GreenRead'],
      ['r', 'blue value', 'BlueRead'],
      ['-'],
      [' ', 'rotate %m.servos to %n degrees', 'rotateServo', 'servo A', 180],
      [' ', 'rotate %m.servos by %n degrees', 'changeServo', 'servo A', 20],
      [' ', 'move forward for %n seconds', 'moveForward', 5],
      [' ', 'move backward for %n seconds', 'moveBackward', 5],
      [' ', 'turn %m.turning', 'easyturn', 'left'],
      [' ', 'set speed to %n', 'setSpeed', 100],
      [' ', 'turn %m.directions for %n seconds', 'turn', 'clockwise', 5],
      ['b', 'car %m.carStates ?', 'isCarMoving', 'moving'],
      // ['r', 'car left value', 'carLeftRead'],
      // ['r', 'car right value', 'carRightRead'],
      ['-'],
      ['h', 'when %m.buttons is %m.btnStates', 'whenButton', 'button A', 'pressed'],
      ['b', '%m.buttons pressed?', 'isButtonPressed', 'button A'],
      ['-'],
      ['h', 'when %m.hwIn %m.ops %n%', 'whenInput', 'rotation knob', '>', 50],
      ['r', 'read %m.hwIn', 'readInput', 'rotation knob'],
      ['-'],
      [' ', 'set pin %n %m.outputs', 'digitalWrite', 1, 'on'],
      [' ', 'set pin %n to %n%', 'analogWrite', 3, 100],
      ['-'],
      ['h', 'when pin %n is %m.outputs', 'whenDigitalRead', 1, 'on'],
      ['b', 'pin %n on?', 'digitalRead', 1],
      ['-'],
      ['h', 'when analog %n %m.ops %n%', 'whenAnalogRead', 1, '>', 50],
      ['r', 'read analog %n', 'analogRead', 0],
      ['-'],
      ['r', 'map %n from %n %n to %n %n', 'mapValues', 50, 0, 100, -240, 240]
    ]};

  var menus = {
    en: {
      buttons: ['button A', 'button B', 'button C', 'button D'],
      btnStates: ['pressed', 'released'],
      carStates: ['moving', 'stopped'],
      hwIn: ['rotation knob', 'light sensor', 'temperature sensor'],
      hwOut: ['led A', 'led B', 'led C', 'led D', 'button A', 'button B', 'button C', 'button D', 'servo A', 'servo B', 'servo C', 'servo D'],
      leds: ['led A', 'led B', 'led C', 'led D'],
      outputs: ['on', 'off'],
      ops: ['>', '=', '<'],
      turning: ['left', 'right', 'around'],
      directions: ['clockwise', 'counterclockwise'],
      servos: ['servo A', 'servo B', 'servo C', 'servo D'],
      colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'random']
    }};

  var descriptor = {
    blocks: blocks[lang],
    menus: menus[lang],
    url: ''
  };

  ScratchExtensions.register('Arduino', descriptor, ext);

})({});
