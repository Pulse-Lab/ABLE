// imports
var noble = require('noble');
var osc = require('osc')
var nopt = require('nopt')
var http = require('http');
var express = require('express');
var WebSocket = require('ws')
var fs = require('fs')

// parse command-line options
var knownOpts = {
    "verbose": Boolean,
    "unrealIP" : [String, null],
    "unrealPort" : [Number, null],
    "pythonIP" : [String, null],
    "pythonPort" : [Number, null],
    "scIP" : [String, null],
    "scPort" : [Number, null],
    "httpPort": [Number,null],
    "help": Boolean
};

var shortHands = {
    "v" : ["--verbose"],
    "uIP" : ["--unrealIP"],
    "pIP" : ["--pythonIP"],
    "uP" : ["--unrealPort"],
    "pP" : ["--pythonPort"],
    "hP" : ["--httpPort"],
    "h" : ["--help"]
};

var parsed = nopt(knownOpts,shortHands,process.argv,2);
if(parsed['help']!=null) {
    process.stderr.write("\n");
    process.stderr.write("ABLE server.js usage:\n\n");
    process.stderr.write(" --help (-h)                    this help message.\n");
    process.stderr.write(" --verbose (-v) verbose debug messages/printing.\n\n");
    process.stderr.write(" --unrealIP    <String> (-uIP)  ip address of Unreal engine     (default: 127.0.0.1)\n");
    process.stderr.write(" --unrealPort  <Number> (-uP)   osc port of Unreal engine       (default: 8000)\n\n");
    process.stderr.write(" --pythonIP    <String> (-pIP)  ip address of python receiver   (default: 127.0.0.1)\n");
    process.stderr.write(" --pythonPort  <Number> (-pP)   osc port of python receiver     (default: 9000)\n\n");
    process.stderr.write(" --scPort  <Number> osc port of SC receiver     (default: 10000)\n");
    process.stderr.write(" --scIP    <String> ip address of SC receiver   (default: 127.0.0.1)\n\n");
    process.stderr.write(" --httpPort  <Number> (-hP)  port on which httpserver (default: 8080)\n\n");
    process.exit(1);
}



// Set up networking ips and ports.
var unrealIP = parsed["unrealIP"]?parsed["unrealIP"]:"127.0.0.1";
var unrealPort = parsed["unrealPort"]?parsed["unrealPort"]:8000;
var pythonIP = parsed["pythonIP"]?parsed["pythonIP"]:"127.0.0.1";
var pythonPort = parsed["pythonPort"]?parsed["pythonPort"]:9000;
var scIP = parsed["scIP"]?parsed["scIP"]:"127.0.0.1"
var scPort = parsed["scPort"]?parsed["scPort"]:10000
var httpPort = parsed["httpPort"]?parsed["httpPort"]:8080;

// commandline flag --verbose prints more messages (for debugging)
var verbose = parsed['verbose']!=null

// set up HTTP server
var server = http.createServer();
var expressServer = express();
var dir = __dirname+"/../web-client"
expressServer.use(express.static(dir));
console.log("serving web-client: "+dir)
server.on('request', expressServer)
server.listen(httpPort, function(){console.log("http server listening")})
var wsServer = new WebSocket.Server({server: server});

var uid =0;
var numClients=0;
var clients = {};

// Websocket server to communicate with web client
wsServer.on('connection', function(r){
  uid++;
  r.uid = uid;
  r.on('message', (x)=>onMessage(x,r));
  r.on('error', (x)=>{console.log(x)});
  r.on('close', (x)=>{console.log("connection closed")});
});

// WS onMessage handler for communicating with web client
// - currently just saves new exercises.json file
function onMessage(message, r){
  var msg
  try{
    msg = JSON.parse(message);
  } catch (e){
    console.log("WARNING: error parsing JSON message: "+e)
    return
  }
  if(msg.type =="updateExercises"){
    fs.writeFile(dir+"/build/exercises.json", JSON.stringify(msg.value), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    });
  } else {
    console.log("Warning: unrecognized message received with type: "+msg.type);
  }
}



// Set up OSC
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

// Open osc ports
pythonOsc.open();
unrealOsc.open();
scOsc.open();


// Correspond bluetooth services and characteristic uuids to their handler functions
// so:
//      bluetoothHandlers[<ble device service uid>][<ble characteristic uid>]
//         gives us the right handler function for that particualr value
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

// A list of ble characteristic uuids. "AAAA...0001" "AAA...0002", "AAA...0003" etc...
var targetCharacteristics = Object.keys(bluetoothHandlers["8F65ADD512144F488A8FD32A4AB30576"])

