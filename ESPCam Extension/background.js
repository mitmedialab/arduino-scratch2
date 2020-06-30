chrome.app.runtime.onLaunched.addListener(function() {


chrome.serial.getConnections(serialConnectionsRunning);

  chrome.app.window.create(
      "index.html",
      {
        innerBounds: { width: 600, height: 450, minWidth: 600, minHeight: 450}
      });
});

var devicesCount = 0;
var hidEnabled = false;
var hidConnection;
var serialConnection;
var btConnection;
var isFirst = true;
var BLEconnection = false;

var UART_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
var UART_UUID_TX = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
var txCharac;
var UART_UUID_RX = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
var rxCharac;


function serialConnectionsRunning(connections) {
    for (var i = 0; i < connections.length; i++) {
        console.log(connections[i].connectionId);
        chrome.serial.disconnect(connections[i].connectionId, function() {});
    }
}

function getCon(connections) {
    console.log(connections);
}

function initBT() {
    var devicesPaired = [];
    var msg = {};
    msg.action = 'initBT';
    chrome.bluetooth.getDevices(function(deviceInfos) {
        if (deviceInfos.length === 0) {
            console.log('No paired Bluetooth SPP devices!');
        } else {
            console.log('BT devices:' + deviceInfos.length);
            for (var c = 0; c < deviceInfos.length; c++) {
                console.log(deviceInfos[c].name);
                devicesPaired.push(deviceInfos[c]);
            }
        }
        msg.devices = devicesPaired;
        sendMessage(msg);
    });
    scanForNearbyDevices();
}

function scanForNearbyDevices() {
    chrome.bluetooth.startDiscovery(function() {
    // Stop discovery after 30 seconds.
        setTimeout(function() {
            chrome.bluetooth.stopDiscovery(function() {});
        }, 30000);
    });
    chrome.bluetooth.onDeviceAdded.addListener(function(device) {
	var devicesPaired = [];
    	var msg = {};
    	msg.action = 'initBT';
        console.log("Found BT device: " + device.name);
        devicesPaired.push(device);
        msg.devices = devicesPaired;
        sendMessage(msg);
    });
}

function initHID() {
    var msg = {};
    msg.action = 'initHID';
    chrome.hid.getDevices({
        vendorId: 0x0416,
        productId: 0xffff
    }, function(devices) {
        if (chrome.runtime.lastError) {
            console.log("Unable to enumerate devices: " +
                chrome.runtime.lastError.message);
            msg.deviceId = '';
            sendMessage(msg);
        } else {
            devicesCount = devices.length;
            console.log("HID devices:" + devicesCount);
            if (devicesCount > 0) {
                msg.deviceId = devices[0].deviceId;
                msg.productName = devices[0].productName;
                msg.devices = devices;
                sendMessage(msg);
            }
        }
    });
    if (isFirst) {
        isFirst = false;
        chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
        chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
        chrome.bluetoothSocket.onReceive.addListener(onBTReceived);
    }
}

function initSerial() {
    var msg = {};
    msg.action = 'initSerial';

    chrome.serial.getDevices(function(devices) {
        console.log("Serial devices:" + devices.length);
        for (i = 0; i < devices.length; i++) {
            console.log(devices[i].path);
        }

        if (chrome.runtime.lastError) {
            console.log("Unable to enumerate devices: " +
                chrome.runtime.lastError.message);
            sendMessage(msg);
        } else {
            msg.devices = devices;
            sendMessage(msg);
        }
    });
}

function connectBT(address) {
    console.log("Disconnect BT");
    var msg = {};
    msg.action = 'connectBT';
    chrome.bluetoothSocket.create(function(createInfo) {
        chrome.bluetoothSocket.connect(createInfo.socketId,
            address, '1101',
            function() {
                if (chrome.runtime.lastError) {
                    console.log("Connection failed: " + chrome.runtime.lastError.message);
                    msg.status = false;
                } else {
                    btConnection = createInfo.socketId;
                    msg.status = true;
                }
                sendMessage(msg);
            });
    });
}

function connectBLE(address) {
    console.log("Connect BLE");
    var msg = {};
    msg.action = 'connectBLE';
    chrome.bluetoothLowEnergy.connect(address, function() {
        if (chrome.runtime.lastError) {
            console.log("BLE Connection failed: " + chrome.runtime.lastError.message);
            msg.status = false;
        } else {
            BLEconnection = true;
            chrome.bluetoothLowEnergy.getServices(address, function(services) {
                for (var i = 0; i < services.length; i++) {
                    if (services[i].uuid == UART_UUID) {
                        console.log("Found UART service by UUID");
                        chrome.bluetoothLowEnergy.getCharacteristics(services[i].getInstanceId, function(characs) {
                            for (var c = 0; c < characs.length; c++) {
                                if (characs[c].uuid == UART_UUID_TX) {
                                    console.log("Found tx characteristic");
                                    txCharac = characs[c];
                                } else if (characs[c].uuid == UART_UUID_RX) {
                                    console.log("Found rx characteristic");
                                    rxCharac = characs[c];
                                }
                            }
                        });
                        break;
                    }
                }
            });
            msg.status = true;
        }
        sendMessage(msg);
    });
}

