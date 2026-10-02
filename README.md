# FTDI

WebUSB based driver for FTDI's chip

Intended to provide I²C abstraction for compatibility with [I2CBus](https://github.com/johntalton/and-other-delights)

The FT232H and FT232R chips have been used during testing, and while other chips should work, access to others is limited (if you wish to help support please consider device donations 🎁)

[![npm Version](http://img.shields.io/npm/v/@johntalton/ftdi.svg)](https://www.npmjs.com/package/@johntalton/ftdi)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/ftdi)
[![CI](https://github.com/johntalton/ftdi/actions/workflows/CI.yml/badge.svg)](https://github.com/johntalton/ftdi/actions/workflows/CI.yml)
![GitHub](https://img.shields.io/github/license/johntalton/ftdi)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/ftdi.svg)](https://www.npmjs.com/package/@johntalton/ftdi)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/ftdi)


## Example

Standard setup

```js
import { FTDIDevice, BIT_MODE } from '@johntalton/ftdi'

const usbDevice = // via navigator.usb.requestDevice

// open usb
await usbDevice.open()

// chip form usb device
const ftDevice = await FTDIDevice.from(usbDevice)

// using MPSSE
await ftDevice.setBitMode(BIT_MODE.MPSSE)
```

Blink LED via GPIO

```js
import { PIN_STATE_COMMANDS } from '@johntalton/ftdi'

// ...
export const delayMs = ms => new Promise(resolve => setTimeout(resolve, ms))

// LED on
await ftDevice.mpsse.setGpioHigh(0b1000_0000, 0b1000_0000)
await delayMs(500)

// LED off
await ftDevice.mpsse.setGpioHigh(0b0000_0000, 0b1000_0000)
```

The above code uses the well-known commands via the `ftDevice.mpsse.setGpioHigh`, alternatively commands can be send directly, seen bellow.

It is recommended to use the `device.mpsse.` version as it checks parameters etc, these are provided here for customization.

```js
// this is the same as the above LED on
await ftDevice.sendData(Uint8Array.from([
  PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
  0b1000_0000, // gpio to set (HIGH)
  0b1000_0000
]))
```

## I²C Example

This uses the FT232H specific implementation as it support Drive Zero only and 3-Phase clocking that significantly reduces implementation complexity.

```js
import { FT232HBus } from '@johntalton/ftdi/i2c'
import { I2CAddressedBus } from '@johntalton/and-other-delights'
import { ADT7410 } from '@johntalton/adt7410'

// ...

// init sets the chip into mode compatible for I2C communication
// this is required prior to any I2C interactions
// any other command that alter the chips configuration will
// invalidate the bus
await FT232HBus.init(ftDevice)
const bus = new FT232HBus(ftDevice)

// but can now be used as part of any I2CBus sensor
// following example for ADT7410
const DEFAULT_ADDR = 0x48
const sensor = ADT7410.from(new I2CAddressedBus(DEFAULT_ADDR, bus))

// get temperature
const { temperatureC } = await sensor.getTemperature()

```

⚠️ For I²C to remain functional, the device must be in MPSSE mode.  (additional parameters / commands are executed as part of `init`, it is highly recommended to utilize this function, not doing some will cause bus communication to becomes unstable/unusable)

The `device.mpsse.validateMPSSE()` can be used to validate the mode is active.

Additionally the bus speed can be initialized during `FT232Bus.init(ftDevice)` call by passing an `options` parameter.

```ts
import { CLOCK_DEFAULT_FAST_MODE_PLUS_1_MHz } from '@johntalton/ftdi'

// returns true if MPSSE is active and accepting command, false otherwise
const valid = await ftDevice.mpsse.validateMPSSE()
if(!valid) { /* handle error */ }

// initialize with a common predefined clock
await FT232HBus.init(ftDevice, {
  targetClockHz: CLOCK_DEFAULT_FAST_MODE_PLUS_1_MHz
})
```

It is also possible to set the clock divisor (and thus the Hz) directly vai the MPSSE command set.

note: this used the 60 MHz clock "base", this assumed the Divide-By-5 has been disabled. (via `device.mpsse.enableClockDivideBy5(false)`)

```ts
import { Clock, CLOCK_BASE_60 } from '@johntalton/ftdi'

// set to 400 kHz (this is equivalent to CLOCK_DEFAULT_FAST_MODE_400_kHz via init)
const divisor = Clock.clockDivisor(400 * 1000, CLOCK_BASE_60) // in Hz

// ...
await ftDevice.mpssse.setClockDivisor(divisor)

```


## EEPROM

Many of the configuration for FTDI chips live within the EEPROM.

They can be accessed and parsed as follows:

```ts
import { FTDIEEPROM, Util } from '@johntalton/ftdi'

const usbDevice = // WebUSB Device via navigator.usb.requestDevice
const major = usbDevice.deviceVersionMajor
const minor = usbDevice.deviceVersionMinor

// using major/minor version detect chip information
const chipInfo = Util.chip(major, minor)

// read from the device the entire (bulk) eeprom values as an Array16Buffer
const buffer16 = await FTDIEEPROM.readEEPROMBulk(ftdiDevice, chipInfo.eepromSize)

// parse based on input buffer and chip information
const info = FTDIEEPROM.parseEEPROM(buffer16, chipInfo)

console.log('EEPROM:', info)

// additionally the contents contains the configured checksum and the calculated one, this can be used to validate the EEPROM (required for proper operation)
const { checksum, checksumCalculated } = info
const valid = checksum === checksumCalculated
if(!valid) {
  // handle invalid eeprom (some values may be corrupted etc)
  // this may effect the ability of the chip to be detected via USB
}


```