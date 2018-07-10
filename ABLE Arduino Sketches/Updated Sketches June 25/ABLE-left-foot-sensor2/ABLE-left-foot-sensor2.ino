/*********************************************************************
 This is an example for our nRF51822 based Bluefruit LE modules

 Pick one up today in the adafruit shop!

 Adafruit invests time and resources providing this open source code,
 please support Adafruit and open-source hardware by purchasing
 products from Adafruit!

 MIT license, check LICENSE for more information
 All text above, and the splash screen below must be included in
 any redistribution
*********************************************************************/

/*
    Please note the long strings of data sent mean the *RTS* pin is
    required with UART to slow down data sent to the Bluefruit LE!
*/

/*
BLE Analog Read:

Ground (Purple)
A0 (Blue) = Heel Sensor Left
A1 (White) = Toe Sensor Left
*/

#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_LSM9DS0.h>
#include <Adafruit_Sensor.h>
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include "Adafruit_BluefruitLE_UART.h"

#include "BluefruitConfig.h"

#if SOFTWARE_SERIAL_AVAILABLE
  #include <SoftwareSerial.h>
#endif

// i2c
Adafruit_LSM9DS0 lsm = Adafruit_LSM9DS0();

// FSR Analog Read
int heelFSR, toeFSR = 0;

// Create the bluefruit object, either software serial...uncomment these lines
/*
SoftwareSerial bluefruitSS = SoftwareSerial(BLUEFRUIT_SWUART_TXD_PIN, BLUEFRUIT_SWUART_RXD_PIN);

Adafruit_BluefruitLE_UART ble(bluefruitSS, BLUEFRUIT_UART_MODE_PIN,
                      BLUEFRUIT_UART_CTS_PIN, BLUEFRUIT_UART_RTS_PIN);
*/

/* ...or hardware serial, which does not need the RTS/CTS pins. Uncomment this line */
// Adafruit_BluefruitLE_UART ble(BLUEFRUIT_HWSERIAL_NAME, BLUEFRUIT_UART_MODE_PIN);

/* ...hardware SPI, using SCK/MOSI/MISO hardware SPI pins and then user selected CS/IRQ/RST */
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);

/* ...software SPI, using SCK/MOSI/MISO user-defined SPI pins and then user selected CS/IRQ/RST */
//Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_SCK, BLUEFRUIT_SPI_MISO,
//                             BLUEFRUIT_SPI_MOSI, BLUEFRUIT_SPI_CS,
//                             BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);


// Initialize LSM9DS0 settings
void setupSensor()
{
  // 1.) Set the accelerometer range
  lsm.setupAccel(lsm.LSM9DS0_ACCELRANGE_2G);
  //lsm.setupAccel(lsm.LSM9DS0_ACCELRANGE_4G);
  //lsm.setupAccel(lsm.LSM9DS0_ACCELRANGE_6G);
  //lsm.setupAccel(lsm.LSM9DS0_ACCELRANGE_8G);
  //lsm.setupAccel(lsm.LSM9DS0_ACCELRANGE_16G);

  // 2.) Set the magnetometer sensitivity
  lsm.setupMag(lsm.LSM9DS0_MAGGAIN_2GAUSS);
  //lsm.setupMag(lsm.LSM9DS0_MAGGAIN_4GAUSS);
  //lsm.setupMag(lsm.LSM9DS0_MAGGAIN_8GAUSS);
  //lsm.setupMag(lsm.LSM9DS0_MAGGAIN_12GAUSS);

  // 3.) Setup the gyroscope
  lsm.setupGyro(lsm.LSM9DS0_GYROSCALE_245DPS);
  //lsm.setupGyro(lsm.LSM9DS0_GYROSCALE_500DPS);
  //lsm.setupGyro(lsm.LSM9DS0_GYROSCALE_2000DPS);
}


// A small helper
void error(const __FlashStringHelper*err) {
  Serial.println(err);
  while (1);
}

/* The service information */

int32_t serviceID;


int32_t heelCharID;
int32_t toeCharID;
int32_t accelCharID;
int32_t magCharID;
int32_t gyroCharID;
int32_t *charIDs[] = {&heelCharID, &toeCharID, &accelCharID,  &magCharID, &gyroCharID};

// payload size: 2 bytes per value + 1 bytes for frame;
const char heelCharUUID []= ("AT+GATTADDCHAR=UUID128=AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-00-01, PROPERTIES=0x10, MIN_LEN=4, MAX_LEN=4, VALUE=0, DATATYPE=BYTEARRAY");
const char toeCharUUID []= ("AT+GATTADDCHAR=UUID128=AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-00-02, PROPERTIES=0x10, MIN_LEN=4, MAX_LEN=4, VALUE=0, DATATYPE=BYTEARRAY"); 
const char accelCharUUID [] = ("AT+GATTADDCHAR=UUID128=AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-00-03, PROPERTIES=0x10, MIN_LEN=8, MAX_LEN=8, VALUE=0, DATATYPE=BYTEARRAY");
const char magCharUUID [] = ("AT+GATTADDCHAR=UUID128=AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-00-04, PROPERTIES=0x10, MIN_LEN=8, MAX_LEN=8, VALUE=0, DATATYPE=BYTEARRAY");
const char gyroCharUUID [] = ("AT+GATTADDCHAR=UUID128=AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-AA-00-05, PROPERTIES=0x10, MIN_LEN=8, MAX_LEN=8, VALUE=0, DATATYPE=BYTEARRAY");

int frame = 0;

