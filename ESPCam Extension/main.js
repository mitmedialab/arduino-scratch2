var bleArray = [];
var BLEstate = false;
var deviceAddresses = [];
var robotName;


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
    msg.action = "initSerial";
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("initSerial:", response);
        msg.action = "initBT";
        chrome.runtime.sendMessage(msg, function(response) {
            console.log("initBT:", response);
        });
    });
}

// TODO figure out why this doesn't work
function onRetrieveRobotName() {
	var prevRobotName = 
	chrome.storage.local.get(['last-robot-name'], function(result) {
          prevRobotName = result.key;
          console.log(result);
    });
    console.log(prevRobotName);
	if (prevRobotName != null && prevRobotName != undefined && prevRobotName != "") {
		console.log("Loading last working robot name: " + prevRobotName);
		document.getElementById('robot-name').value = prevRobotName;
	}
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

function onConnectSerial() {
    var msg = {};
    msg.action = document.getElementById('connectSerialButton').innerHTML == "Connect" ? "connectSerial" : "disconnectSerial";
    document.getElementById('connectSerialButton').innerHTML = 'Connecting...';
    msg.deviceId = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("serial:", response);

    });
}

function onOpenScratch3() {
//  TODO  window.open("https://mitmedialab.github.io/prg-extension-boilerplate/robotdemo/");
    window.open("localhost:8601");
}

function onConnectBT() {
    var msg = {};
    msg.action = document.getElementById('connectButton').innerHTML == "Connect" ? "connectBT" : "disconnectBT";
    document.getElementById('connectButton').innerHTML = 'Connecting...';
    msg.address = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        if (response === undefined) {
            document.getElementById('connectButton').innerHTML = 'Connect';
            console.log(chrome.runtime.lastError.message);
        }
        console.log("bt:", response);
    });
}

function onConnectBLE() {
    var msg = {};
    msg.action = document.getElementById('connectButton').innerHTML == "Connect" ? "connectBLE" : "disconnectBLE";
    document.getElementById('connectButton').innerHTML = 'Connecting...';
    msg.address = document.getElementById('device-selector').options[document.getElementById('device-selector').selectedIndex].id;
    chrome.runtime.sendMessage(msg, function(response) {
        if (response === undefined) {
            document.getElementById('connectButton').innerHTML = 'Connect';
            console.log(chrome.runtime.lastError.message);
        }
        console.log("ble:", response);
    });
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
	        // Save this robot for future use
	        if (request.status) {
	        	console.log("Saving this robot name because it worked: " + robotName);
	        	chrome.storage.local.set({'last-robot-name':robotName}, function() {	});
	        }
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
    document.getElementById('connectWebsocketButton').addEventListener('click', onConnectWS);
    document.getElementById('connectSerialButton').addEventListener('click', onConnect);
    document.getElementById('open_scratch3').addEventListener('click', onOpenScratch3);
    document.getElementById('refresh').addEventListener('click', onRefreshHardware);
    chrome.runtime.onMessage.addListener(onMessage);
    onRefreshHardware();
    onRetrieveRobotName();
};
