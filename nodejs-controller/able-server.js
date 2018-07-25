// imports
var noble = require('noble');
var osc = require('osc')
var nopt = require('nopt')


// parse command-line options
var knownOpts = {
    "verbose": Boolean,
    "unrealIP" : [String, null],
    "unrealPort" : [Number, null],
    "pythonIP" : [String, null],
    "pythonPort" : [Number, null],
    "scIP" : [String, null],
    "scPort" : [Number, null],
    "help": Boolean
};

var shortHands = {
    "v" : ["--verbose"],
    "uIP" : ["--unrealIP"],
    "pIP" : ["--pythonIP"],
    "uP" : ["--unrealPort"],
    "pP" : ["--pythonPort"],
    "h" : ["--help"]
};

var parsed = nopt(knownOpts,shortHands,process.argv,2);
if(parsed['help']!=null) {
    process.stderr.write("\n");
    process.stderr.write("ABLE server.js usage:\n\n");
    process.stderr.write(" --help (-h)                    this help message\n");
    process.stderr.write(" --unrealIP    <String> (-uIP)  ip address of Unreal engine     (default: 127.0.0.1)\n");
    process.stderr.write(" --unrealPort  <String> (-uP)   osc port of Unreal engine       (default: 8000)\n");
    process.stderr.write(" --pythonIP    <String> (-pIP)  ip address of python receiver   (default: 127.0.0.1)\n");
    process.stderr.write(" --pythonPort  <String> (-pP)   osc port of python receiver     (default: 9000)\n\n");
    process.exit(1);
}

var verbose = parsed['verbose']!=null


// Set up osc

var unrealIP = parsed["unrealIP"]?parsed["unrealIP"]:"127.0.0.1";
var unrealPort = parsed["unrealPort"]?parsed["unrealPort"]:8000;
var pythonIP = parsed["pythonIP"]?parsed["pythonIP"]:"127.0.0.1";
var pythonPort = parsed["pythonPort"]?parsed["pythonPort"]:9000;
var scIP = parsed["scIP"]?parsed["scIP"]:"127.0.0.1"
var scPort = parsed["scPort"]?parsed["scPort"]:10000



var unrealOsc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 8001, //? this won't be receiving osc back at all..
  remoteAddress: unrealIP,
  remotePort: unrealPort
});

var pythonOsc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 8002, // this node program shouldn't be receiving osc back at all
  remoteAddress: pythonIP,
  remotePort: pythonPort
});

var scOsc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 10002, // this node program shouldn't be receiving osc back at all
  remoteAddress: scIP,
  remotePort: scPort
})

pythonOsc.open();
unrealOsc.open();
scOsc.open();


