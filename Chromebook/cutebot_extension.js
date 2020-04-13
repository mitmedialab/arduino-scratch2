/* Extension using Gizmo Robot Chrome extension to communicate with micro:bit cutebot */
/* Code originally from Lofi Robot Extension */
/* Randi Williams <randiw12@mit.edu> March 2020 to work with micro:bit cutebot */
(function(ext) {

        var CHROME_EXTENSION_ID = "jpehlabbcdkiocalmhikacglppfenoeo"; // APP ID on Chrome Web Store
        var mConnection;
        var mStatus = 1;


        var msg1 = {};

        var analog1 = 0;
        var dist_read = 0;
        var left_line_found = true;
        var right_line_found = true;
        var a_pressed = false;
        var b_pressed = false;
        var recognized_speech = '';
        
		var timeout = setTimeout( function() {
			mStatus = 1;
			getAppStatus();
		}, 500);

        ext.set_output = function(rval, gval, bval) {

            var msg = {}

            msg.buffer = [204, rval];
            mConnection.postMessage(msg);

            msg.buffer = [205, gval];
            mConnection.postMessage(msg);

            msg.buffer = [206, bval];
            mConnection.postMessage(msg);

        }

        ext.rgb_off = function() {
            ext.set_rgb('off');
        }

        ext.set_rgb = function(color) {
            if (color == 'red') {
                ext.set_output(255, 0, 0);
            } else if (color == 'green') {
                ext.set_output(0, 255, 0);
            } else if (color == 'blue') {
                ext.set_output(0, 0, 255);
            } else if (color == 'white') {
                ext.set_output(255, 255, 255);
            } else if (color == 'magenta') {
                ext.set_output(255, 0, 255);
            } else if (color == 'yellow') {
                ext.set_output(255, 255, 0);
            } else if (color == 'cyan') {
                ext.set_output(0, 255, 255);
            } else if (color == 'off') {
                ext.set_output(0, 0, 0);
            } else if (color == 'random') {
                var r = Math.floor(Math.random() * 255);
                var g = Math.floor(Math.random() * 255);
                var b = Math.floor(Math.random() * 255);
                ext.set_output(r, g, b);
            }
        }

        ext.servos_off = function() {
            var msg = {};
            msg.buffer = [207, 99];
            mConnection.postMessage(msg);
        }

        ext.drive_forward = function(secs, callback) {
            var msg = {};
            msg.buffer = [208, secs];
            mConnection.postMessage(msg);

            window.setTimeout(function() {
                ext.stop_steppers(callback);
            }, secs * 1000); // RANDI - approximate how long this should take with time?
        }

        ext.drive_backward = function(secs, callback) {
            var msg = {};
            msg.buffer = [209, secs];
            mConnection.postMessage(msg);

            window.setTimeout(function() {
                ext.stop_steppers(callback);
            }, secs * 1000); // RANDI - approximate how long this should take with time?
        }

        ext.stop_steppers = function(callback) {
            var msg = {};
            msg.buffer = [207, 99];
            mConnection.postMessage(msg);
            callback();
        }

        ext.drive_left = function(secs, callback) {
            var msg = {};
            msg.buffer = [210, secs];
            mConnection.postMessage(msg);

            window.setTimeout(function() {
                ext.stop_steppers(callback);
            }, secs * 1000); // RANDI - approximate how long this should take with time?
        }

        ext.drive_right = function(secs, callback) {
            var msg = {};
            msg.buffer = [211, secs];
            mConnection.postMessage(msg);

            window.setTimeout(function() {
                ext.stop_steppers(callback);
            }, secs * 1000); // RANDI - approximate how long this should take with time?
        }


        function messageParser(buf) {

            var msg = {};
            if (buf[0] == 224) {
                msg1 = buf;
            } else if (buf[0] != 224) {
                msg1 = msg1.concat(buf);
            }

            msg.buffer = msg1;

            if (msg.buffer.length > 10) {
                msg.buffer = msg.buffer.slice(0, 10);
            }

            if (msg.buffer.length == 10) {
                if (msg.buffer[0] == 224) {
                    a_button_pressed = (Math.round(msg.buffer[1]) == 1);
                }
                if (msg.buffer[2] == 237) {
                    b_button_pressed = (Math.round(msg.buffer[3]) == 1);
                }
                if (msg.buffer[4] == 238) {
                    left_line_found = (Math.round(msg.buffer[5]) == 1);
                }
                if (msg.buffer[6] == 239) {
                    right_line_found = (Math.round(msg.buffer[7]) == 1);
                }
                if (msg.buffer[8] == 240) {
                    dist_read = Math.round(msg.buffer[9]);
                }
            }

        }

        ext.read_ultrasonic = function(input) {

            var distance = dist_read;
            if (distance == 0) {
                distance = -1;
            }

            return distance;

        }

        ext.line_status = function(side, status) {
            var found = false;
            if (side == 'right') found = right_line_found;
            if (side == 'left') found = left_line_found;
            if (side == 'both') found = (right_line_found && left_line_found);
            
            console.log("R: " + right_line_found + "L: " + left_line_found);
            if (status == 'not_found') return not_found; // else
            return found;
        }

        ext.button_status = function(side) {
            if (side == 'A') return a_button_pressed;
            if (side == 'B') return b_button_pressed;
            if (side == 'A and B') return (a_button_pressed && b_button_pressed);
            if (side == 'A or B') return (a_button_pressed || b_button_pressed);
        	console.log("A: " + a_button_pressed + "B: " + b_button_pressed);
        	return false;
        }

    /* Functions for TTS and STT. Code adapted from Sayamindu Dasgupta */

    function _get_voices() {
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
        var ret = [];
        console.log('Getting voices');
        console.log(speechSynthesis);
        var voices = speechSynthesis.getVoices();

        for (var i = 0; i < voices.length; i++) {
            ret.push(voices[i].name);
            console.log(voices.toString());
        }

        return ret;
    }

    ext.set_voice = function() {};

    ext.speak_text = function(text, callback) {
        var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function(event) {
            console.log(callback);
            if (typeof callback == "function") callback();
        };

        speechSynthesis.speak(u);
    };

    ext.recognize_speech = function(callback) {
        var recognition = new webkitSpeechRecognition();
        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                console.log(callback);
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback == "function") callback();
            }
        };
        recognition.start();
    };

    ext.recognized_speech = function() {
        return recognized_speech;
    };

    ext.ask = function(text, callback) {
        console.log(text);
        console.log(callback);
        ext.speak_text(text, ext.recognize_speech(callback));
        //if (typeof callback=="function") callback();
    };

    ext.ping_cutebot = function() {
        var msg = {};
        msg.buffer = [207, 99, 44]; //44 is ASCII comma   
        mConnection.postMessage(msg);
    };

    var descriptor = {
        blocks: [
            //[' ', 'set headlights to %m.colors', 'set_headlights', 'white'], // R, G, B decided to make both same color for simplicity
            //[' ', 'turn headlights off', 'rgb_off', 'off'], // O
            //set led icon L, lowercase letters rep icons
            //set led number L, numbers rep icons
            //set led text L, uppercase letters rep icons
            //clear led screen
            //['w', 'drive forward %n sec(s)', 'drive_forward', 1], // w
            //['w', 'drive backward %n sec(s)', 'drive_backward', 1], // s
            //['w', 'turn right %n sec(s)', 'drive_right', 1], // d
            //['w', 'turn left %n sec(s)', 'drive_left', 1], // a
            //[' ', 'stop motors', 'stop_steppers', 1], // b
            //motor speed
            //piezo song
            //piezo note
            ['r', 'read distance', 'read_ultrasonic'],
            ['b', 'line is %m.line_status on %m.line_sensors ', 'line_status', 'found', 'right'],
            ['b', '%m.button button pressed', 'button_status', 'A'],
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


    ext._getStatus = function() {
        var statusMsg;
        if (mStatus == 0) {
            statusMsg = 'Error connecting to Gizmo Robot Chrome extension. Make sure you have added the extension and that you used the correct extension ID.'
        } else if (mStatus == 1) {
            statusMsg = 'Robot is not connected. Open the Gizmo Robot extension to connect to your robot';
        } else {
            if (window.SpeechSynthesisUtterance === undefined || window.webkitSpeechRecognition === undefined) {
                mStatus = 1;
                statusMsg = 'Your browser does not support text to speech. Try using Google Chrome';
            } else {
                statusMsg = 'Ready';
            }
        }
        return {
            status: mStatus,
            msg: statusMsg
        };
    };

    ext._stop = function() {
        //ext.drive();
        ext.set_output(0, 0, 0);
        ext.servos_off();
    };

    ext._shutdown = function() {
        if (poller) poller = clearInterval(poller);
        status = false;
    }

    function getAppStatus() {
        chrome.runtime.sendMessage(CHROME_EXTENSION_ID, {
            message: "STATUS"
        }, function(response) {
            if (response === undefined) { //Chrome app not found
                CHROME_EXTENSION_ID = window.localStorage.getItem('gizmo_extension_id'); // TODO rename this
                console.log("Chrome ID: " + CHROME_EXTENSION_ID);
                if (CHROME_EXTENSION_ID === undefined || CHROME_EXTENSION_ID === "" || CHROME_EXTENSION_ID === null) {
                    CHROME_EXTENSION_ID = window.prompt("Enter the correct Chrome Extension ID", "pnjoidacmeigcdbikhgjolnadkdiegca");
                }
                mStatus = 0;
                setTimeout(getAppStatus, 1000);
            } else if (response.status === false) { //Chrome app says not connected
                mStatus = 1;
                setTimeout(getAppStatus, 1000);
            } else { // successfully connected
                if (mStatus !== 2) {
                    mConnection = chrome.runtime.connect(CHROME_EXTENSION_ID);
                    window.localStorage.setItem('gizmo_extension_id', CHROME_EXTENSION_ID); //TODO Rename this
                    mConnection.onMessage.addListener(onMsgApp);
                    mStatus = 1; // not sure why this is 1 but it works
                    setTimeout(getAppStatus, 1000);
                }
                console.log("Polling for robot");
            }
        });
    };


    function onMsgApp(msg) {
        mStatus = 2;
        var buffer = msg.buffer;

        messageParser(buffer);
        
		if(timeout) {
			clearTimeout(timeout);
			timeout = setTimeout( function() {
				mStatus = 1;
				getAppStatus();
			}, 500);
		}
    };

    getAppStatus();

    ScratchExtensions.register('micro:bit Cutebot', descriptor, ext);
})({});
