# FTDI

[![npm Version](http://img.shields.io/npm/v/@johntalton/ftdi.svg)](https://www.npmjs.com/package/@johntalton/ftdi)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/ftdi)
[![CI](https://github.com/johntalton/ftdi/actions/workflows/CI.yml/badge.svg)](https://github.com/johntalton/ftdi/actions/workflows/CI.yml)
![GitHub](https://img.shields.io/github/license/johntalton/ftdi)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/ftdi.svg)](https://www.npmjs.com/package/@johntalton/ftdi)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/ftdi)

WebUSB based driver for FTDI's chip

Intended to provide I²C abstraction for compatibility with [I2CBus](https://github.com/johntalton/and-other-delights)

The FT232H and FT232R chips have been used during testing, and while other chips should work, access to others is limited (if you wish to help support please consider device donations 🎁)

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
await ftDevice.sendData(Uint8Array.from([
  PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
  0b1000_0000, // gpio to set (HIGH)
  0b1000_0000
]))

await delayMs(500)

// LED off
await ftDevice.sendData(Uint8Array.from([
  PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
  0b0000_0000, // gpio to set (LOW)
  0b1000_0000  // direction (output)
]))

```



Using it as a I²C bus.
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

