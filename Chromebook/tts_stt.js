/* Extension using the JavaScript Speech API for text to speech */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, April 2014 */

new (function() {
    var ext = this;
    var recognized_speech = '';
    var voice_list = [];

    async function _get_voices() {
        voice_list = [];
        console.log('Getting voices');
        var voices = await speechSynthesis.getVoices();
        console.log(voices.toString());
        for(var i = 0; i < voices.length; i++ ) {
            voice_list.push(voices[i].name);
        }

        return voice_list;
    }

    ext.set_voice = function() {
    };

    ext.speak_text = function (text, callback) {
        var u = new SpeechSynthesisUtterance(text.toString());
        u.onend = function(event) {
            console.log(callback);
            if (typeof callback=="function") callback();
        };
        
        speechSynthesis.speak(u);
    };
    
    ext.recognize_speech = function (callback) {
        var recognition = new webkitSpeechRecognition();
        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                console.log(callback);
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback=="function") callback();
            }
        };
        recognition.start();
    };
    
    ext.recognized_speech = function () {return recognized_speech;};

    ext.ask = function (text,callback) {
        console.log(text);
        console.log(callback);
        ext.speak_text(text, ext.recognize_speech(callback));
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
            ['', 'set voice to %m.voices', 'set_voice', ''],
            ['w', 'speak %s', 'speak_text', 'Hello!'],
            ['w', 'ask %s and wait', 'ask', 'What\'s your name?'],
            ['r', 'answer', 'recognized_speech']
        ],
        menus: {
            voices:  voice_list,
        }
    };
    
    _get_voices();
    ScratchExtensions.register('Text to Speech', descriptor, ext);
})();
