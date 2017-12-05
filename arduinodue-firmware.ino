#include <CurieBLE.h>
#include <CurieIMU.h>
#include <Servo.h>

#define CALIBRATE_OFFSETS

// frequency to read sensor values in mu
const unsigned long SENSOR_UPDATE_FREQ = 30000;
const unsigned long IMU_READ_FREQ = 5000;

const unsigned long IMU_TAP_THRESHOLD = 300; // 300mg
const double IMU_FILTER_ALPHA = 0.5; //Alpha for accelerometer low pass filter

const byte CMD_DIGITAL_WRITE = 0x73;
const byte CMD_ANALOG_WRITE = 0x74;
const byte CMD_PIN_MODE = 0x75;
const byte CMD_CALIBRATE_IMU = 0x76;
const byte CMD_SERVO_WRITE = 0x77;
const byte CMD_ANALOG_READ = 0x78;
const byte CMD_DIGITAL_READ = 0x79;
const byte CMD_IMU_READ = 0x7A;
const byte CMD_IMU_EVENT = 0x7B;
const byte CMD_PING = 0x7C;
const byte CMD_PING_CONFIRM = 0x7D;

const byte SERVO = 0x2;

const byte IMU_EVENT_TAP = 0x0;
const byte IMU_EVENT_DOUBLE_TAP = 0x01;
const byte IMU_EVENT_SHAKE = 0x02;

BLEPeripheral blePeripheral;
BLEService bleService("a56ada00-ed09-11e5-9c97-0002a5d5c51b");

BLECharacteristic txChar("a56ada01-ed09-11e5-9c97-0002a5d5c51b", BLEWrite, 3);
BLECharacteristic analogReadChar("a56ada02-ed09-11e5-9c97-0002a5d5c51b", BLENotify, 6);
BLECharacteristic digitalReadChar("a56ada03-ed09-11e5-9c97-0002a5d5c51b", BLENotify, 12);
BLECharacteristic pinModeChar("a56ada04-ed09-11e5-9c97-0002a5d5c51b", BLENotify, 12);
BLECharacteristic imuTiltChar("a56ada05-ed09-11e5-9c97-0002a5d5c51b", BLENotify, 4);
BLECharacteristic imuEventChar("a56ada06-ed09-11e5-9c97-0002a5d5c51b", BLENotify, 3);

unsigned long nextSensorUpdate;
unsigned long nextIMURead;

int axRaw, ayRaw, azRaw;
int gxRaw, gyRaw, gzRaw;
double ax, ay, az;
double compAngleX, compAngleY;
double roll, pitch;
double dt;

byte analogReadVals[6];
byte digitalReadVals[12];
byte pinModes[12];
unsigned char imuData[4];
byte imuEventData[3];

byte incomingSerialData[3];
byte incomingCmdLen = 0;
byte incomingCmdCount = 0;
boolean incomingCmd = false;

//Used to flag BLE characteristic updates in main loop
boolean newDigitalVal = false;
boolean newPinMode = false;
boolean newIMUEvent = false;
boolean clearIMUEvents = true;

Servo servos[12];

void setup() {
  Serial.begin(57600);

  CurieIMU.begin();
  CurieIMU.attachInterrupt(curieInterrupt);

  CurieIMU.setAccelerometerRange(4);
  CurieIMU.setGyroRange(250);

  //Tap Detection
  CurieIMU.setDetectionThreshold(CURIE_IMU_TAP, IMU_TAP_THRESHOLD);
  CurieIMU.interrupts(CURIE_IMU_TAP);

  //Double Tap Detection
  CurieIMU.setDetectionThreshold(CURIE_IMU_DOUBLE_TAP, IMU_TAP_THRESHOLD);
  CurieIMU.setDetectionDuration(CURIE_IMU_DOUBLE_TAP, 1000);
  CurieIMU.interrupts(CURIE_IMU_DOUBLE_TAP);

  CurieIMU.setDetectionThreshold(CURIE_IMU_SHOCK, 2500); // 1500mg
  CurieIMU.setDetectionDuration(CURIE_IMU_SHOCK, 50); // 50ms
  CurieIMU.interrupts(CURIE_IMU_SHOCK);
  
  #ifdef CALIBRATE_OFFSETS
    calibrateIMU();
  #endif

  CurieIMU.readAccelerometer(axRaw, ayRaw, azRaw);
  ax = convertRawAcceleration(axRaw);
  ay = convertRawAcceleration(ayRaw);
  az = convertRawAcceleration(azRaw);

  compAngleX = atan2(ay, az) * RAD_TO_DEG;
  compAngleY = atan2(-ax, az) * RAD_TO_DEG;

  nextIMURead = micros() + IMU_READ_FREQ;
  
  blePeripheral.setLocalName("Arduino101");
  blePeripheral.setAdvertisedServiceUuid(bleService.uuid());

  blePeripheral.addAttribute(bleService);
  blePeripheral.addAttribute(txChar);
  blePeripheral.addAttribute(analogReadChar);
  blePeripheral.addAttribute(digitalReadChar);
  blePeripheral.addAttribute(pinModeChar);
  blePeripheral.addAttribute(imuTiltChar);
  blePeripheral.addAttribute(imuEventChar);

  txChar.setEventHandler(BLEWritten, txWritten);
  imuEventChar.setEventHandler(BLEWritten, imuEventWritten);
  
  memset(analogReadVals, 0, sizeof(analogReadVals));
  memset(digitalReadVals, 0, sizeof(digitalReadVals));
  memset(pinModes, 0, sizeof(pinModes));
  memset(imuData, 0, sizeof(imuData));
  memset(imuEventData, 0, sizeof(imuEventData));

  analogReadChar.setValue(analogReadVals, 6);
  digitalReadChar.setValue(digitalReadVals, 12);
  pinModeChar.setValue(pinModes, 12);
  imuTiltChar.setValue(imuData, 4);
  imuEventChar.setValue(imuEventData, 3);

  blePeripheral.setConnectionInterval(0x0006, 0x0010);  
  blePeripheral.begin();
}

