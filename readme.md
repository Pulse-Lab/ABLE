
# Booting ABLE:

## Boot the NodeJS Controller:
On the Mac Tower, open 'Terminal' and enter:

```
cd ~/Documents/ABLE/nodejs-controller
```

then:
```
node able-server.js --pythonIP "<pythonIPAddress>" --pythonPort <pythonOSCPort> --unrealIP "<unrealIPAddress>" --unrealPort <unrealPort>
```
Note: you probably don't need to set the unrealIP or unrealPort it probably will always be 127.0.0.1 at port 8000 and these are the defaults. To see the defaults enter 'node able-server.js -h'

So just this should also work:
```
node able-server.js --pythonIP "<pythonIPAddress>" --pythonPort <pythonOSCPort>
```

(see ./nodejs-controller for more details)

## Boot SuperCollider/Audio:

Open SuperCollider and run:

```
(
~able = Able(
	motion:\walk,
	sensors:nil,
	initialMelody: Melody.new([60,64,67],Scale.major.degrees+60,mutateEvery:4),
	pythonRecvPort:10000,
	unrealIP:"127.0.0.1",
	unrealPort:8000,
	automaticMotions: false
);
~able.boot()
)
```
(see /ABLE-sound for more details)

*Note* if anything seems to be malfunctioning with SuperCollider's audio a good place to start is to reboot SuperCollider's interpreter:
Go to the Language menu and hit 'Reboot Interpreter'.

## Python:
Open PyCharm and run the Able code

## Unreal:
On the tower open the unreal project...


## Arduino
Arduino sketches are in ~/Documents/ABLE/ABLE\ Arduino\ Sketches/


# Communications (as of Sept.16)

## Bluetooth:

For testing prototype:
Left UUID: 8F65ADD512144F488A8FD32A4AB30576
Right UUID: BD871894E156403C85C7C4C31C94DFF3

(^these of course should be changed for each new unit)

Characteristic IDs:
AAAAAAAAAAAAAAAAAAAAAAAAAAAA0001 - heel pressure
AAAAAAAAAAAAAAAAAAAAAAAAAAAA0002 - toe pressure
AAAAAAAAAAAAAAAAAAAAAAAAAAAA0003 - accelerometer (x,y,z)
AAAAAAAAAAAAAAAAAAAAAAAAAAAA0004 - magnetometer (x,y,z)
AAAAAAAAAAAAAAAAAAAAAAAAAAAA0005 - gyro (x,y,z)
 (probably violating some bluetooth-best-practices with these UIDs...)

## OSC
(see ./ABLE-sound/sc=osc-tutorial.scd for an overview of the OSC protocol with practical examples)

Unreal - 127.0.0.1:8000 (by default assume it's running on same comp. as nodejs controller)
Python - 127.0.0.1:9000 (by default assume it's running on same comp. as nodejs controller)
SuperCollider - 127.0.0.1:10000
Webclient - 127.0.0:8080

## Some key messages:

Nodejs ->  Python:```/left/all```  and ```/right/all```

looks like:

```[accel.x, accel.y, accel.z, mag.x, mag.y, mag.z, gyro.x, gyro.y, gyro.z, heel, toe]```

Python -> SC, Unreal:  ```/cop/x``` and ```/cop/y```
(Instantaneous center of pressure)
