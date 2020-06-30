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
    msg.action = document.getElementById('connectButton').innerHTML == "Connect" ? "connectSerial" : "disconnectSerial";
    document.getElementById('connectButton').innerHTML = 'Connecting...';
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
        document.getElementById('connectButton').innerHTML = request.status ? 'Disconnect' : 'Connect';
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
    document.getElementById('connectButton').addEventListener('click', onConnect);
    document.getElementById('open_scratch').addEventListener('click', onOpenScratch);
    document.getElementById('open_scratch3').addEventListener('click', onOpenScratch3);
    document.getElementById('refresh').addEventListener('click', onRefreshHardware);
    chrome.runtime.onMessage.addListener(onMessage);
    onRefreshHardware();
};
