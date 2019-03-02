// LOFI Brain firmware to communicate with LOFI Robot apps and Chrome Plugin
// USB + Bluetooth version
// Author: Maciej Wojnicki
// WWW.LOFIROBOT.COM
// 28.06.2018

#include <Servo.h>

//data sending (arduino->computer) interval  
//raise it if you encouter communication jitter
const long interval = 100;

int analog1 = 0;
int analog2 = 0;
int analog3 = 0;
int analog4 = 0;

int trigPin = 8;
int echoPin = 7;
int dist;

int rightServo = 9;
int leftServo = 10;

int redLed = 11;
int greenLed = 12;

int current_byte = 0;
int prev_byte = 0;

unsigned long previousMillis = 0;
unsigned long currentMillis;

int distance_counter = 0;
int distance_reading[50];
int distance_smooth;
int smoothing = 25;


Servo serwo1;
Servo serwo2;
Servo serwo3;
Servo serwo4;

void setup() {
  Serial.begin(57600);

    
  // right servo
  pinMode(rightServo,OUTPUT);
  // left servo
  pinMode(leftServo,OUTPUT);

  // red light
  pinMode(redLed,OUTPUT);
  // green light
  pinMode(greenLed,OUTPUT);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

}

void loop() {


/*
    distance_counter += 1;
  if (distance_counter >= smoothing) {
    distance_counter = 0;

  }

  for (int i = smoothing - 1; i > 0; i--) {
    distance_reading[i] = distance_reading[i - 1];
  }
  distance_reading[0] = odleglosc();

  distance_smooth = 0;
  for (int i = 0; i < smoothing; i++) {
    distance_smooth = distance_smooth + distance_reading[i];
  }
  distance_smooth = distance_smooth / smoothing;

  */

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

//motor1
  if (prev_byte == 202) {

    if (current_byte <= 100) {
      analogWrite(rightServo,current_byte*2.35);
    }
    
    if (current_byte > 100) {
      analogWrite(rightServo,(current_byte-100)*2.35);
    }
    
  }

//motor2
  if (prev_byte == 203) {

    if (current_byte <= 100) {
      analogWrite(leftServo,current_byte*2.35);
    }
    
    if (current_byte > 100) {
      analogWrite(leftServo,(current_byte-100)*2.35);
    }
    
  }

  //output1 - red led
  if (prev_byte == 204) {
      analogWrite(redLed,current_byte*2.55);
  }
  //output2 - green led
    if (prev_byte == 205) {
      analogWrite(greenLed,current_byte*2.55);
  }

    //servo output1
    if (prev_byte == 208) {
      servo1(current_byte);
  }
      //servo output2
    if (prev_byte == 209) {
      servo2(current_byte);
  }

  if (prev_byte == 212 && current_byte == 99) {
      servo_off();
  }

    if (prev_byte == 213 && current_byte == 99) {
    all_stop();
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
serwo1.attach(rightServo);
serwo1.write(position*1.8);
//delay(5);
//serwo.detach();
}

void servo2(int position) {
serwo2.attach(leftServo);
serwo2.write(position*1.8);
//delay(5);
//serwo.detach();
}


void servo_off() {
serwo1.detach();
serwo2.detach();
}

void all_stop() {
  serwo1.detach();
  serwo2.detach();
  digitalWrite(redLed, HIGH);
  digitalWrite(greenLed, HIGH);
}

