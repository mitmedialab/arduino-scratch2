var bleArray = [];
var BLEstate = false;

//clgdmbbhmdlbcgdffocenbbeclodbndh
function onRefreshHardware(){
  var msg = {};
  msg.action = "initHID";
  chrome.runtime.sendMessage(msg,function(response){
    console.log("initHID:",response);
    msg.action = "initSerial";
    chrome.runtime.sendMessage(msg,function(response){
      console.log("initSerial:",response);
    //  msg.action = "initBT";
    //  chrome.runtime.sendMessage(msg,function(response){
    //    console.log("initBT:",response);
    //  });
    });
  });

}


function startupBLED112(){
  var msg = {};
    msg.action = "startupBLED112";
    chrome.runtime.sendMessage(msg,function(response){
      console.log("startupBLED112:",response);
    });


}

function onConnectHID(){
  var msg = {};
  //msg.action = document.getElementById('connectHID').innerHTML=="Connect"?"connectHID":"disconnectHID";
  //msg.deviceId = document.getElementById('hid-device-selector').options[document.getElementById('hid-device-selector').selectedIndex].id;
  chrome.runtime.sendMessage(msg,function(response){
    console.log("hid:",response);
  });
}
function onConnectSerial(){
  var msg = {};
  msg.action = document.getElementById('connectSerial').innerHTML=="Connect"?"connectSerial":"disconnectSerial";
  msg.deviceId = document.getElementById('serial-device-selector').options[document.getElementById('serial-device-selector').selectedIndex].id;
  chrome.runtime.sendMessage(msg,function(response){
    console.log("serial:",response);

  });
}
function onOpenScratch() {
  window.open("https://machinelearningforkids.co.uk/scratchx/?url=https://mitmedialab.github.io/arduino-scratch2/Chromebook/gizmo_extension.js#scratch");
}
function onConnectBT(){
  var msg = {};
  //msg.action = document.getElementById('connectBT').innerHTML=="Connect"?"connectBT":"disconnectBT";
//  msg.address = document.getElementById('bt-device-selector').options[document.getElementById('bt-device-selector').selectedIndex].id;
  //chrome.runtime.sendMessage(msg,function(response){
  //  console.log("bt:",response);
  //});
}


function onMessage(request, sender, sendResponse){
  var option,i;
    if(request.action=="initHID"){
      if(request.deviceId!==''){
        console.log(request.devices);
        option = document.createElement('option');
        option.text = request.productName+" #"+request.deviceId;
        option.id = request.deviceId;
        //document.getElementById('hid-device-selector').options.length = 0;
        //document.getElementById('hid-device-selector').options.add(option);
      }
    }else if(request.action=="addHID"){
      if(request.deviceId!==''){
        option = document.createElement('option');
        option.text = request.productName+" #"+request.deviceId;
        option.id = request.deviceId;
      //  document.getElementById('hid-device-selector').options.add(option);
      }
    }else if(request.action=="initBT"){
      //document.getElementById('bt-device-selector').options.length = 0;
      console.log(request.devices);
      if(request.devices.length>0){


        for(i=0;i<request.devices.length;i++){
          option = document.createElement('option');
          option.text = ""+request.devices[i].name+" ( "+request.devices[i].address+" )";
          option.id = request.devices[i].address;
        //  document.getElementById('bt-device-selector').options.add(option);
        }
      }
    }else if(request.action=="initSerial"){
      document.getElementById('serial-device-selector').options.length = 0;
      if(request.devices.length>0){
        console.log(request.devices);



        for(i=0;i<request.devices.length;i++){
          option = document.createElement('option');

          if (request.devices[i].displayName == "Generic CDC")
            request.devices[i].displayName = "Arduino UNO";
          option.text = ""+request.devices[i].path+(request.devices[i].displayName?" "+request.devices[i].displayName:"");
          option.id = request.devices[i].path;

          //if (request.devices[i].displayName) {
          document.getElementById('serial-device-selector').options.add(option);
          //}

        }
      }
    }else if(request.action=="connectHID"){
      //document.getElementById('connectHID').innerHTML = request.status?'Disconnect':'Connect';
    }else if(request.action=="connectBT"){
    //  document.getElementById('connectBT').innerHTML = request.status?'Disconnect':'Connect';
    }else if(request.action=="connectSerial"){
      console.log(request.action,request);
      document.getElementById('connectSerial').innerHTML = request.status?'Disconnect':'Connect';
    }
   else if(request.action=="startupBLED112"){
    console.log(request.action,request);
    //console.log("HAAA");
    //document.getElementById('connectSerial').innerHTML = request.status?'Disconnect':'Connect';
  }
    else if (request.action=="initBLE"){
      if (bleArray.indexOf(request.device) > -1) {

} else {

  console.log("DEV: " + request.device);
  bleArray.push(request.device);
  var option_ble = document.createElement('option');
  option_ble.text = request.name; //+" P:"+request.rssi;
  option_ble.id = request.device;
  document.getElementById('ble-device-selector').options.add(option_ble);
}
    }
    else if (request.action=="BLEbutton"){
      document.getElementById('connectBLE').innerHTML = request.state;
      BLEstate = true;
    }



    var resp = {};
    resp.request = request;
    sendResponse(resp);
}
window.onload = function(){
  document.getElementById('connectSerial').addEventListener('click', onConnectSerial);
  document.getElementById('open_scratch').addEventListener('click', onOpenScratch);
  document.getElementById('refresh').addEventListener('click', onRefreshHardware);
  //document.getElementById('connectBLE').addEventListener('click', connectBLE);
  //document.getElementById('connect_ble').addEventListener('click', connectBLE);
  //document.getElementById('disconnect_ble').addEventListener('click', disconnectBLE);
  //document.getElementById('scan_ble').addEventListener('click', scanBLE);
  chrome.runtime.onMessage.addListener(onMessage);
  startupBLED112();
  onRefreshHardware();
};


function connectBLE() {

  if (BLEstate==false) {

  var msg = {};
  msg.action = "connectBLED112";
  msg.address = document.getElementById('ble-device-selector').options[document.getElementById('ble-device-selector').selectedIndex].id;
  console.log(msg.address);
  chrome.runtime.sendMessage(msg,function(response){
    console.log("BLE:",response);
  });
}
else {

  var msg = {};
  msg.action = "disconnectBLED112";
//  msg.address = document.getElementById('bt-device-selector').options[document.getElementById('bt-device-selector').selectedIndex].id;
  chrome.runtime.sendMessage(msg,function(response){
    console.log("BLE:",response);
  });
  BLEstate = false;
  document.getElementById('connectBLE').innerHTML = "Connect";

}


};

function disconnectBLE() {
  var msg = {};
  msg.action = "disconnectBLED112";
//  msg.address = document.getElementById('bt-device-selector').options[document.getElementById('bt-device-selector').selectedIndex].id;
  chrome.runtime.sendMessage(msg,function(response){
    console.log("BLE:",response);
  });
};

function scanBLE() {

document.getElementById('ble-device-selector').options.length = 0;
bleArray = [];

  var msg = {};
  msg.action = "scanBLED112";
//  msg.address = document.getElementById('bt-device-selector').options[document.getElementById('bt-device-selector').selectedIndex].id;
  chrome.runtime.sendMessage(msg,function(response){
    console.log("BLE:",response);
  });
};
