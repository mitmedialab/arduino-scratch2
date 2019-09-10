chrome.app.runtime.onLaunched.addListener(function() {


chrome.serial.getConnections(serialConnectionsRunning);

  chrome.app.window.create(
      "index.html",
      {
        innerBounds: { width: 600, height: 450, minWidth: 600, minHeight: 450}
      });
});
//console.log("init");
var devicesCount = 0;
var hidEnabled = false;
var hidConnection;
var serialConnection;
var btConnection;
var isFirst = true;
var BLEconnection = false;



function serialConnectionsRunning(connections) {
  BLEconnection = false;
  for (var i = 0; i<connections.length; i++) {
  console.log(connections[i].connectionId);
  chrome.serial.disconnect(connections[i].connectionId, function(){});
  }
};

function getCon(connections) {
    console.log(connections);
}

function initBT(){
  var msg = {};
  msg.action = 'initBT';
  chrome.bluetooth.getDevices(function (deviceInfos){
    console.log(deviceInfos);
    msg.devices = deviceInfos;
    sendMessage(msg);
  });

}
function initHID(){
  var msg = {};
  msg.action = 'initHID';
  chrome.hid.getDevices({vendorId:0x0416,productId:0xffff},function(devices){
    if (chrome.runtime.lastError) {
      console.log("Unable to enumerate devices: " +
                    chrome.runtime.lastError.message);
      msg.deviceId = '';
      sendMessage(msg);
    }else{
      devicesCount = devices.length;
      console.log("HID devices:" + devicesCount);
      if(devicesCount>0){
        msg.deviceId = devices[0].deviceId;
        msg.productName = devices[0].productName;
        msg.devices = devices;
        sendMessage(msg);
      }
    }
  });
  if(isFirst){
    isFirst = false;
    chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
    chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
    chrome.bluetoothSocket.onReceive.addListener(onBTReceived);
  }
}
function initSerial(){
  var msg = {};
  msg.action = 'initSerial';
  chrome.serial.getDevices(function(devices){


function uniq(a, param){
    return a.filter(function(item, pos, array){
        return array.map(function(mapItem){ return mapItem[param]; }).indexOf(item[param]) === pos;
    })
}


//var cleanDevices = uniq(devices, 'displayName');

    if (chrome.runtime.lastError) {
      console.log("Unable to enumerate devices: " +
                    chrome.runtime.lastError.message);
      //msg.devices = [];
      sendMessage(msg);
    }else{
      msg.devices = devices;
      sendMessage(msg);
    }
  });
}


function startupBLED112(){
  var msg = {};

  chrome.serial.getDevices(function(devices){

    console.log(devices);

    for (i=0; i<devices.length; i++) {

      console.log(devices[i].productId);

      if (devices[i].productId == 1 && devices[i].vendorId == 9304 ) {
        console.log("bled_detected");

        chrome.serial.connect(devices[i].path, {bitrate: 9600}, function(connectInfo) {
              if (!connectInfo) {
                msg.action = 'not_startupBLED112';
                msg.warn = connectInfo;
                msg.status = false;
                sendMessage(msg);
                console.log("ble_error");
              }else{
                if(!serialConnection){

                  serialConnection = connectInfo.connectionId;
                  chrome.serial.onReceive.addListener(onSerialReceived);
                }
                serialConnection = connectInfo.connectionId;
                console.log("serial connected:",serialConnection);
                msg.action = 'startupBLED112';
                msg.status = true;
                sendMessage(msg);
                console.log("bled_connected");
              }
            });





            break;

      }
    }

  });
}


