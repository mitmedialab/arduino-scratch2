var bleArray = [];
var BLEstate = false;
var deviceAddresses = [];


function isDuplicateDevice(newAddress) {
    for (var i=0; i<deviceAddresses.length;i++) {
	if (deviceAddresses[i] == newAddress)
	    return true;
    }
    return false;
}
function onRefreshHardware() {
    if (document.getElementById('device-selector') !== null) {
        document.getElementById('device-selector').options.length = 0;
	deviceAddresses = [];
    }
    var msg = {};
    msg.action = "initHID";
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("initHID:", response);
        msg.action = "initSerial";
        chrome.runtime.sendMessage(msg, function(response) {
            console.log("initSerial:", response);
            msg.action = "initBT";
            chrome.runtime.sendMessage(msg, function(response) {
                console.log("initBT:", response);
            });
        });
    });

}

function onConnectHID() {
    var msg = {};
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("hid:", response);
    });
}

function onConnect() {
    var type = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].class;
    if (type == "bt") {
        onConnectBT();
    } else if (type == "serial") {
        onConnectSerial();
    } else if (type == "ble") {
        onConnectBLE();
    }
}

function onConnectSerial() {
    var msg = {};
    msg.action = document.getElementById('connectSerialButton').innerHTML == "Connect" ? "connectSerial" : "disconnectSerial";
    document.getElementById('connectSerialButton').innerHTML = 'Connecting...';
    msg.deviceId = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("serial:", response);

    });
}

function onOpenScratch() {
    window.open("https://machinelearningforkids.co.uk/scratchx/?url=https://mitmedialab.github.io/arduino-scratch2/Chromebook/cutebot_extension.js#scratch");
}

function onOpenScratch3() {
    window.open("https://mitmedialab.github.io/prg-extension-boilerplate/btrobot/");
}

function onConnectBT() {
    var msg = {};
    msg.action = document.getElementById('connectSerialButton').innerHTML == "Connect" ? "connectBT" : "disconnectBT";
    document.getElementById('connectSerialButton').innerHTML = 'Connecting...';
    msg.address = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        if (response === undefined) {
            document.getElementById('connectSerialButton').innerHTML = 'Connect';
            console.log(chrome.runtime.lastError.message);
        }
        console.log("bt:", response);
    });
}

function onConnectBLE() {
    var msg = {};
    msg.action = document.getElementById('connectSerialButton').innerHTML == "Connect" ? "connectBLE" : "disconnectBLE";
    document.getElementById('connectSerialButton').innerHTML = 'Connecting...';
    msg.address = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        if (response === undefined) {
            document.getElementById('connectSerialButton').innerHTML = 'Connect';
            console.log(chrome.runtime.lastError.message);
        }
        console.log("ble:", response);
    });
}

async function caller(_url) {
	return fetch(_url).then(response => {
		return response.json();
	})
	.catch(function(err) {
	  console.log('Error with fetch: ', err);
	});
}

async function onConnectWS() {
    var msg = {};
    msg.action = document.getElementById('connectWebsocketButton').innerHTML == "Connect" ? "connectWebsocket" : "disconnectWebsocket";
    document.getElementById('connectWebsocketButton').innerHTML = 'Connecting...';
    // RANDI come finish
    robotName = document.getElementById('robot-name').value.toUpperCase();
    if (robotName != "" && robotName != null && robotName != undefined) {
    	// make firebase request for ip_address of robot
		var ip_url = "https://robot-cam.firebaseio.com/ip_addresses/" + robotName + ".json";
		msg.deviceId = await caller(ip_url);
		chrome.runtime.sendMessage(msg, function(response) {
		    console.log("OnConnectWS:", response);
		});
	} else {
	    document.getElementById('connectWebsocketButton').innerHTML = 'Connect';
	}
}

function onOpenTab(evt) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(evt.target.name).style.display = "block";
  evt.target.className += " active";
}


function onMessage(request, sender, sendResponse) {
    var option, i;
    if (request.action == "initHID") {
        if (request.deviceId !== '') {
            console.log(request.devices);
            option = document.createElement('option');
            option.text = request.productName + " #" + request.deviceId;
            option.id = request.deviceId;
            //document.getElementById('hid-device-selector').options.length = 0;
            //document.getElementById('hid-device-selector').options.add(option);
        }
    } else if (request.action == "addHID") {
        if (request.deviceId !== '') {
            option = document.createElement('option');
            option.text = request.productName + " #" + request.deviceId;
            option.id = request.deviceId;
            //  document.getElementById('hid-device-selector').options.add(option);
        }
    } else if (request.action == "initBT") {
        console.log(request.devices);
        if (request.devices.length > 0) {
            for (i = 0; i < request.devices.length; i++) {
		var device = request.devices[i];
		if (!isDuplicateDevice(device.address)) {
                option = document.createElement('option');
                if (device.name === 'BT04-A' || device.name === 'HC-05') {
                    option.text = "Gizmo Bluetooth Robot ( " + device.name + " )";
                } else {
                    option.text = "" + device.name + " ( " + device.address + " )";
                }
                option.id = device.address;
                if (device.name.startsWith('BBC micro:bit')) {
                    option.class = "ble";
                    console.log("ble device: " + device.name);
                } else {
                    option.class = "bt";
                    console.log("bt device: " + device.name);
                }
                document.getElementById('device-selector').options.add(option);
		deviceAddresses.push(device.address);
		}
            }
        }
    } else if (request.action == "initSerial") {
        if (request.devices.length > 0) {
            console.log(request.devices);



            for (i = 0; i < request.devices.length; i++) {
                option = document.createElement('option');

                if (request.devices[i].displayName == "Generic CDC")
                    request.devices[i].displayName = "Arduino UNO";
                option.text = "" + request.devices[i].path + (request.devices[i].displayName ? " " + request.devices[i].displayName : "");
                option.id = request.devices[i].path;
                option.class = "serial";
                document.getElementById('device-selector').options.add(option);

            }
        }
    } else if (request.action.startsWith("connect")) {
        console.log("Got a connect response");
        if (request.action == "connectWS") {
	        document.getElementById('connectWebsocketButton').innerHTML = request.status ? 'Disconnect' : 'Connect';
        } else {
	        document.getElementById('connectSerialButton').innerHTML = request.status ? 'Disconnect' : 'Connect';
	    }
	} else if (request.action == "startupBLED112") {
        console.log(request.action, request);
    } else if (request.action == "initBLE") {
        if (bleArray.indexOf(request.device) > -1) {

        } else {

            console.log("DEV: " + request.device);
            bleArray.push(request.device);
            var option_ble = document.createElement('option');
            option_ble.text = request.name;
            option_ble.id = request.device;
            document.getElementById('ble-device-selector').options.add(option_ble);
        }
    }


    var resp = {};
    resp.request = request;
    sendResponse(resp);
}
window.onload = function() {
    var tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
    	tablinks[i].addEventListener('click', onOpenTab);
  	}
    document.getElementById('connectWebsocketButton').addEventListener('click', onConnectWS);
    document.getElementById('connectSerialButton').addEventListener('click', onConnect);
    document.getElementById('open_scratch').addEventListener('click', onOpenScratch);
    document.getElementById('open_scratch3').addEventListener('click', onOpenScratch3);
    document.getElementById('open_scratch31').addEventListener('click', onOpenScratch3);
    document.getElementById('refresh').addEventListener('click', onRefreshHardware);
    chrome.runtime.onMessage.addListener(onMessage);
    onRefreshHardware();
};