void loop() {
  BLECentral bleCentral = blePeripheral.central();

  if (Serial.available()) {
    if (incomingCmd) {
      incomingSerialData[incomingCmdCount++] = Serial.read();
      if (incomingCmdCount == incomingCmdLen) {
        processCommand(incomingSerialData);
        incomingCmd = false;
      }
    } else {
      incomingSerialData[0] = Serial.read();
      switch (incomingSerialData[0]) {
        case CMD_PING:
          Serial.write(CMD_PING);
          Serial.write(CMD_PING_CONFIRM);
          break;
        case CMD_ANALOG_WRITE:
        case CMD_DIGITAL_WRITE:
        case CMD_PIN_MODE:
        case CMD_SERVO_WRITE:
          incomingCmd = true;
          incomingCmdLen = 3;
          incomingCmdCount = 1;
          break;
      }
    }
  }
  
  if ((long)(micros() - nextSensorUpdate) >= 0) {
    updateSensorValues();
    nextSensorUpdate += SENSOR_UPDATE_FREQ;
  }

  if ((long)(micros() - nextIMURead) >= 0) {
    updateIMUValues();
  }
  
  //Reset all digital pins to INPUT
  /*byte i;
  for (i=0; i<12; i++) {
    if (pinModes[i] == OUTPUT) {
      digitalWrite(i+2, LOW);
      pinMode(i+2, INPUT);
      pinModes[i] = INPUT;
    }
  }*/
}

void calibrateIMU() {
  CurieIMU.autoCalibrateGyroOffset();
  CurieIMU.autoCalibrateAccelerometerOffset(X_AXIS, 0);
  CurieIMU.autoCalibrateAccelerometerOffset(Y_AXIS, 0);
  CurieIMU.autoCalibrateAccelerometerOffset(Z_AXIS, 1);
}

void processCommand(byte inputData[]) {
  byte cmd = inputData[0];
  if (cmd == CMD_DIGITAL_WRITE) {
    byte pin = inputData[1];
    byte val = inputData[2];
    if (pinModes[pin-2] != OUTPUT)
      setMode(pin, OUTPUT);
    digitalWrite(pin, val);
  } else if (cmd == CMD_ANALOG_WRITE) {
    byte pin = inputData[1];
    byte val = inputData[2];
    if (pinModes[pin-2] != OUTPUT)
      setMode(pin, OUTPUT);
    analogWrite(pin, val);
  } else if (cmd == CMD_PIN_MODE) {
    byte pin = inputData[1];
    byte mode = inputData[2];
    if (pinModes[pin-2] != mode)
      setMode(pin, mode);
  } else if (cmd == CMD_CALIBRATE_IMU) {
    calibrateIMU();
  } else if (cmd == CMD_SERVO_WRITE) {
    byte pin = inputData[1];
    byte deg = inputData[2];
    if (!servos[pin-2].attached()) {
      servos[pin-2].attach(pin);
      servos[pin-2].write(deg);
      pinModes[pin-2] = SERVO;
      newPinMode = true;
    } else {
      servos[pin-2].write(deg);
    }
  }
}

void txWritten(BLECentral& central, BLECharacteristic& characteristic) {
  processCommand((byte*) characteristic.value());
}

void imuEventWritten(BLECentral& central, BLECharacteristic& characteristic) {
  imuEventData[0] = characteristic.value()[0];
  imuEventData[1] = characteristic.value()[1];
}

float convertRawAcceleration(int aRaw) {
  // since we are using 2G range
  // -2g maps to a raw value of -32768
  // +2g maps to a raw value of 32767
  float a = (aRaw * 4.0) / 65536.0;
  return a;
}

