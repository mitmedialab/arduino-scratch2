// LOFI Brain firmware to communicate with LOFI Robot apps and Chrome Plugin
// USB + Bluetooth version
// Author: Maciej Wojnicki
// WWW.LOFIROBOT.COM
// 28.06.2018

#include <Servo.h>

//data sending (arduino->computer) interval  
//raise it if you encouter communication jitter
const long interval = 100;

int EnA = 6;
int EnB = 3;
int In1 = 7;
int In2 = 5;
int In3 = 4;
int In4 = 2;

int panServo = 11;

int redLED = 10; 
int greenLED = 9; 
int blueLED = 8;

int trigPin = 13;
int echoPin = 12;
int dist;

int analog1 = 0;
int analog2 = 0;
int analog3 = 0;
int analog4 = 0;


int current_byte = 0;
int prev_byte = 0;

unsigned long previousMillis = 0;
unsigned long currentMillis;

int distance_counter = 0;
int distance_reading[50];
int distance_smooth;
int smoothing = 25;


Servo serwo1;

void setup() {
  Serial.begin(57600);

    
  // servo that allows ultrasonic distance sensor to pan
  pinMode(panServo,OUTPUT);


  // All motor control pins are outputs
  pinMode(EnA, OUTPUT);
  pinMode(EnB, OUTPUT);
  pinMode(In1, OUTPUT);
  pinMode(In2, OUTPUT);
  pinMode(In3, OUTPUT);
  pinMode(In4, OUTPUT);

  // Initialize all LED pins as outputs
  pinMode(redLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(blueLED, OUTPUT);
  // Turn off all LEDs
  digitalWrite(redLED, HIGH);
  digitalWrite(greenLED, HIGH);
  digitalWrite(blueLED, HIGH);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

}

void loop() {

  currentMillis = millis();

  //receiving data from Chrome plugin
  receiving();

  // timer delay reduce data bandwidth
  if (currentMillis - previousMillis >= interval) {
    
    previousMillis = currentMillis;

    sending();

  }

}



void goBackward()   //run both motors in the same direction
{
  // turn on motor A
  digitalWrite(In1, HIGH);
  digitalWrite(In2, LOW);
  // set speed to 150 out 255
  analogWrite(EnA, 200);
  // turn on motor B
  digitalWrite(In3, HIGH);
  digitalWrite(In4, LOW);
  // set speed to 150 out 255
  analogWrite(EnB, 200);
 }

void goForward()   //run both motors in the same direction
{
  // turn on motor A
  digitalWrite(In1, LOW);
  digitalWrite(In2, HIGH);
  // set speed to 150 out 255
  analogWrite(EnA, 200);
  // turn on motor B
  digitalWrite(In3, LOW);
  digitalWrite(In4, HIGH);
  // set speed to 150 out 255
  analogWrite(EnB, 200);
}

void goLeft()   //run both motors in the same direction
{
  // turn on motor A
  digitalWrite(In1, HIGH);
  digitalWrite(In2, LOW);
  // set speed to 150 out 255
  analogWrite(EnA, 200);
  // turn on motor B
  digitalWrite(In3, LOW);
  digitalWrite(In4, HIGH);
  // set speed to 150 out 255
  analogWrite(EnB, 200);
}

void goRight()   //run both motors in the same direction
{
  // turn on motor A
  digitalWrite(In1, LOW);
  digitalWrite(In2, HIGH);
  // set speed to 150 out 255
  analogWrite(EnA, 200);
  // turn on motor B
  digitalWrite(In3, HIGH);
  digitalWrite(In4, LOW);
  // set speed to 150 out 255
  analogWrite(EnB, 200);
}

void stopMotor()
{
  // now turn off motors
  digitalWrite(In1, LOW);
  digitalWrite(In2, LOW);  
  digitalWrite(In3, LOW);
  digitalWrite(In4, LOW);

}

void setColor(int redValue, int greenValue, int blueValue)
{
  analogWrite(redLED, 255-redValue);
  analogWrite(greenLED, 255-greenValue);
  analogWrite(blueLED, 255-blueValue);
}

int odleglosc() {

  long duration, distance;
  digitalWrite(trigPin, LOW);  // Added this line
  delayMicroseconds(2); // Added this line
  digitalWrite(trigPin, HIGH);

  delayMicroseconds(5); // Added this line
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH, 5000);
  distance = (duration / 2) / 29.1;

  if (distance == 0) {
    distance = 100;
  }

  return distance;
}

void receiving() {

  // 202 - pan servo
  // 203 - driving commands

  if (Serial.available() > 0) {
  current_byte = Serial.read();
   //Serial.print(received);
  
  outputs_set();
  prev_byte = current_byte;

  }


  
}


void outputs_set() {

// TODO pan servo
  if (prev_byte == 202) {

    servo1(current_byte);
    
    /*if (current_byte > 100) {
      analogWrite(panServo,(current_byte-100)*2.35);
    }*/
    
  }

// 207 - stop 
// 208 - forward 
// 209 - backward
// 210 - left 
// 211 - right

//DC Motors
  if (prev_byte == 207) {
   Serial.println(prev_byte);
   Serial.println(current_byte);
    stopMotor();
  }
  
  else if (prev_byte == 208){
   Serial.println(prev_byte);
   Serial.println(current_byte);
    goForward();
  }
  
  else if (prev_byte == 209){
   Serial.println(prev_byte);
   Serial.println(current_byte);
    goBackward();
  }
    
  else if (prev_byte == 210){
   Serial.println(prev_byte);
   Serial.println(current_byte);
    goLeft();
  }

  else if (prev_byte == 211){
       Serial.println(prev_byte);
   Serial.println(current_byte);
    goRight();
  }

  // LEDs
  else if (prev_byte == 204) {
      analogWrite(redLED,255-current_byte);
  }
   else if (prev_byte == 205) {
      analogWrite(greenLED,255-current_byte);
  }
  else if (prev_byte == 206) {
      analogWrite(blueLED,255-current_byte);
  }

}

void sending() {

  analog1 = analogRead(0)/10.23;
  analog2 = analogRead(1)/10.23;
  analog3 = analogRead(2)/10.23;
  analog4 = analogRead(3)/10.23;
  
//[224, 115, 2, 225, 102, 4, 226, 107, 5, 227, 63, 6]
  Serial.write(224);
  Serial.write(byte(analog1));
  Serial.write(225);
  Serial.write(byte(analog2));
  Serial.write(226);
  Serial.write(byte(analog3));
  Serial.write(227);
  Serial.write(byte(analog4));

  //odleglosc();

  Serial.write(240);
  Serial.write(byte(odleglosc()));
  // last byte "i" character as a delimiter for BT2.0 on Android
  Serial.write(105);
 


}

void servo1(int potato) {
serwo1.attach(panServo);
serwo1.write(potato*1.8);
//delay(5);
//serwo.detach();
}

void servo2(int potato) {
//serwo2.attach(leftServo);
//serwo2.write(potato*1.8);
//delay(5);
//serwo.detach();
}


void servo_off() {
serwo1.detach();
//serwo2.detach();
}

void all_stop() {
  //serwo2.detach();
// CHECK ME reset pan motor?
  serwo1.detach();
  digitalWrite(redLED, HIGH);
  digitalWrite(greenLED, HIGH);
  digitalWrite(blueLED, HIGH);
  stopMotor();
}