/**************************************************************************/
/*!
    @brief  Sets up the HW an the BLE module (this function is called
            automatically on startup)
*/
/**************************************************************************/
void setup(void)
{
//  while (!Serial); // required for Flora & Micro
  delay(500);
  const char *charUUIDs[11] = {heelCharUUID, toeCharUUID, accelCharUUID,  magCharUUID, gyroCharUUID};
  boolean success;

  Serial.begin(115200);
  Serial.println(F("Left Foot Sensor"));
  Serial.println(F("---------------------------------------------------"));

  // Try to initialise and warn if we couldn't detect the chip
  if (!lsm.begin())
  {
    Serial.println("Oops ... unable to initialize the LSM9DS0. Check your wiring!");
    while (1);
  }
  Serial.println("Found LSM9DS0 9DOF");
  Serial.println("");
  Serial.println("");

  randomSeed(micros());

  /* Initialise the module */
  Serial.print(F("Initialising the Bluefruit LE module: "));

  if ( !ble.begin(VERBOSE_MODE) )
  {
    error(F("Couldn't find Bluefruit, make sure it's in CoMmanD mode & check wiring?"));
  }
  Serial.println( F("OK!") );

  /* Perform a factory reset to make sure everything is in a known state */
  Serial.println(F("Performing a factory reset: "));
  if (! ble.factoryReset() ){
       error(F("Couldn't factory reset"));
  }

  /* Disable command echo from Bluefruit */
  ble.echo(false);

  Serial.println("Requesting Bluefruit info:");
  /* Print Bluefruit information */
  ble.info();

  /* Change the device name to make it easier to find */
  Serial.println(F("Setting device name to 'Left Foot Sensor': "));

  if (! ble.sendCommandCheckOK(F("AT+GAPDEVNAME=Left Foot Sensor")) ) {
    error(F("Could not set device name?"));
  }

  /* Add Custom Service with uuid128: 8F-65-AD-D5-12-14-4F-48-8A-8F-D3-2A-4A-B3-05-76 */
  Serial.println(F("Adding the Custom Service definition (UUID128 = 8F-65-AD-D5-12-14-4F-48-8A-8F-D3-2A-4A-B3-05-76): "));
  // Custom 128 GATT Service 
  success = ble.sendCommandWithIntReply( F("AT+GATTADDSERVICE=UUID128=8F-65-AD-D5-12-14-4F-48-8A-8F-D3-2A-4A-B3-05-76"), &serviceID);
  if (! success) {
    error(F("Could not add HRM service"));
  }

  for(int i =0; i<5; i++){
    success = ble.sendCommandWithIntReply(charUUIDs[i],charIDs[i]);
    if (! success){
      error(F("Could not add characteristic"));
    }
  }

  // Advertisement -- TODO - not sure this is right but it seems to work...
  Serial.print(F("Advertising service with uid 8F-65-AD-D5-12-14-4F-48-8A-8F-D3-2A-4A-B3-05-76: "));
  ble.sendCommandCheckOK( F("AT+GAPSETADVDATA=11-06-76-05-B3-4A-2A-D3-8F-8A-48-4F-14-12-D5-AD-65-8F"));
  
  /* Reset the device for the new service setting changes to take effect */
  Serial.print(F("Performing a SW reset (service changes require a reset): "));
  ble.reset();

  Serial.println();
}


/** Send randomized heart rate data continuously **/
void loop(void)
{
  frame = (frame+1)%20;
  // Read each analog pin for FSRs
  int toeFSR = analogRead(0);
  int heelFSR = analogRead(1);

  // Read from LSM9DS0
  lsm.read();
  
  // Prepare values for OSC
//  Serial.println("toe");
  sendInt(toeCharID,toeFSR,frame, "toe");

//  Serial.println("heel");
  sendInt(heelCharID, heelFSR,frame, "heel");
  
//  Serial.println("accel");
  sendXYZ(accelCharID, (int)lsm.accelData.x,(int)lsm.accelData.y,(int)lsm.accelData.z, frame, "accel");
  
//  Serial.println("mag");
  sendXYZ(magCharID, (int)lsm.magData.x,(int)lsm.magData.y,(int)lsm.magData.z, frame, "mag");
  
//  Serial.println("gyro");
  sendXYZ(gyroCharID, (int)lsm.gyroData.x,(int)lsm.gyroData.y,(int)lsm.gyroData.z, frame, "gyro");
  

  /* Delay before next measurement update */
  delay(1);
}


void sendXYZ (int32_t target, int x, int y, int z,int f, String err){
  int vals [] = {x,y,z};

  // Address the right target characteristic
  ble.print(F("AT+GATTCHAR="));
  ble.print(target);
  ble.print(F(","));

  // Convert x,y,z to 2 bytes each, send in x y z order
  // eg: x=255, y=0, z= 300
  // send: 00-FF-00-00-01-2C
  //         X     Y     Z
  
  // Print the data
  for (int i=0; i<3;i++){
    blePrintInt(vals[i]);
    ble.print("-");
  }

  // Add the frame
  blePrintInt(f);

  // send it
  ble.println(""); 
  if(!ble.waitForOK()){
    Serial.print(F("Failed to get response for: "));
    Serial.println(err);
  }
} // End printXYZ()


void sendInt(int32_t target, int val, int f, String err){

  // Address the right target characteristic
  ble.print(F("AT+GATTCHAR="));
  ble.print(target);
  ble.print(F(","));

  blePrintInt(val);

  ble.print(F("-"));
  
  // Add the frame
  blePrintInt(f);
  ble.println("");
  if(!ble.waitForOK()){
    Serial.print(F("Failed to get response for: "));
    Serial.println(err);
  }
}

void blePrintInt (int a){
  byte hb = highByte(a);
  byte lb = lowByte(a);
  if(hb<16){ble.print(F("0"));}
  ble.print(hb,HEX);
  ble.print(F("-"));
  if(lb<16){ble.print(F("0"));}
  ble.print(lb,HEX); 
}


