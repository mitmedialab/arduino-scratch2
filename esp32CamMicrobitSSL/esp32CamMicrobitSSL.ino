/** ESP32-Cam Web Robot Project
  * 2019 - Gord Payne
  * 2020 - Modified by Randi Williams to work with Tinybit robot
  * This project creates an HTTPS server to stream video, receive
  * commands, and communicate serially with an external device i.e.
  * a Microbit robot. SSL works really slowly on ESP32 so this is 
  * basically nonfunctional.
  * The IP address for the robot is saved to a firebase server to
  * make it easy to retrieve the IP by its robot name.
 **/

// Abbreviated ESP32 Camera with Web server
// This is an abbreviated / modified version of the ESP32 Camera sketch provided by the manufacturer, Espressif
#include "esp_camera.h"
#include <WiFiManager.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Select camera model
//#define CAMERA_MODEL_M5STACK_NO_PSRAM
#define CAMERA_MODEL_AI_THINKER //(RANDI, first ESPcam you ordered)


#include <Ticker.h>
Ticker ticker;

#if defined(CAMERA_MODEL_M5STACK_NO_PSRAM)
  #define ESP_LED 16
  #define ESP_POWER 2
#endif
#if defined(CAMERA_MODEL_AI_THINKER)
  #define ESP_LED 4
  //#define ESP_POWER 2
#endif

#include "camera_pins.h"

String ROBOT_ID = "PAM"; // don't forget to edit line 162

#include "FirebaseESP32.h"
String FIREBASE_HOST = "robot-cam.firebaseio.com"; //Change to your Firebase RTDB project ID e.g. Your_Project_ID.firebaseio.com
String FIREBASE_AUTH = ""; //Change to your Firebase RTDB secret password
FirebaseData firebaseData;
String path = "/ip_addresses";

byte currentByte;
byte prevByte;
int cmdCount;
int prevCmdCount;

void startCameraServer();
int getCommand();
int getCategory();
int getDirection();
int pollForCommand();
void setDistance(int);
void setAButton(int);
void setBButton(int);
void setLeftLine(int);
void setRightLine(int);

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  #if defined(ESP_POWER)
  if (digitalRead(ESP_POWER) == LOW) {
      ESP.deepSleep(0);
  }
  #endif
 
  #if defined(ESP_LED)  
    pinMode(ESP_LED, OUTPUT);
    digitalWrite(ESP_LED, LOW);
    ticker.attach(0.6, toggleLED);
  #endif
  
  Serial.begin(115200);
  bool debug = true;  // RANDI make true while testing
  Serial.setDebugOutput(debug);
  if (debug) {
    Serial.println();
  }

  cmdCount = 0;
  prevCmdCount = 0;

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  //init with high specs to pre-allocate larger buffers
  if (psramFound()) {
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

#if defined(CAMERA_MODEL_ESP_EYE)
  pinMode(13, INPUT_PULLUP);
  pinMode(14, INPUT_PULLUP);
#endif

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t * s = esp_camera_sensor_get();
  //initial sensors are flipped vertically and colors are a bit saturated
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);//flip it back
    s->set_brightness(s, 1);//up the brightness just a bit
    s->set_saturation(s, -2);//lower the saturation
  }
  //drop down frame size for higher initial frame rate
  s->set_framesize(s, FRAMESIZE_QVGA);

  #if defined(CAMERA_MODEL_M5STACK_WIDE)
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
  #endif
  
  #if defined(CAMERA_MODEL_M5STACK_NO_PSRAM) // RANDI this camera model needs image to be flipped
    s->set_vflip(s, 1);
  #endif



  // Locally initialize the wifi manager
  if (debug) {
   Serial.println("Initialzing WiFiManager");
  }
  WiFiManager wifiManager;
  //wifiManager.resetSettings(); // RANDI comment when done testing
  wifiManager.setDebugOutput(debug);
  //set callback that gets called when connecting to previous WiFi fails, and enters Access Point mode
  #if defined(ESP_LED)
    wifiManager.setAPCallback(configCallback); // RANDI seemed to cause issues
  #endif

  // RANDI give robots custom hostname?
  wifiManager.setTimeout(180); // 3 minute time limit to connect

  // If it cannot connect, then just go to sleep
  if (debug) {
    Serial.println("Creating local AP");
  }
  if(!wifiManager.autoConnect(("ROBOT_CAM_" + ROBOT_ID).c_str())) { // AP name should contain the robot ID
    digitalWrite(ESP_LED, LOW);
    Serial.println("WiFi failed to connect");
    delay(3000);
    //put ESP into deep sleep to preserve battery
    ESP.deepSleep(0);
    delay(5000); // RANDI why is this here?
  } 

  
  

  // if you get to this point, you're connected!
  #if defined(ESP_LED) // RANDI turn on LED indicator
    ticker.detach();
    digitalWrite(ESP_LED, HIGH);
  #endif

  
  Serial.println(WiFi.localIP().toString());
  Serial.println(WiFi.getHostname());
  startCameraServer();

  // setup Firebase
  if (debug) {
    Serial.println("Setup firebase");
  }
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(false);

  // send ip address to database
  if (debug) {
    Serial.println("Set ip address");
  }
  if (!Firebase.setString(firebaseData, path + "/" + ROBOT_ID, WiFi.localIP().toString()) && debug) {
    Serial.println("Could not send IP to firebase");
    Serial.println("REASON: " + firebaseData.errorReason());
    Serial.println();
  }

  // Blink robot lights so we know we're ready
  /*for (int i=0; i<2; i++) {
    Serial.write(cat);// send byte to Arduino for motor control
    Serial.write(cmd);
    Serial.write(10); // newline
    delay(100);
    Serial.write(cat);// send byte to Arduino for motor control
    Serial.write(cmd);
    Serial.write(10); // newline
    delay(100);
  }*/

}
void loop() {
  #if defined(ESP_POWER)
  if (digitalRead(ESP_POWER) != HIGH) {
    ESP.deepSleep(0);
  }
  #endif
  
  while (Serial.available() > 0) { // RANDI not sure this is working correctly
    //Serial.println("Incoming");
    currentByte = Serial.read();
    updateSensorReadings();
    prevByte = currentByte;
  }
  cmdCount = pollForCommand();
  if (cmdCount != prevCmdCount) {
    char cat = char(getCategory()); // poll for latest direction key value
    char cmd = char(getCommand());
    
    Serial.write(cat);// send byte to Arduino for motor control
    Serial.write(cmd);
    Serial.write(10); // newline
    
    //char dir = char(getDirection());
    //Serial.write(dir);
    //http://192.168.137.112/control?var=rcmd&val=76&cmd=48
    //http://192.168.137.112/status
  }
  prevCmdCount = cmdCount;
  
  delay(50);
}

void configCallback(WiFiManager *wm) {
  ticker.attach(0.2, toggleLED);
}

void toggleLED() {
  #if defined(ESP_LED)
    int state = digitalRead(ESP_LED);
    digitalWrite(ESP_LED, !state);
  #endif
}
void updateSensorReadings() {
  if (prevByte == 224) {
    setAButton((int) currentByte);
  } else if (prevByte == 237) {
    setBButton((int) currentByte);
  } else if (prevByte == 238) {
    setLeftLine((int) currentByte);
  } else if (prevByte == 239) {
    setRightLine((int) currentByte);
  } else if (prevByte == 240) {
    setDistance((int) currentByte);
  }
}
