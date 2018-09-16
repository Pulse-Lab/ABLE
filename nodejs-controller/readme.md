# Able-server

Nodejs program to both handle BLE and serve the web client.
Receives and parses BLE messages from bluefruit devices and sends them to Python, SuperCollider and Unreal. Serves the web-client for selecting which exercise to do + prescribing exercises. These are 2 pretty separate things so maybe they should be different modules - we've kept them together so there's just one less thing to have to boot (and make sure is still running).

# Installation
Follow noble installation instructions at: https://github.com/noble/noble

```npm install```
(looks up dependencies listed in package.json and installs them to ./node_modules)

# Running

```node able-server.js```

Commandline flags:

--help (-h)                    this help message.
--verbose (-v) verbose debug messages.
--unrealIP    <String> (-uIP)  ip address of Unreal engine     (default: 127.0.0.1)
--unrealPort  <Number> (-uP)   osc port of Unreal engine       (default: 8000)
--pythonIP    <String> (-pIP)  ip address of python receiver   (default: 127.0.0.1)
--pythonPort  <Number> (-pP)   osc port of python receiver     (default: 9000)

--httpPort  <Number> (-hP)  port on which httpserver (default: 8080)
