/* Extension using the JavaScript Speech API for text to speech */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, April 2014 */

new (function() {
    var ext = this;
    var recognized_speech = '';

    function _get_voices() {
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
        var ret = [];
        console.log('Getting voices');
        console.log(speechSynthesis);
        var voices = speechSynthesis.getVoices();
        
        for(var i = 0; i < voices.length; i++ ) {
            ret.push(voices[i].name);
            console.log(voices.toString());
        }

        return ret;
    }

    ext.set_voice = function() {
    };

    ext.speak_text = function (text, callback) {
        var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function(event) {
            if (typeof callback=="function") callback();
        };
        
        speechSynthesis.speak(u);
    };
    
    ext.recognize_speech = function (callback) {
        var recognition = new webkitSpeechRecognition();
        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback=="function") callback();
            }
        };
        recognition.start();
    };
    
    ext.recognized_speech = function () {return recognized_speech;};

    ext.ask = function (text,callback) {
        speak_text(text, recognize_speech(callback));
        //if (typeof callback=="function") callback();
    };
    
    ext._shutdown = function() {};

    ext._getStatus = function() {
        if (window.SpeechSynthesisUtterance === undefined) {
            return {status: 1, msg: 'Your browser does not support text to speech. Try using Google Chrome or Safari.'};
        } else if (window.webkitSpeechRecognition === undefined) {
            return {status: 1, msg: 'Your browser does not support speech recognition. Try using Google Chrome.'};
        }
        return {status: 2, msg: 'Ready'};
    };

    var descriptor = {
        blocks: [
            //['', 'set voice to %m.voices', 'set_voice', ''],
            //['w', 'wait and recognize speech', 'recognize_speech'],
            ['w', 'speak %s', 'speak_text', 'Hello!'],
            ['w', 'ask %s and wait', 'ask', 'What\'s your name?'],
            ['r', 'answer', 'recognized_speech']
        ]/*,
        menus: {
            voices: _get_voices(),
        },*/
    };

    ScratchExtensions.register('Text to Speech', descriptor, ext);
})();