var frames = {
  left:{frameCount:0},
  right:{frameCount:0}
}


// Noble connection to ble:
// scanForPeripherals -> readPeripheral -> connectPeripheral -> exploreServices -> exploreCharacteristics

//  callback function for noble stateChange event:
// (ie. when bluetooth is turned on)
function scanForPeripherals(state){
  if (state === 'poweredOn') {                // if the Bluetooth radio's on,
  console.log("scanning for services:  "+Object.keys(bluetoothHandlers))


    // NOTE: some problems we've had with this 'startScanning' function:
    //  - 2nd argument (a boolean val.) allows or disallows reconnects
    //  - on debian this needs to be 'true' or it doesn't seem to want to connect
    //    - see :https://github.com/noble/noble/issues/134 - seems to be some discussion about this
    //  - on Windows and sometimes Mac, leaving this as 'true' causes it try to connect to the
    //    ble devices several times at once which causes problems...
    //  - we probably want it to be 'true' so that if ble devices run out of battery or are
    //    turned off, they can connect again without having to boot anything again on the computer

    noble.startScanning(Object.keys(bluetoothHandlers), false); // scan for service

    console.log("Started scanning");
  } else {                                    // if the radio's off,
    console.log("Bluetooth radio not responding. Ending program.");
    process.exit(0);                          // end the program
  }
}

// Called when a peripheral is discovered by Noble
function readPeripheral (peripheral) {
  console.log('discovered ' + peripheral.advertisement.localName);
  console.log('signal strength: ' + peripheral.rssi);
  console.log('device address: ' + peripheral.address);
  peripheral.connect();                    // attempt to connect to peripheral
  peripheral.on('connect', function(){connectPeripheral(peripheral)});  // read services when you connect
}

// Called when peripheral is connected to
function connectPeripheral(peripheral) {
  console.log("Connected, searching for services...")
  peripheral.discoverServices(Object.keys(bluetoothHandlers), exploreServices);
}

// Called when a peripheral's services are discovered
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

// Called when the characteristics of a ble device's service is discovered
// Subscribes to messages from the characteristic and sets the appropriate callback
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
// NOTE: if able isn't set up on this computer you can run it just as a web server
//       by commenting out the following 3 'noble.on' lines
// noble.on('stateChange', scanForPeripherals);
// noble.on('discover', readPeripheral);
// noble.on('warning', function(w){console.log("warning: "+w)});


//////////////////////////////////////////////////////////
//      PARSE and SEND BLE data to Unreal and Python    //
//////////////////////////////////////////////////////////
// 'data' referes to what the BLE devices send, 'foot' is just a string
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



// Each bluetooth message sent by the BLE devices contains an integer that indicates which
// 'frame' the values pertain to, so that instantaneous readings from the different sensors
// can be grouped together. A frame is 'full' when it contains values for each of the sensors
// corresponding to that foot. When a full frame is received over BLE, the frame is sent to python
// over OSC. The frame number is in data.frameNum. If a frame is full and the frame before it isn't,
// then it's likely a ble message was dropped somewhere, and a warning is posted to the console.
function checkAndSendFrame (data, sensor, foot){

  // 'verbose' is set with command line flag --verbose, for debugging
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
    // Check if previous frame made it through, if not post a warning and erase previous frame
    if(typeof(frames[foot][data.frameNum-1]) != "undefined"){
      console.log("WARNING: frame '" +(data.frameNum-1)+ "' dropped for: "+foot);
      frames[foot][data.frameNum-1] = undefined
    }
    var frame = frames[foot][data.frameNum]

    // Construct an osc message
    var msg = {
      address: "/"+foot+"/all",
      args:[frame.accelerometer.x, frame.accelerometer.y, frame.accelerometer.z,
            frame.mag.x, frame.mag.y, frame.mag.z,
            frame.gyro.x,frame.gyro.y,frame.gyro.z,
            frame.heel.value,
            frame.toe.value]
    }
    console.log(pythonPort);
    // Send all values to Python
    try{
      pythonOsc.send(msg);
      console.log("############################ Sent frame: "+foot+": "+frames[foot].frameCount)
    } catch (e){
      console.log("ERROR: could not send frame message over osc to python for: "+foot)
    }

    // Construct toe and heel messages and send to SC
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


///////////////////////////////////
//      Utilities                //
//////////////////////////////////

// Parsing 3 values and frameNum from a ble message
// (eg. accelerometer x,y,z and frameNum)
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

// Parse one value and frameNum
// eg. toe pressure and frameNum
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

// Frame is full if it contains values for:
// accelerometer:  x y z
// gyro:           x y z
// magnetometer:   x y z
// toe pressure:   a
// heel pressure:  a
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
