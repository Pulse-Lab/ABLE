
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

## Boot SuperCollider/Audio:

Open SuperCollider and run:

```
(
~able = Able.new(
	motion:\stand,       // initial motion
	copX: AbleSensor.new([0],"none",-0.5,0.5,historySize:20),
	copY: AbleSensor.new([0],"none",-0.5,0.5,historySize:20),
	leftDisplacement: AbleSensor.new([0],"left",-0.5,0.5,20),
	rightDisplacement:AbleSensor.new([0],"right",-0.5,0.5,20),
	scale: Scale.major.degrees+60,
	initialMelody: Melody.new([60,64,67],Scale.major.degrees+60,4),
	pythonRecvPort:10000  //Change this to the Port Python sends to
);
~able.boot();
)
```

*Note* if anything seems to be malfunctioning with SuperCollider's audio a good place to start is to recompile the class library:
Go to the Language menu and hit 'recompile class library'.

## Python:
Open Pycharm and run the Able code

## Unreal:
On the tower open the unreal project at ~/Desktop/Able_1.0 and run


## Arduino
Arduino sketches are in ~/Documents/ABLE/ABLE\ Arduino\ Sketches/