float convertRawGyro(int gRaw) {
  // since we are using 250 degrees/seconds range
  // -250 maps to a raw value of -32768
  // +250 maps to a raw value of 32767
  float g = (gRaw * 250.0) / 32768.0;
  return g;
}

void curieInterrupt(void) {
  if (CurieIMU.getInterruptStatus(CURIE_IMU_TAP)) {
    imuEventData[IMU_EVENT_TAP] = 1;
    newIMUEvent = true;
  } else {
    imuEventData[IMU_EVENT_TAP] = 0;
  }
  if (CurieIMU.getInterruptStatus(CURIE_IMU_DOUBLE_TAP)) {
    imuEventData[IMU_EVENT_DOUBLE_TAP] = 1;
    newIMUEvent = true;
  } else {
    imuEventData[IMU_EVENT_DOUBLE_TAP] = 0;
  }
  if (CurieIMU.getInterruptStatus(CURIE_IMU_SHOCK)) {
    imuEventData[IMU_EVENT_SHAKE] = 1;
    newIMUEvent = true;
  } else {
    imuEventData[IMU_EVENT_SHAKE] = 0;
  }
}

void setMode(byte pin, byte mode) {
  if (servos[pin-2].attached())
    servos[pin-2].detach();
  pinMode(pin, mode);
  pinModes[pin-2] = mode;
  newPinMode = true;
}

void updateIMUValues() {
  CurieIMU.readMotionSensor(axRaw, ayRaw, azRaw, gxRaw, gyRaw, gzRaw);

  //Low Pass accelerometer filter
  ax = axRaw * IMU_FILTER_ALPHA + (ax * (1.0 - IMU_FILTER_ALPHA));
  ay = ayRaw * IMU_FILTER_ALPHA + (ay * (1.0 - IMU_FILTER_ALPHA));
  az = azRaw * IMU_FILTER_ALPHA + (az * (1.0 - IMU_FILTER_ALPHA));

  dt = (double)(micros() - (nextIMURead - IMU_READ_FREQ)) / 1000000; // Calculate delta time
  nextIMURead = micros() + IMU_READ_FREQ;
  
  roll  = atan2(convertRawAcceleration(ay), convertRawAcceleration(az)) * RAD_TO_DEG;
  pitch  = atan2(-convertRawAcceleration(ax), convertRawAcceleration(az)) * RAD_TO_DEG;

  //Complementary Filter
  compAngleX = 0.93 * (compAngleX + convertRawGyro(gxRaw) * dt) + 0.07 * roll; // Calculate the angle using a Complimentary filter
  compAngleY = 0.93 * (compAngleY + convertRawGyro(gyRaw) * dt) + 0.07 * pitch;
}

void updateSensorValues() {
  byte i, val;

  // Update pin modes
  if (newPinMode) {
    pinModeChar.setValue(pinModes, 12);
    newPinMode = false;
  }
  
  // Update IMU values
  if (compAngleX > 180)
    compAngleX = -180 + (compAngleX - 180);
  else if (compAngleX < -180)
    compAngleX = 180 + (-180 - compAngleX);
  imuData[0] = (compAngleX < 0);
  imuData[1] = abs(compAngleX);
  imuData[2] = (compAngleY < 0);
  imuData[3] = abs(compAngleY);
  imuTiltChar.setValue(imuData, 4);
  Serial.write(CMD_IMU_READ);
  Serial.write(imuData, 4);

  if (newIMUEvent) {
    imuEventChar.setValue(imuEventData, 3);
    Serial.write(CMD_IMU_EVENT);
    Serial.write(imuEventData, 3);
    newIMUEvent = false;
    clearIMUEvents = true;
  } else if (clearIMUEvents) {
    imuEventData[0] = 0;
    imuEventData[1] = 0;
    imuEventData[2] = 0;
    imuEventChar.setValue(imuEventData, 3);
    Serial.write(CMD_IMU_EVENT);
    Serial.write(imuEventData, 3);
    clearIMUEvents = false;
  }
  
  // Update Analog values
  for (i=0; i<=5; i++) {
    analogReadVals[i] = map(analogRead(i), 0, 1023, 0, 255);
  }
  analogReadChar.setValue(analogReadVals, 6);
  Serial.write(CMD_ANALOG_READ);
  Serial.write(analogReadVals, 6);
  
  // Update Digital values
  for (i=0; i<=12; i++) {
    if (pinModes[i] == INPUT) {
      val = digitalRead(i+2);
      if (digitalReadVals[i] != val) {
        digitalReadVals[i] = val;
        newDigitalVal = true;
      }
    }
  }
  if (newDigitalVal) {
    digitalReadChar.setValue(digitalReadVals, 12);
    Serial.write(CMD_DIGITAL_READ);
    Serial.write(digitalReadVals, 12);
    newDigitalVal = false;
  }
}
