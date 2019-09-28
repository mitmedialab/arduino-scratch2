// Based off of LOFI Brain firmware to communicate with LOFI Robot apps and Chrome Plugin
// USB + Bluetooth version
// Author: Randi Williams
 
//data sending (arduino->computer) interval  
//raise it if you encouter communication jitter
const long sendingInterval = 100;
unsigned long previousSend = 0;


int stepperEn = 12;
int steps_left = 0;
int stepper1a = 7;
int stepper1b = 8;
int stepper1dir = 1; // move stepper1 forward 1 or backward 0
int stepper1steps = 0;
int stepper2a = 4;
int stepper2b = 5;
int stepper2dir = 1; // move stepper2 forward 1 or backward 0
int stepper2steps = 0;
const long stepperInterval = 3;
unsigned long previousStepper = 0;

//int panServo = 8;

int redLED = 9; 
int greenLED =10; 
int blueLED = 11;

int trigPin = 2;
int echoPin = 3;

int irPin = A0;
int analog1 = 0;
int analog2 = 0;
int analog3 = 0;
int analog4 = 0;


int current_byte = 0;
int prev_byte = 0;

unsigned long currentMillis;

int distance_counter = 0;
int distance_reading[50];
int distance_smooth;
int smoothing = 25;


void setup() {
  Serial.begin(9600);


  // All motor control pins are outputs
  pinMode(stepperEn, OUTPUT);
  pinMode(stepper1a, OUTPUT);
  pinMode(stepper1b, OUTPUT);
  pinMode(stepper2a, OUTPUT);
  pinMode(stepper2b, OUTPUT);
  // stop steppers
  digitalWrite(stepperEn, HIGH);

  // Initialize all LED pins as outputs
  pinMode(redLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(blueLED, OUTPUT);
  // Turn off all LEDs
  digitalWrite(redLED, HIGH);
  digitalWrite(greenLED, HIGH);
  digitalWrite(blueLED, HIGH);

  // setup ultrasonic
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  
  // setup IR pin
  pinMode(irPin, INPUT);
}

void loop() {

  currentMillis = millis();

  //receiving data from Chrome plugin
  receiving();

  // timer delay reduce data bandwidth
  if (currentMillis - previousSend >= sendingInterval) {
    previousSend = currentMillis;
    sending();
  }

  // timer delay reduce data bandwidth
  if (currentMillis - previousStepper >= stepperInterval) {
    previousStepper = currentMillis;
    if (steps_left > 0) {
      updateSteppers();
      steps_left--;
    }
  }

}

void updateSteppers(){
    switch(stepper1steps){
    case 0:
       digitalWrite(stepper1a, LOW); 
       digitalWrite(stepper1b, LOW);
     break; 
     case 1:
       digitalWrite(stepper1a, LOW); 
       digitalWrite(stepper1b, HIGH);
     break; 
     case 2:
       digitalWrite(stepper1a, HIGH); 
       digitalWrite(stepper1b, LOW);
     break; 
     case 3:
       digitalWrite(stepper1a, HIGH); 
       digitalWrite(stepper1b, HIGH);
     break;
     default:
       digitalWrite(stepperEn, HIGH); 
     break; 
    }

    switch(stepper2steps){
    case 0:
       digitalWrite(stepper2a, LOW); 
       digitalWrite(stepper2b, LOW);
     break; 
     case 1:
       digitalWrite(stepper2a, LOW); 
       digitalWrite(stepper2b, HIGH);
     break; 
     case 2:
       digitalWrite(stepper2a, HIGH); 
       digitalWrite(stepper2b, LOW);
     break; 
     case 3:
       digitalWrite(stepper2a, HIGH); 
       digitalWrite(stepper2b, HIGH);
     break;
     default:
       digitalWrite(stepperEn, HIGH); 
     break; 
    }

  // set direction keeps the loop going
  setMotorDirection();
} 

// ugliest code ever
void setMotorDirection() {
  // increment the steps based on the direction we are going
  if(stepper1dir==1){ stepper1steps++;}
  if(stepper1dir==0){ stepper1steps--; }
  // stepper 2 is opposite of stepper 1
  if(stepper2dir==1){ stepper2steps++;}
  if(stepper2dir==0){ stepper2steps--; }

  // loop the steps around
  if(stepper1steps>3){stepper1steps=0;}
  if(stepper1steps<0){stepper1steps=3; }
  if(stepper2steps>3){stepper2steps=0;}
  if(stepper2steps<0){stepper2steps=3; }
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

  // 207 - stop 
  // 208 - forward 
  // 209 - backward
  // 210 - left 
  // 211 - right
  
  //Motor directions
  if (prev_byte == 207) {
    stopMotor();
  } else if (prev_byte == 208){
    steps_left = current_byte*512;
    goForward();
  } else if (prev_byte == 209){
    steps_left = current_byte*512;
    goBackward();
  } else if (prev_byte == 210){
    steps_left = current_byte*512;
   goLeft();
  } else if (prev_byte == 211){
    steps_left = current_byte*512;
    goRight();
  }

  // LEDs
  else if (prev_byte == 204) {
      analogWrite(redLED,255-current_byte);
  } else if (prev_byte == 205) {
      analogWrite(greenLED,255-current_byte);
  } else if (prev_byte == 206) {
      analogWrite(blueLED,255-current_byte);
  }
}

void stopMotor() {
  digitalWrite(stepperEn, HIGH);
}

void goBackward() {  //run both motors in the same direction
  // enable steppers
  digitalWrite(stepperEn, LOW);
  // turn on motor A
  stepper1dir = 0;
  // turn on motor B
  stepper2dir = 0;
 }

void goForward() {  //run both motors in the same direction
  // enable steppers
  digitalWrite(stepperEn, LOW);
  // turn on motor A
  stepper1dir = 1;
  // turn on motor B
  stepper2dir = 1;
}

void goLeft() {  //run both motors in the same direction
  // enable steppers
  digitalWrite(stepperEn, LOW);
  // turn on motor A
  stepper1dir = 0;
  // turn on motor B
  stepper2dir = 1;
}

void goRight() {  //run both motors in the same direction
  // enable steppers
  digitalWrite(stepperEn, LOW);
  // turn on motor A
  stepper1dir = 1;
  // turn on motor B
  stepper2dir = 0;
}

void sending() {

  analog1 = digitalRead(irPin);
  analog2 = analogRead(1)/10.23;
  analog3 = analogRead(2)/10.23;
  analog4 = analogRead(3)/10.23;
  
  Serial.write(224);
  Serial.write(byte(analog1));
  Serial.write(225);
  Serial.write(byte(steps_left));
  Serial.write(226);
  Serial.write(byte(analog3));
  Serial.write(227);
  Serial.write(byte(analog4));


  Serial.write(240);
  Serial.write(byte(odleglosc()));
  // last byte "i" character as a delimiter for BT2.0 on Android
  Serial.write(105);
 


}

void all_stop() {
  digitalWrite(redLED, HIGH);
  digitalWrite(greenLED, HIGH);
  digitalWrite(blueLED, HIGH);
  stopMotor();
}
