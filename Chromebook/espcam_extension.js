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
    const _colors = ['red', 'green', 'blue', 'magenta', 'yellow', 'cyan', 'white', 'random'];
    const _icons = ['heart', 'check', 'X', 'smile', 'frown', 'ghost', 'triangle', 'diamond', 'square', 'checkers', 'note'];
    
    ext.speak_text = function (text, callback) {
    };
    
    ext.recognize_speech = function (callback) {
    };
    
    ext.recognized_speech = function () {return recognized_speech;};
    
    /*
    fetch("https://192.168.137.80/control?var=key&val=49")// 49 becomes '1'
      .then(response => {
        console.log("request finished");
      })

      cmd = "/control?var=key&val=76"; // send 'L'
      $.get(url + cmd, function(response, status) {
        console.log(response);
        console.log(status);
      });

    */
    
    ext.set_headlights = function (color) {
      var cmd = "/control?var=rcmd&val=76&cmd="; // send 'L'
      if (color == "off") {
        cmd += '48';
      } else {
        var color_cmd = _colors.indexOf(color) + 49;
        cmd += color_cmd.toString();
      }
      $.get(url + cmd, function(response, status) {
        console.log('set_headlights: ' + status);
        console.log('\t' + cmd + ', ' + color);
      });
    };
    
    ext.set_screen = function (icon) {
      var cmd = "/control?var=rcmd&val=83&cmd="; // send 'S'
      if (icon == "off") {
        cmd += '48';
      } else if (icon == "checkers") {
          cmd += '65';
      } else if (icon == "note") {
          cmd += '66';
      } else {
        var icon_cmd = _icons.indexOf(icon) + 49;
        cmd += color_cmd.toString();
      }
      $.get(url + cmd, function(response, status) {
        console.log('set_screen: ' + status);
        console.log('\t' + cmd + ', ' + icon);
      });
    };
    
    ext.drive_motors = function (secs) {
      var cmd = "/control?var=rcmd&val=68&cmd=49"; // send 'D1'
      $.get(url + cmd, function(response, status) {
        console.log('drive_forward: ' + status);
        console.log('\t' + cmd + ', ' + icon);
      });
        
      setTimeout( stop_motors(), secs*1000);
    };
    
    ext.stop_motors = function () {
      var cmd = "/control?var=rcmd&val=68&cmd=48"; // send 'D0'
      $.get(url + cmd, function(response, status) {
        console.log('stop_motors: ' + status);
        console.log('\t' + cmd + ', ' + icon);
      });
    };
    
    ext._shutdown = function() {};

    ext._getStatus = function() {
      var cmd = "/status"; // send 'L'
      var stat = 0;
      $.get(url + cmd, function(response, status) {
        console.log('_getStatus: ' + status);
        stat = status;
      });
      /*if (stat == 0) {
        return {status: 0, msg: 'Cannot connect to server'};
      } else if (stat == 1) {
        return {status: 1, msg: 'Cannot connect to robot server'};   
      } else {*/
      return {status: 2, msg: 'Ready'};
      //}
    };

    var descriptor = {
        blocks: [
            [' ', 'set headlights to %m.colors', 'set_headlights', 'white'], // L 1-8
            [' ', 'turn headlights off', 'set_headlights', 'off'], // L 0
            [' ', 'display LED symbol %m.icons', 'set_screen', 'heart'], // S 1-B
            [' ', 'turn LED screen off', 'set_screen', 'off'], // S 0
            //set led number L, numbers rep icons
            //set led text L, uppercase letters rep icons
            ['w', 'drive forward %n sec(s)', 'drive_motors', 1, 'f'], // D 1
            //['w', 'drive backward %n sec(s)', 'drive_motors', 1], // D 2
            //['w', 'turn left %n sec(s)', 'drive_motors', 1], // D 4
            //['w', 'turn right %n sec(s)', 'drive_right', 1], // D 3
            [' ', 'stop motors', 'stop_motors'], // D 0
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
            colors: _colors,
            icons: _icons,
            line_status: ['found', 'not found'],
            line_sensors: ['right', 'left', 'both'],
            button: ['A', 'B', 'A and B', 'A or B']
        }
    };
    
    ScratchExtensions.register('ESP32-Cam', descriptor, ext);
 
})();
