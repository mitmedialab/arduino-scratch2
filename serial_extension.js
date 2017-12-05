 /*This program is free software: you can redistribute it and/or modify
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

(function(ext) {

  var potentialDevices = [];
  var watchdog = null;
  var poller = null;
  var lastReadTime = 0;
  var connected = false;
  var command = null;
  var parsingCmd = false;
  var bytesRead = 0;
  var waitForData = 0;
  var storedInputData = new Uint8Array(4096);

  var CMD_DIGITAL_WRITE = 0x73,
    CMD_ANALOG_WRITE = 0x74,
    CMD_PIN_MODE = 0x75,
    CMD_CALIBRATE_IMU = 0x76,
    CMD_SERVO_WRITE = 0x77,
    CMD_ANALOG_READ = 0x78,
    CMD_DIGITAL_READ = 0x79,
    CMD_IMU_READ = 0x7A,
    CMD_IMU_EVENT = 0x7B,
    CMD_PING = 0x7C,
    CMD_PING_CONFIRM = 0x7D;

  var IMU_EVENT_TAP = 0x00,
    IMU_EVENT_DOUBLE_TAP = 0x01,
    IMU_EVENT_SHAKE = 0x02;

  var PWM_PINS = [3, 5, 6, 9];
    DIGITAL_PINS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];

  var LOW = 0,
    HIGH = 1;

  var INPUT = 0,
    OUTPUT = 1;

  var digitalInputData = new Uint8Array(12),
    pinModes = new Uint8Array(12),
    analogInputData = new Uint8Array(6),
    accelInputData = [0,0],
    imuEventData = new Uint8Array(3),
    servoVals = new Uint8Array(12);

  var device = null;

  function analogRead(aPin) {
    var pin = -1;
    if (isNaN(parseFloat(aPin)))
      pin = ANALOG_PINS.indexOf(aPin.toUpperCase());
    else if (ANALOG_PINS[aPin])
      pin = aPin;
    if (pin === -1) return;
    return Math.round(map(analogInputData[pin], 0, 255, 0, 100));
  }

  function digitalRead(pin) {
    if (DIGITAL_PINS.indexOf(parseInt(pin)) === -1) return;
    if (pinModes[pin-2] != INPUT)
      pinMode(pin, INPUT);
    return digitalInputData[parseInt(pin)-2];
  }

  function analogWrite(pin, val) {
    if (PWM_PINS.indexOf(parseInt(pin)) === -1) return;
    if (val < 0) val = 0;
    else if (val > 100) val = 100;
    val = Math.round((val / 100) * 255);
    device.send(new Uint8Array([CMD_ANALOG_WRITE, pin, val]).buffer);
  }

  function digitalWrite(pin, val) {
    if (DIGITAL_PINS.indexOf(parseInt(pin)) === -1) return;
    device.send(new Uint8Array([CMD_DIGITAL_WRITE, pin, val]).buffer);
  }

  function pinMode(pin, mode) {
    device.send(new Uint8Array([CMD_PIN_MODE, pin, mode]).buffer);
  }

  function rotateServo(pin, deg) {
    if (DIGITAL_PINS.indexOf(parseInt(pin)) === -1) return;
    device.send(new Uint8Array([CMD_SERVO_WRITE, pin, deg]).buffer);
    servoVals[pin] = deg;
  }

  function map(val, aMin, aMax, bMin, bMax) {
    if (val > aMax) val = aMax;
    else if (val < aMin) val = aMin;
    return (((bMax - bMin) * (val - aMin)) / (aMax - aMin)) + bMin;
  }

  function tryNextDevice() {
    device = potentialDevices.shift();
    if (!device) return;
    device.open({stopBits: 0, bitRate: 57600, ctsFlowControl: 0}, function() {
      device.set_receive_handler(function(data) {
        processInput(new Uint8Array(data));
      });
    });

    poller = setInterval(function() {
      pingDevice();
    }, 1000);

    watchdog = setTimeout(function() {
      clearTimeout(poller);
      poller = null;
      device.set_receive_handler(null);
      device.close();
      device = null;
      tryNextDevice();
    }, 5000);
  }

  function pingDevice() {
    device.send(new Uint8Array([CMD_PING]).buffer);
  }

  function processInput(inputData) {
    lastReadTime = Date.now();
    for (var i=0; i<inputData.length; i++) {
      if (parsingCmd) {
        storedInputData[bytesRead++] = inputData[i];
        if (bytesRead === waitForData) {
          parsingCmd = false;
          processCmd();
        }
      } else {
        switch (inputData[i]) {
        case CMD_PING:
          parsingCmd = true;
          command = inputData[i];
          waitForData = 2;
          bytesRead = 0;
          break;
        case CMD_ANALOG_READ:
          parsingCmd = true;
          command = inputData[i];
          waitForData = 6;
          bytesRead = 0;
          break;
        case CMD_DIGITAL_READ:
          parsingCmd = true;
          command = inputData[i];
          waitForData = 12;
          bytesRead = 0;
          break;
        case CMD_IMU_READ:
          parsingCmd = true;
          command = inputData[i];
          waitForData = 4;
          bytesRead = 0;
          break;
        case CMD_IMU_EVENT:
          parsingCmd = true;
          command = inputData[i];
          waitForData = 3;
          bytesRead = 0;
          break;
        }
      }
    }
  }

  function processCmd() {
    switch (command) {
    case CMD_PING:
      if (storedInputData[0] === CMD_PING_CONFIRM) {
        connected = true;
        clearTimeout(watchdog);
        watchdog = null;
        clearInterval(poller);
        poller = setInterval(function() {
          if (Date.now() - lastReadTime > 5000) {
            connected = false;
            device.set_receive_handler(null);
            device.close();
            device = null;
            clearInterval(poller);
            poller = null;
          }
        }, 2000);
      }
      break;
    case CMD_ANALOG_READ:
      analogInputData = storedInputData.slice(0, 6);
      break;
    case CMD_DIGITAL_READ:
      digitalInputData = storedInputData.slice(0, 12);
      break;
    case CMD_IMU_READ:
      for (var i=0; i<2; i++) {
        accelInputData[i] = storedInputData[(i*2)+1];
        if (storedInputData[i*2]) accelInputData[i] *= -1;
      }
      break;
    case CMD_IMU_EVENT:
      imuEventData = storedInputData.slice(0, 3);
      break;
    }
  }

  ext.analogWrite = function(pin, val) {
    analogWrite(pin, val);
  };

  ext.digitalWrite = function(pin, val) {
    if (val == 'on')
      digitalWrite(pin, HIGH);
    else if (val == 'off')
      digitalWrite(pin, LOW);
  };

  ext.analogRead = function(pin) {
    return analogRead(pin);
  };

  ext.digitalRead = function(pin) {
    return digitalRead(pin);
  };

  ext.whenAnalogRead = function(pin, op, val) {
    if (ANALOG_PINS.indexOf(pin) === -1) return
    if (op == '>')
      return analogRead(pin) > val;
    else if (op == '<')
      return analogRead(pin) < val;
    else if (op == '=')
      return analogRead(pin) == val;
    else
      return false;
  };

  ext.whenDigitalRead = function(pin, val) {
    if (val == 'on')
      return digitalRead(pin);
    else if (val == 'off') {
      return digitalRead(pin) == 0;
    }
  };

  ext.rotateServo = function(pin, deg) {
    if (deg < 0) deg = 0;
    else if (deg > 180) deg = 180;
    rotateServo(pin, deg);
  };

  ext.servoPosition = function(pin) {
    return servoVals[pin];
  };

  ext.getTilt = function(coord) {
    switch (coord) {
    case 'up':
      return accelInputData[0];
    case 'down':
      return -accelInputData[0];
    case 'left':
      return -accelInputData[1];
    case 'right':
      return accelInputData[1];
    }
  };

  ext.whenIMUEvent = function(imuEvent) {
    return imuEventData[IMU_EVENT_SHAKE];
  };

  ext._getStatus = function() {
    if (connected) return {status: 2, msg: 'Arduino connected'};
    else return {status: 1, msg: 'Arduino disconnected'};
  };

  ext._deviceConnected = function(dev) {
    potentialDevices.push(dev);
    if (!device) tryNextDevice();
  };

  ext._deviceRemoved = function(dev) {
    console.log('device removed');
    pinModes = new Uint8Array(12);
    if (device != dev) return;
    device = null;
  };

  ext._shutdown = function() {
    // TODO: Bring all pins down
    if (device) device.close();
    device = null;
  };

  var blocks = [
    [' ', 'set pin %d.digitalOutputs %m.outputs', 'digitalWrite', 13, 'on'],
    [' ', 'set pin %d.analogOutputs to %n%', 'analogWrite', 9, 100],
    ['h', 'when pin %d.digitalInputs is %m.outputs', 'whenDigitalRead', 9, 'on'],
    ['b', 'pin %d.digitalInputs on?', 'digitalRead', 9],
    ['-'],
    ['h', 'when analog pin %d.analogInputs %m.ops %n%', 'whenAnalogRead', 'A0', '>', 50],
    ['r', 'read analog pin %d.analogInputs', 'analogRead', 'A0'],
    ['-'],
    ['h', 'when shaken', 'whenIMUEvent'],
    ['r', 'tilt angle %m.tiltDir', 'getTilt', 'up'],
    ['-'],
    [' ', 'set pin %d.digitalOutputs servo to %n degrees', 'rotateServo', 7, 90],
    ['r', 'pin %d.digitalOutputs servo position', 'servoPosition', 7]
  ];

  var menus = {
    digitalOutputs: DIGITAL_PINS,
    analogOutputs: PWM_PINS,
    digitalInputs: DIGITAL_PINS,
    analogInputs: ANALOG_PINS,
    outputs: ['on', 'off'],
    ops: ['>', '=', '<'],
    tiltDir: ['up', 'down', 'left', 'right']
  };

  var descriptor = {
    blocks: blocks,
    menus: menus,
    url: 'http://khanning.github.io/scratch-arduino-extension'
  };

  ScratchExtensions.register('Arduino 101', descriptor, ext, {type: 'serial'});
})({});
