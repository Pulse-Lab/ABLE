// imports
var noble = require('noble');
var osc = require('osc')
var nopt = require('nopt')


// parse command-line options
var knownOpts = {
    "unrealIP" : [String, null],
    "unrealPort" : [Number, null],
    "pythonIP" : [String, null],
    "pythonPort" : [Number, null],
    "help": Boolean
};

var shortHands = {
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


// Set up osc

var unrealIP = parsed["unrealIP"]?parsed["unrealIP"]:"127.0.0.1";
var unrealPort = parsed["unrealPort"]?parsed["unrealPort"]:8000;
var pythonIP = parsed["pythonIP"]?parsed["pythonIP"]:"127.0.0.1";
var pythonPort = parsed["pythonPort"]?parsed["pythonPort"]:9000;

var unrealOsc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 8001, //? this won't be receiving osc back at all..
  remoteAddress: unrealIP,
  remotePort: unrealPort
});

var dataProcessingOsc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 8004, // this node program shouldn't be receiving osc back at all
  remoteAddress: pythonIP,
  remotePort: pythonPort
});

dataProcessingOsc.open();
unrealOsc.open();

// Correspond bluetooth services and characteristic uuids to their handler functions
var bluetoothHandlers = {
  "8F65ADD512144F488A8FD32A4AB30576":{
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0001":(x)=>heel(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0002":(x)=>toe(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0003":(x)=>accelerometer(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0004":(x)=>mag(x,"left"),
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0005":(x)=>gyro(x,"left")
  },
  "BD871894E156403C85C7C4C31C94DFF3":{
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0001":function(data){heel(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0002":function(data){toe(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0003":function(data){accelerometer(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0004":function(data){mag(data,"right")},
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAA0005":function(data){gyro(data,"right")}
  }
}

var targetCharacteristics = Object.keys(bluetoothHandlers["8F65ADD512144F488A8FD32A4AB30576"])

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
      services[i].discoverCharacteristics(targetCharacteristics, function(error, characteristics){exploreCharacteristics(error, characteristics, services[i])})
    }
  }
}

function exploreCharacteristics(error, characteristics, parentService){
  if(parentService && parentService.uuid){
  console.log("________________________________________")
  // console.log(characteristics)
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




// the service/characteristic explore function:
function explore(error, services, characteristics) {
  // list the services and characteristics found:
  console.log('error: '+ error)
  console.log('services: ' + services);
  console.log('characteristics: ' + characteristics);
}


// Scan for peripherals with the camera service UUID:
noble.on('stateChange', scanForPeripherals);
noble.on('discover', readPeripheral);
noble.on('warning', function(w){console.log("warning: "+w)});






// Parsing functions

function accelerometer (data, sensor){
  console.log("Accelerometer: ")
  var msg;
  try {
    var x = data.readIntBE(0,2);
    var y = data.readIntBE(2,2);
    var z = data.readIntBE(4,2);
    console.log("x: "+x)
    console.log("y: "+y)
    console.log("z: "+z)
    msg = {
      address:"/"+sensor+"/accelerometer",
      args: [x,y,z]
    }
  } catch (e){
    console.log("error parsing: "+e)
  }
  try{
    unrealOsc.send(msg)
  } catch (e){
    console.log("Error sending osc: "+e)
  }
}

function gyro (data, sensor){
  console.log("Gyro: ")
  var msg;
  // Parse message from BLE
  try {
    var x = data.readIntBE(0,2);
    var y = data.readIntBE(2,2);
    var z = data.readIntBE(4,2);
    console.log("x: "+x)
    console.log("y: "+y)
    console.log("z: "+z)
    msg = {
      address:"/"+sensor+"/gyro",
      args: [x,y,z]
    }
  } catch (e){
    console.log("error parsing: "+e)
  }
  // Send OSC to unreal
  try{
    unrealOsc.send(msg)
  } catch (e){
    console.log("Error sending osc: "+e)
  }
}

function mag (data, sensor){
  console.log("Mag: ")
  var msg;
  try {
    var x = data.readIntBE(0,2);
    var y = data.readIntBE(2,2);
    var z = data.readIntBE(4,2);
    console.log("x: "+x)
    console.log("y: "+y)
    console.log("z: "+z)
    msg = {
      address:"/"+sensor+"/mag",
      args: [x,y,z]
    }
  } catch (e){
    console.log("error parsing: "+e)
  }

  // Send OSC to unreal
  try{
    unrealOsc.send(msg)
  } catch (e){
    console.log("Error sending osc: "+e)
  }
}

function heel (data, sensor){
  console.log("Heel: ")
  try{
    var parsedData = data.readIntLE(0,2);
    console.log("   "+parsedData)
    msg = {
      address:"/"+sensor+"/heel",
      args: [parsedData]
    }
  } catch (e){
    console.log("error parsing: "+e)
  }

  // Send OSC to unreal
  try{
    unrealOsc.send(msg)
  } catch (e){
    console.log("Error sending osc: "+e)
  }
}

function toe (data, sensor){
  console.log("Toe: ")
  try {
    var parsedData = data.readIntLE(0,2);
    console.log("   "+parsedData)
    msg = {
      address:"/"+sensor+"/toe",
      args: [parsedData]
    }
  } catch (e){
    console.log("Error parsing ble: "+e)
  }

  try {
    unrealOsc.send(msg)
  } catch (e){
    console.log("Error sending osc: "+e)
  }
}