// Correspond bluetooth services and characteristic uuids to their handler functions
var bluetoothHandlers = {
  // Left UUID
  "8F65ADD512144F488A8FD32A4AB30576":{
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0001":(x)=>heel(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0002":(x)=>toe(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0003":(x)=>accelerometer(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0004":(x)=>mag(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0005":(x)=>gyro(x,"left")
  },
  // Right UUID;
  "BD871894E156403C85C7C4C31C94DFF3":{
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0001":function(data){heel(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0002":function(data){toe(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0003":function(data){accelerometer(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0004":function(data){mag(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0005":function(data){gyro(data,"right")}
  }
}

var targetCharacteristics = Object.keys(bluetoothHandlers["8F65ADD512144F488A8FD32A4AB30576"])

var frames = {
  left:{frameCount:0},
  right:{frameCount:0}
}

//  callback function for noble stateChange event:
function scanForPeripherals(state){
  if (state === 'poweredOn') {                // if the Bluetooth radio's on,
    // noble.startScanning(['1cbffaa8b17d11e680f576304dec7eb7'], false); // scan for service
    // NOTE - for some reason this needs to be 'true' or on debian it won't discover the bluefruit's advertisement
    // see :https://github.com/noble/noble/issues/134  - seems to be another fix if don't want this to be true...
    // TODO - We really want it to be 'true', but the same bluetooth device
    //        connects twice immediately and clogs services being read on Mac Pro
    // noble.startScanning(['1800'], false); // scan for service
    console.log("scanning for services:  "+Object.keys(bluetoothHandlers))
    noble.startScanning(Object.keys(bluetoothHandlers), false); // scan for service

    console.log("Started scanning");
  } else {                                    // if the radio's off,
    console.log("Bluetooth radio not responding. Ending program.");
    process.exit(0);                          // end the program
  }
}

// callback function for noble discover event:
function readPeripheral (peripheral) {

  console.log('discovered ' + peripheral.advertisement.localName);
  console.log('signal strength: ' + peripheral.rssi);
  console.log('device address: ' + peripheral.address);
  peripheral.connect();                    // attempt to connect to peripheral
  peripheral.on('connect', function(){readServices(peripheral)});  // read services when you connect
}


// the readServices function:
function readServices(peripheral) {
  console.log("Connected, searching for services...")
  peripheral.discoverServices(Object.keys(bluetoothHandlers), exploreServices);
}


function exploreServices(error, services, peripheral){
  if (error){
    console.log("ERROR: "+e)
  } else{
    console.log("services: "+services)
    for (i in services){
      services[i].discoverCharacteristics(targetCharacteristics,
        function(error, characteristics){
          exploreCharacteristics(error, characteristics, services[i])
        }
      )
    }
  }
}


function exploreCharacteristics(error, characteristics, parentService){
  if(parentService && parentService.uuid){
    console.log("________________________________________")
    console.log("########################"+parentService.uuid)
    console.log("Found the following characteristics under service: "+parentService.uuid)
    for (i in characteristics){
      console.log('- '+ characteristics[i])
      characteristics[i].subscribe();
      characteristics[i].on('data', bluetoothHandlers[parentService.uuid.toUpperCase()][characteristics[i].uuid.toUpperCase()])
    }
    console.log("________________________________________")
  } else{
    console.log("################## characteristics without parent service found. char uuid: "+ characteristics)
  }
}

// Scan for peripherals with the camera service UUID:
noble.on('stateChange', scanForPeripherals);
noble.on('discover', readPeripheral);
noble.on('warning', function(w){console.log("warning: "+w)});


// PARSE and SEND BLE data to Unreal and Python
// 'data' referes to what the BLE devices send, 'sensor' is just a string
// with either 'left' or 'right'
function accelerometer (data, foot){
  var parsedData = parseXYZ(data);
  checkAndSendFrame(parsedData, "accelerometer", foot)
}

function mag (data, foot){
  var parsedData = parseXYZ(data);
  checkAndSendFrame(parsedData, "mag", foot)
}

function gyro (data,foot){
  var parsedData = parseXYZ(data);
  checkAndSendFrame(parsedData, "gyro", foot)
}

function heel (data, foot){
  var parsedData = parseOne(data)
  checkAndSendFrame(parsedData, "heel", foot);
}

function toe (data, foot){
  var parsedData = parseOne(data)
  checkAndSendFrame(parsedData, "toe", foot);
}

function checkAndSendFrame (data, sensor, foot){
  if (verbose){
    var str = "";
    for (var i in data){
      str = str+"  "+i+": "+data[i]
    }
    console.log(foot+"  "+sensor+"  "+str)
  }

  // If this is the first entry to this frame
  if (isUndefined(frames[foot][data.frameNum])){
    frames[foot][data.frameNum] = {}
  }

  // enter frame data to that foot's dictionary for that frame
  frames[foot][data.frameNum][sensor] = data;

  // If the frame is full, check to make sure the last one has already been sent
  //   if it isn't, issue a 'dropped frame' warning and send the newly completed
  //   frame
  if(frameIsFull(frames[foot][data.frameNum])){
    if(typeof(frames[foot][data.frameNum-1]) != "undefined"){
      console.log("WARNING: frame '" +(data.frameNum-1)+ "' dropped for: "+foot);
      frames[foot][data.frameNum-1] = undefined
    }
    var frame = frames[foot][data.frameNum]
    var msg = {
      address: "/"+foot+"/all",
      args:[frame.accelerometer.x, frame.accelerometer.y, frame.accelerometer.z,
            frame.mag.x, frame.mag.y, frame.mag.z,
            frame.gyro.x,frame.gyro.y,frame.gyro.z,
            frame.heel.value,
            frame.toe.value]
    }
    console.log(pythonPort);
    try{
      pythonOsc.send(msg);
      console.log("############################ Sent frame: "+foot+": "+frames[foot].frameCount)
    } catch (e){
      console.log("ERROR: could not send frame message over osc to python for: "+foot)
    }


    var toe = {
      address: "/"+foot+"/toe",
      args:[frame.toe.value]
    }

    try{
      console.log(toe)
      scOsc.send(toe);
    } catch(e){
      console.log("ERRROR couldn't send to sc osc :S: "+e)
    }

    var heel = {
      address: "/"+foot+"/heel",
      args:[frame.heel.value]
    }

    try{
      console.log(heel)
      scOsc.send(heel);
    } catch(e){
      console.log("ERRROR couldn't send to sc osc :S: "+e)
    }


    frames[foot].frameCount++;
    frames[foot][data.frameNum]=undefined
  }
}




// Utilities
function parseXYZ (data){
  try{
    var x = data.readIntBE(0,2);
    var y = data.readIntBE(2,2);
    var z = data.readIntBE(4,2);
    var frameNum = data.readIntBE(6,2);
    return {x:x,y:y,z:z,frameNum:frameNum}
  } catch (e){
    return undefined
  }
}

function parseOne(data){
  try {
    var parsedData = data.readIntBE(0,2);
    var frameNum = data.readIntBE(2,2);
    return {value:parsedData,frameNum:frameNum}
  } catch (e){
    console.log("WARNING: Unable to parse single ble data");
    return undefined
  }
}

function frameIsFull (obj){
  var accelFull = isUndefined(obj.accelerometer)?false:xyzExists(obj.accelerometer);
  var gyroFull = isUndefined(obj.gyro)?false:xyzExists(obj.gyro)
  var magFull = isUndefined(obj.mag)?false:xyzExists(obj.mag);
  return accelFull && gyroFull && magFull && (!isUndefined(obj.heel)) && (!isUndefined(obj.toe))
}

function xyzExists (obj){
  return (!isUndefined(obj.x)) && (!isUndefined(obj.y)) && (!isUndefined(obj.z))
}

function isUndefined(a){
  return typeof(a) =="undefined"
}


// Handy for printing things only every few times
var everyXPrintYCounter = 0;
function everyXPrintY(x,y){
  everyXPrintY++;
  if(everyXPrintYCounter>=x){
    console.log(y);
    everyXPrintYCounter=0;
  }
}
