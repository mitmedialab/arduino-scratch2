// LOFI Brain firmware to communicate with LOFI Robot apps and Chrome Plugin
// USB + Bluetooth version
// Author: Maciej Wojnicki
// WWW.LOFIROBOT.COM
// 28.06.2018

#include <Servo.h>

//data sending (arduino->computer) interval  
//raise it if you encouter communication jitter
const long interval = 200;

int analog1 = 0;
int analog2 = 0;
int analog3 = 0;
int analog4 = 0;


int trigPin = 2;
int echoPin = 3;
int dist;

int stepper1a = 4;
int stepper1b = 5;
int stepper2a = 7;
int stepper2b = 8;
int stepperen = 12; 

int servoPin = 6;
int arm_up = 0;

int redLed = 9;
int greenLed = 10;
int blueLed = 11;

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
  serwo1.attach(servoPin);
  
  // red light
  pinMode(redLed,OUTPUT);
  digitalWrite(redLed, HIGH);
  // green light
  pinMode(greenLed,OUTPUT);
  digitalWrite(greenLed, HIGH);
  // blue light
  pinMode(blueLed,OUTPUT);
  digitalWrite(blueLed, HIGH);
  
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



int odleglosc() {

  long duration, distance;
  digitalWrite(trigPin, LOW);  // Added this line
  delayMicroseconds(5); // Added this line
  
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10); // Added this line
  
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distance = (duration / 2) / 29.1;

  if (distance == 0) {
    distance = 100;
  }


  //Serial.println(distance);
  
  return distance;
}

void receiving() {

  // 202 - motor1
  // 203 - motor2

  if (Serial.available() > 0) {
  current_byte = Serial.read();
   //Serial.print(recieved);
  
  outputs_set();
  prev_byte = current_byte;

  }


  
}


void outputs_set() {

  //servo arm
  if (prev_byte == 208) {
    if (current_byte == 0) {
      serwo1.write(0);
    } else {
      serwo1.write(120);
    }
    /*if (arm_up == 0) {
      serwo1.write(0);
      arm_up = 1;
    } else {
      serwo1.write(180);
      arm_up = 0;
    }*/
  }
  
  // this isn't called anywhere in js code
  if (prev_byte == 213 && current_byte == 99) {
    all_stop();
  }


  //output1 - red led
  if (prev_byte == 204) {
      analogWrite(redLed,255-current_byte);
  }
  //output2 - green led
    if (prev_byte == 205) {
      analogWrite(greenLed,255-current_byte);
  }
  //output3 - blue led
    if (prev_byte == 206) {
      analogWrite(blueLed,255-current_byte);
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

void servo1(int position) {
  serwo1.write(position*1.8);
}

void all_stop() {
  digitalWrite(redLed, HIGH);
  digitalWrite(greenLed, HIGH);
  digitalWrite(blueLed, HIGH);
}