function connectBT(address){
  var msg = {};
  msg.action = 'connectBT';
  chrome.bluetoothSocket.create(function(createInfo) {
  chrome.bluetoothSocket.connect(createInfo.socketId,
    address, '1101', function(){
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

function onBTReceived(info){
  onParseSerial(new Uint8Array(info.data));
}
function connectHID(deviceId){
  var msg = {};
  msg.action = 'connectHID';
  chrome.hid.connect(deviceId*1, function(connectInfo) {
        if (!connectInfo) {
          msg.warn = connectInfo;
          msg.status = false;
          sendMessage(msg);
        }else{
          if(!hidConnection){
            hidConnection = connectInfo.connectionId;
            pollForHID();
          }
          console.log("hid connected:",hidConnection);
          msg.status = true;
          sendMessage(msg);
        }
      });
}
function connectSerial(deviceId){
  var msg = {};
  msg.action = 'connectSerial';
  chrome.serial.connect(deviceId, {bitrate: 9600}, function(connectInfo) {
        if (!connectInfo) {
          msg.warn = connectInfo;
          msg.status = false;
          sendMessage(msg);
        }else{
          if(!serialConnection){
            serialConnection = connectInfo.connectionId;
            chrome.serial.onReceive.addListener(onSerialReceived);
          }
          console.log("serial connected:",serialConnection);
          msg.status = true;
          sendMessage(msg);
        }
      });
}
function onSerialReceived(info){
  onParseSerial(new Uint8Array(info.data));
}
function disconnectBT(){
  var msg = {};
  msg.action = 'connectBT';
  chrome.bluetoothSocket.disconnect(btConnection, function (){
          msg.status = false;
          btConnection = null;
          sendMessage(msg);
  });
}
function disconnectHID(deviceId){
  var msg = {};
  msg.action = 'connectHID';
  chrome.hid.disconnect(hidConnection, function() {
          msg.status = false;
          hidConnection = null;
          sendMessage(msg);
      });
}
function disconnectSerial(deviceId){
  var msg = {};
  msg.action = 'connectSerial';
  chrome.serial.disconnect(serialConnection, function() {
          msg.status = false;
          serialConnection = null;
          sendMessage(msg);
      });
}
function sendMessage(msg){
  chrome.runtime.sendMessage(msg,function(response){
    //console.log("response:",response);
  });
}
function sendBT(buffer){
  var bytes = new Uint8Array(buffer.length);
  for(var i=0;i<buffer.length;i++){
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
function sendHID(buffer){


  var len = buffer.length;
    var bytes = new Uint8Array(buffer.length+1);
        bytes[0] = buffer.length;
        for(var i=0;i<len;i++){
          bytes[i+1] = buffer[i];
        }


    console.log(bytes);
    // ui.send.disabled = true;
    chrome.hid.send(hidConnection, 0, bytes.buffer, function() {
    //   ui.send.disabled = false;
    //console.log("hid");
    });
}
function sendSerial(buffer){
    var bytes = new Uint8Array(buffer.length);
    for(var i=0;i<buffer.length;i++){
      bytes[i] = buffer[i];
    }
    //console.log(bytes);
    // ui.send.disabled = true;
    chrome.serial.send(serialConnection, bytes.buffer, function() {
    //   ui.send.disabled = false;
    });
}

function ble_send(buffer){
    var bytes = new Uint8Array(buffer.length);
    for(var i=0;i<buffer.length;i++){
      bytes[i] = buffer[i];
    }
    //console.log(bytes);
    chrome.serial.send(serialConnection, bytes.buffer, function() {
    });
}



//ble_send([0,1,6,2,2]);

///00050607c800c80001

///00 05 06 07 c8 00 c8 00 01

0,5,6,7,200,0,200,0,1



//set param
//ble_send([0,5,6,7,200,0,200,0,1])

//set scan paratmeters

//odpowiedź BLE z nazwą
//80240600bd0059174e48912000ff1902010609ff484d2091484e1759071600b0000000000302e0ff





function pollForHID(){
  chrome.hid.receive(hidConnection, function(reportId, data) {
      onParse(new Uint8Array(data));
      setTimeout(pollForHID, 16);
    });
}
function onBTReceived(receiveInfo) {
  if (receiveInfo.socketId == btConnection){
    onParseSerial(new Uint8Array(receiveInfo.data));
  }

}
chrome.runtime.onConnectExternal.addListener(onConnected);
chrome.runtime.onMessageExternal.addListener(onMessageExternal);
chrome.runtime.onMessage.addListener(onMessage);
//console.log(chrome.runtime.id);
function onMessage(request, sender, sendResponse) {
  if(request.action=="initSerial"){
    initSerial();
  }else if(request.action=="initHID"){
    initHID();
  }else if(request.action=="startupBLED112"){
    startupBLED112();
  }else if(request.action=="initBT"){
    initBT();
  }else if(request.action=="connectBT"){
    connectBT(request.address);
  }else if(request.action=="connectHID"){
    connectHID(request.deviceId*1);
  }else if(request.action=="disconnectBT"){
    disconnectBT();
  }else if(request.action=="disconnectHID"){
    disconnectHID(request.deviceId*1);
  }else if(request.action=="connectSerial"){
    connectSerial(request.deviceId);
  }else if(request.action=="disconnectSerial"){
    disconnectSerial(request.deviceId);
  }
  else if (request.action == "connectBLED112"){
    //console.log("AAA");
    //ble_send([0,15,6,3,207,30,18,85,194,136,0,60,0,76,0,100,0,0,0]);
    connect_ble(request.address);
  }
  else if (request.action == "disconnectBLED112"){
    console.log("disconnect_ble");
    ble_send([0,1,3,0,connection_id]);
    BLEconnection = false;
  }
  else if (request.action == "scanBLED112"){
    console.log("scan_ble");
    ble_send([0,5,6,7,200,0,200,0,1]);
    setTimeout(function(){
    //  ble_send([0,1,6,2,2]);
    }, 1000);

  }

  var resp = {};
  resp.request = request;
  sendResponse(resp);
}
function onMessageExternal(request, sender, sendResponse) {
    var resp = {};
    if(hidConnection===null&&serialConnection===null&&btConnection===null){
      resp.status = false;
      sendResponse(resp);
    }else{
      resp.status = true;
      sendResponse(resp);
    }
}
var currentPort = null;
function onConnected(port){
  console.log("onConnected:",port);
  if(currentPort!==null){
    currentPort.onMessage.removeListener(onPortMessage);
    currentPort.disconnect();
  }
  currentPort = port;
  currentPort.onMessage.addListener(onPortMessage);
}


var connection_id = 0;

function onParseSerial(buffer){
    var msg = {};
    msg.buffer = [];
    for(var i=0;i<buffer.length;i++){
      msg.buffer[i] = buffer[i];
    }

    //console.log(msg.buffer);

    //[0, 3, 6, 3, 0, 0, 2]

    if (msg.buffer[2]==6 && msg.buffer[3]==7) {
        ble_send([0,1,6,2,2]);
        console.log("scanning");
    }

    if (msg.buffer[1]==16 && msg.buffer[2]==3){
      if(msg.buffer.length==20 && BLEconnection == false){
        connection_id = msg.buffer[4]
        console.log("connectionID = "+connection_id);

        if (msg.buffer[19]==255) {
          BLEconnection = true;
          console.log("conn: "+BLEconnection);

          var msg = {};
          msg.action = 'BLEbutton';
          //msg.device = macString;
          msg.state = "Disconnect";
          sendMessage(msg);


          }

      }
    }

    if (msg.buffer[0]==128 && msg.buffer[2]==6){
    //  console.log(msg.buffer);
      if (msg.buffer[17]==76 && msg.buffer[18]==79) {

        var msg2 = {};
        var macString = "";
        msg2.buffer = [];
        for(var i=6;i<12;i++){
          msg2.buffer[i-6] = buffer[i];
          macString += ":"+ buffer[i];
          if(i==11) {
            macString = macString.substr(1);
          }
        }
        //console.log(macString);


        var name = "";
        for (var i=17; i<29; i++) {
          if (buffer[i]!=0)
          name = name+String.fromCharCode(buffer[i]);
        }

        var msg = {};
        msg.action = 'initBLE';
        msg.device = macString;
        //console.log(macString);
        msg.rssi = buffer[4];
        msg.name = name;
        sendMessage(msg);
        //console.log(name);

      }

    }

    if (msg.buffer[0]==128 && msg.buffer[2]==4){
      //ramka odpowiedzi czujniki
      //  [128, 16, 4, 5, 1, 18, 0, 1, 11, 224, 0, 225, 9, 226, 13, 227, 16, 240, 100, 105]

      var msg2 = {};
      msg2.buffer = [];
      for(var i=0;i<buffer.length-9;i++){
        msg2.buffer[i] = buffer[i+9];
      }
      //var msg2 = msg.buffer.slice(9,msg.buffer.length);
      postMessage(msg2);
    }
    else {
      postMessage(msg);
    }





}
function onParse(buffer){
  if(buffer[0]>0){
    var msg = {};
    msg.buffer = [];
    for(var i=0;i<buffer[0];i++){
      msg.buffer[i] = buffer[i+1];
    }
    postMessage(msg);
  }
}
function postMessage(msg){
  currentPort.postMessage(msg);
}
function onPortMessage(msg){
  if(hidConnection){
    sendHID(msg.buffer);
  }
  if(serialConnection){
  //  console.log(msg.buffer);
  if (BLEconnection == true) {
    if (msg.buffer.length == 2) {
    sendSerial([0,6,4,6,connection_id,18,0,2,msg.buffer[0],msg.buffer[1]]);
    }
    if (msg.buffer.length == 5) {
    //  console.log(msg.buffer);
    sendSerial([0,9,4,6,connection_id,18,0,5,msg.buffer[0],msg.buffer[1],msg.buffer[2],msg.buffer[3],msg.buffer[4]]);
    }
  }
  else {
    sendSerial(msg.buffer);
  }

  }

  if(btConnection){
    sendBT(msg.buffer);
  }
}
function onDeviceAdded(device){
  //HidDeviceInfo
  console.log("added:"+device);
  var msg = {};
  msg.action = "addHID";
  msg.deviceId = device.deviceId;
  msg.productName = device.productName;
  sendMessage(msg);
}
function onDeviceRemoved(device){
  console.log("removed:"+device);
}


function connect_ble(address) {


var addr = address.split(":");
//console.log(addr);
  if (BLEconnection == false){
    ble_send([0,15,6,3,addr[0],addr[1],addr[2],addr[3],addr[4],addr[5],0,60,0,76,0,100,0,0,0]);
  }
}