function connectHID(deviceId) {
    var msg = {};
    msg.action = 'connectHID';
    chrome.hid.connect(deviceId * 1, function(connectInfo) {
        if (!connectInfo) {
            msg.warn = connectInfo;
            msg.status = false;
            sendMessage(msg);
        } else {
            if (!hidConnection) {
                hidConnection = connectInfo.connectionId;
                pollForHID();
            }
            console.log("hid connected:", hidConnection);
            msg.status = true;
            sendMessage(msg);
        }
    });
}

function connectSerial(deviceId) {
    var msg = {};
    msg.action = 'connectSerial';
    chrome.serial.connect(deviceId, {
        bitrate: 115200
    }, function(connectInfo) {
        if (!connectInfo) {
            msg.warn = connectInfo;
            msg.status = false;
            sendMessage(msg);
        } else {
            if (!serialConnection) {
                serialConnection = connectInfo.connectionId;
                chrome.serial.onReceive.addListener(onSerialReceived);
            }
            console.log("serial connected:", serialConnection);
            msg.status = true;
            sendMessage(msg);
        }
    });
}

function onBTReceived(info) {
    onParseSerial(new Uint8Array(info.data));
}

function onSerialReceived(info) {
    onParseSerial(new Uint8Array(info.data));
}

function disconnectBT() {
    console.log("Disconnect BT");
    var msg = {};
    msg.action = 'connectBT';
    chrome.bluetoothSocket.disconnect(btConnection, function() {
        msg.status = false;
        btConnection = null;
        sendMessage(msg);
    });
}

function disconnectBLE(address) {
    console.log("Disconnect BLE");
    var msg = {};
    msg.action = 'connectBLE'; // RANDI should be BLE?
    chrome.bluetoothLowEnergy.disconnect(address, function() {
        msg.status = false;
        btConnection = null;
        sendMessage(msg);
    });
}

function disconnectHID(deviceId) {
    var msg = {};
    msg.action = 'connectHID';
    chrome.hid.disconnect(hidConnection, function() {
        msg.status = false;
        hidConnection = null;
        sendMessage(msg);
    });
}

function disconnectSerial(deviceId) {
    var msg = {};
    msg.action = 'connectSerial';
    chrome.serial.disconnect(serialConnection, function() {
        msg.status = false;
        serialConnection = null;
        sendMessage(msg);
    });
}

function sendMessage(msg) {
    chrome.runtime.sendMessage(msg, function(response) {
        console.log("response:", response);
    });
}

function sendBT(buffer) {
    var bytes = new Uint8Array(buffer.length);
    for (var i = 0; i < buffer.length; i++) {
        bytes[i] = buffer[i];
    }
    chrome.bluetoothSocket.send(btConnection, bytes.buffer, function(bytes_sent) {
        if (chrome.runtime.lastError) {
            console.log("Send failed: " + chrome.runtime.lastError.message);
        } else {
            console.log("Sent " + bytes_sent + " bytes");
        }
    });
}

function sendHID(buffer) {
    var len = buffer.length;
    var bytes = new Uint8Array(buffer.length + 1);
    bytes[0] = buffer.length;
    for (var i = 0; i < len; i++) {
        bytes[i + 1] = buffer[i];
    }

    console.log(bytes);
    // ui.send.disabled = true;
    chrome.hid.send(hidConnection, 0, bytes.buffer, function() {
        //   ui.send.disabled = false;
        //console.log("hid");
    });
}

function sendSerial(buffer) {
    var bytes = new Uint8Array(buffer.length);
    for (var i = 0; i < buffer.length; i++) {
        bytes[i] = buffer[i];
    }
    //console.log(bytes);
    // ui.send.disabled = true;
    if (serialConnection)  chrome.serial.send(serialConnection, bytes.buffer, function() {
    //   ui.send.disabled = false;
    });
}

function ble_send(buffer) {
    var bytes = new Uint8Array(buffer.length);
    for (var i = 0; i < buffer.length; i++) {
        bytes[i] = buffer[i];
    }
    //console.log(bytes);
    chrome.serial.send(serialConnection, bytes.buffer, function() {});
}



