/* Extension sending commands to an ESP32-cam server */
/* Created by Randi Williams <randiw12@mit.edu> April 2020 */

new (function() {
    var ext = this;
    var dist_read = 0;
    var left_line_found = true;
    var right_line_found = true;
    var a_pressed = false;
    var b_pressed = false;
    const url = "http://192.168.137.80";

    ext.set_voice = function() {
    };

    ext.speak_text = function (text, callback) {
    };
    
    ext.recognize_speech = function (callback) {
    };
    
    ext.recognized_speech = function () {return recognized_speech;};

    ext.ask = function (text,callback) {
    };
    
    ext.set_headlights = function (color) {
      var cmd = "/control?var=key&val=76";
      $.get(url + cmd, function(response, status) {
        console.log(response);
        console.log(status);
      });
      cmd = "/control?var=key&val=44"; // end line with comma
      $.get(url + cmd, function(response, status) {
        console.log(response);
        console.log(status);
      });
    };
    
    ext._shutdown = function() {};

    ext._getStatus = function() {
        /*if () {
            return {status: 1, msg: 'Cannot connect to server'};
        } */
        return {status: 2, msg: 'Ready'};
    };

    var descriptor = {
        blocks: [
            [' ', 'set headlights to %m.colors', 'set_headlights', 'white'], // L 1-8
            [' ', 'turn headlights off', 'rgb_off', 'off'], // L 0
            //set led icon L, lowercase letters rep icons S 1-12 (not 11)
            //set led number L, numbers rep icons
            //set led text L, uppercase letters rep icons
            //clear led screen S 0
            //['w', 'drive forward %n sec(s)', 'drive_forward', 1], // w
            //['w', 'drive backward %n sec(s)', 'drive_backward', 1], // s
            //['w', 'turn right %n sec(s)', 'drive_right', 1], // d
            //['w', 'turn left %n sec(s)', 'drive_left', 1], // a
            //[' ', 'stop motors', 'stop_steppers', 1], // b
            //motor speed
            //piezo song
            //piezo note
            //['r', 'read distance', 'read_ultrasonic'],
            //['b', 'line is %m.line_status on %m.line_sensors ', 'line_status', 'found', 'right'],
            //['b', '%m.button button pressed', 'button_status', 'A'],
            //['w', 'speak %s', 'speak_text', 'Hello!'],
            //['w', 'listen for response', 'recognize_speech'],
            //['w', 'ask %s and wait', 'ask', 'What\'s your name?'],
            //['r', 'answer', 'recognized_speech']

        ],
        menus: {
            colors: ['red', 'green', 'blue', 'magenta', 'yellow', 'cyan', 'white', 'random'],
            line_status: ['found', 'not found'],
            line_sensors: ['right', 'left', 'both'],
            button: ['A', 'B', 'A and B', 'A or B']
        }
    };
    
    ScratchExtensions.register('ESP32-Cam', descriptor, ext);
 
})();