function pollForHID() {
    chrome.hid.receive(hidConnection, function(reportId, data) {
        onParse(new Uint8Array(data));
        setTimeout(pollForHID, 16);
    });
}

function onBTReceived(receiveInfo) {
    if (receiveInfo.socketId == btConnection) {
        onParseSerial(new Uint8Array(receiveInfo.data));
    }
}

chrome.runtime.onConnectExternal.addListener(onConnected);
chrome.runtime.onMessageExternal.addListener(onMessageExternal);
chrome.runtime.onMessage.addListener(onMessage);
//console.log(chrome.runtime.id);
function onMessage(request, sender, sendResponse) {
    if (request.action == "initSerial") {
        initSerial();
    } else if (request.action == "initHID") {
        initHID();
    } else if (request.action == "startupBLED112") {
        startupBLED112();
    } else if (request.action == "initBT") {
        initBT();
    } else if (request.action == "connectBT") {
        connectBT(request.address);
    } else if (request.action == "connectBLE") {
        connectBLE(request.address);
    } else if (request.action == "connectHID") {
        connectHID(request.deviceId * 1);
    } else if (request.action == "disconnectBT") {
        disconnectBT();
    } else if (request.action == "disconnectBLE") {
        disconnectBLE(request.address);
    } else if (request.action == "disconnectHID") {
        disconnectHID(request.deviceId * 1);
    } else if (request.action == "connectSerial") {
        connectSerial(request.deviceId);
    } else if (request.action == "disconnectSerial") {
        disconnectSerial(request.deviceId);
    } else if (request.action == "connectBLED112") {
        //console.log("AAA");
        //ble_send([0,15,6,3,207,30,18,85,194,136,0,60,0,76,0,100,0,0,0]);
        connect_ble(request.address);
    } else if (request.action == "disconnectBLED112") {
        console.log("disconnect_ble");
        ble_send([0, 1, 3, 0, connection_id]);
        BLEconnection = false;
    } else if (request.action == "scanBLED112") {
        console.log("scan_ble");
        ble_send([0, 5, 6, 7, 200, 0, 200, 0, 1]);
        setTimeout(function() {
            //  ble_send([0,1,6,2,2]);
        }, 1000);

    }

    var resp = {};
    resp.request = request;
    sendResponse(resp);
}

function onMessageExternal(request, sender, sendResponse) {
    var resp = {};
    console.log("Number of apps open: " + chrome.app.window.getAll().length);
    if(request.launch) {
      if (chrome.app.window.getAll().length == 0) { //This parameter will be passed in sendMessage method below
        chrome.app.window.create("index.html");
        resp.status = true;
        sendResponse(resp);
      } else if (serialConnection == null) {
        chrome.app.window.getAll()[0].show();
        resp.status = true;
        sendResponse(resp);
      } else {
        resp.status = true;
        sendResponse(resp);
      }
    } else if (request.close) {
      chrome.app.window.getAll()[0].close();
    } else if(hidConnection===null&&serialConnection===null&&btConnection===null){ // RANDI might have to change this
      resp.status = false;
      sendResponse(resp);
    } else{
      resp.status = true;
      sendResponse(resp);
    }
}
var currentPort = null;

function onConnected(port) {
    console.log("onConnected:", port);
    if (currentPort !== null) {
        currentPort.onMessage.removeListener(onPortMessage);
        currentPort.disconnect();
    }
    currentPort = port;
    currentPort.onMessage.addListener(onPortMessage);
}


var connection_id = 0;

function onParseSerial(buffer) {
    var msg = {};
    msg.buffer = [];
    for (var i = 0; i < buffer.length; i++) {
        msg.buffer[i] = buffer[i];
    }
    postMessage(msg);
}

function onParse(buffer) {
    if (buffer[0] > 0) {
        var msg = {};
        msg.buffer = [];
        for (var i = 0; i < buffer[0]; i++) {
            msg.buffer[i] = buffer[i + 1];
        }
        postMessage(msg);
    }
}

function postMessage(msg) {
    currentPort.postMessage(msg);
}

function onPortMessage(msg) {
    if (hidConnection) {
        sendHID(msg.buffer);
    }
    if (serialConnection) {
        sendSerial(msg.buffer);
    }
    if (btConnection) {
        sendBT(msg.buffer);
    }
}

function onDeviceAdded(device) {
    //HidDeviceInfo
    console.log("added:" + device);
    var msg = {};
    msg.action = "addHID";
    msg.deviceId = device.deviceId;
    msg.productName = device.productName;
    sendMessage(msg);
}

function onDeviceRemoved(device) {
    console.log("removed:" + device);
}
