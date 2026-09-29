/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
/** biome-ignore-all lint/style/useDestructuring: <explanation> */
import type { FT232H } from './ft232h.ts'
import type { ChipInfo } from './util.ts'


export const MAX_POWER_MILLIAMP_PER_UNIT = 2
export const USB_DESCRIPTOR_TYPE_STRING = 0x03


export const EEPROM_CHIP_TYPE_ID = {
	LC_46: 0x46, //  64 x 16-bit
	LC_56: 0x56, // 128 x 16-bit
	LC_66: 0x66 //  256 x 16-bit
} as const

export type EEPROMChipType = typeof EEPROM_CHIP_TYPE_ID[keyof typeof EEPROM_CHIP_TYPE_ID]

export interface EEPROMChipInfo {
	id: EEPROMChipType
	name: string
	size: number
}

export const EEPROM_CHIP_TYPE_INFO: Record<string, EEPROMChipInfo> = {
	[EEPROM_CHIP_TYPE_ID.LC_46]: { id: EEPROM_CHIP_TYPE_ID.LC_46, name: '93LC46 64 x 16-bit', size: 128 },
	[EEPROM_CHIP_TYPE_ID.LC_56]: { id: EEPROM_CHIP_TYPE_ID.LC_56, name: '93LC56 128 x 16-bit', size: 256 },
	[EEPROM_CHIP_TYPE_ID.LC_66]: { id: EEPROM_CHIP_TYPE_ID.LC_66, name: '93LC66 256 x 16-bit', size: 512 }
}


export function eepromTypeFromValue(chipInfo: ChipInfo, value: number|undefined): EEPROMChipInfo|undefined {
	if(chipInfo.major === 6) { return { id: 0, name: 'Built-in 64 x 16-bit', size: 64} }

	if(value === undefined) { return undefined }
	return EEPROM_CHIP_TYPE_INFO[value]
}


export interface EEPROMInfo {
	vendorId: number
	productId: number
	chipVersion: {
		chipMajor: number
		chipMinor: number
	},

	eepromType: EEPROMChipInfo|undefined

	config: {
		_reservedHigh: boolean
		selfPowered: boolean
		remoteWake: boolean
		maxPower: number
	},

	chipConfig: {
		isInIsochronous: boolean
		isOutIsochronous: boolean
		suspendPullDowns: boolean
		useSerial: boolean
		useUSBVersion: boolean
	},

	manufacture: string|undefined
	product: string|undefined
	serial: string|undefined

	checksumCalculated: number
	checksum: number|undefined
}

export interface EEPROMInfo232H {
	channelA: number
}

export interface EEPROMInfo232R {
	channelA: number
}

export type ChipSpecificInfo = EEPROMInfo232H | {}


export function eepromTypeOffset(chipInfo: ChipInfo): number|undefined {
	// 2232C  0x14 -> 10
	// this is wrong? if(major === 6) { return 11 } // R  0x16 -> 11
	// 2232H / 4232H 0x18 -> 12
	if(chipInfo.major === 9) { return 15 } // 232H 0x1e -> 15

	return undefined
}

export class FTDIEEPROM {

	static async readEEPROMBulk(driver: FT232H, eepromSize16: number): Promise<ArrayBufferView<ArrayBuffer>> {
		// return TEST

		const result16 = new Uint16Array(eepromSize16)
		for(let i = 0; i < eepromSize16; i += 1) {
			const result = await driver.readEEPROM(i, 2)
			result16.set([result.getUint16(0, true)], i)
		}

		// const buf = Uint16Array.from([
		// 	0x03_12,
		// 	...('🧟 ❤️ 🧠'.split('').map(c => c.charCodeAt(0)))
		// ])
		// result16.set(buf, 80)

		// const buf = Uint16Array.from([
		// 	0x03_0E,
		// 	...('FT232H'.split('').map(c => c.charCodeAt(0)))
		// ])
		// result16.set(buf, 89)


		// const buf = Uint16Array.from([
		// 	0x03_12,
		// 	...('FT80SUO9'.split('').map(c => c.charCodeAt(0)))
		// ])
		// result16.set(buf, 96)

		// const buf = Uint16Array.from([ 0x00_45 ])
		// result16.set(buf, 14)

		// checksum
		// const csbuf = Uint16Array.from([ 42791 ])
		// result16.set(csbuf, eepromSize16 - 1)



		// console.log('read eeprom result', result16)

		return result16
	}

	static calculateChecksum(buffer16: Uint16Array, size16: number): number {
		let checksum = 0xAA_AA

		for(let i = 0; i < (size16 - 1); i += 1) {
			const value = buffer16[i]
			checksum ^= value ?? 0
			checksum = ((checksum << 1) | (checksum >>> (16 - 1))) & 0xFF_FF
		}
		return checksum
	}

	static parseEEPROMDescriptorString(info: number, buffer16: Uint16Array, eepromSize16: number, decoder = new TextDecoder('utf-16LE')): string|undefined {
		//
		const DESCRIPTOR_OFFSET_MASK = (eepromSize16 * 2) - 1 //0x00_FF // 0x00_7F

		const offset16 = (info & DESCRIPTOR_OFFSET_MASK) / 2
		const length = (info >> 8) / 2

		const prefix = buffer16[offset16]
		if(prefix === undefined) {
			console.warn('undefined prefix value', offset16)
			return undefined
		}

		const prefixLength = (prefix & 0xFF) / 2
		const prefixDescriptorType = prefix >> 8

		console.log('string info', offset16, length, prefixDescriptorType, prefixLength)

		if(length !== prefixLength) {
			console.warn('prefix length disagrees with info length', prefixLength, length)
			return undefined
		}

		if(prefixDescriptorType !== USB_DESCRIPTOR_TYPE_STRING) {
			console.warn('USB Descriptor type is not String', prefixDescriptorType)
			return undefined
		}

		// skip the string prefix (reduce size by one)
		const begin = offset16 + 1
		const end = begin + length - 1
		const buffer = buffer16.subarray(begin, end)

		return decoder.decode(buffer)
	}

	static parseEEPROM_232H(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): EEPROMInfo232H {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)


		const DRIVE_H_MASK = 0b0001_0000
// 		FT1284_CLK_IDLE_STATE 0x01
// #define FT1284_DATA_LSB       0x02 /* DS_FT232H 1.3 amd ftd2xx.h 1.0.4 disagree here*/
// #define FT1284_FLOW_CONTROL   0x04
// #define POWER_SAVE_DISABLE_H 0x80

		const CBUS_FUNC_NAME = {
			0: 'TRISTATE',
			1: 'TXLED',
			2: 'RXLED',
			3: 'TXRXLED',
			4: 'PWREN',
			5: 'SLEEP',
			6: 'DRIVE0',
			7: 'DRIVE1',
			8: 'GPIO',
			9: 'TXDEN',
			10: 'CLK30',
			11: 'CLK15',
			12: 'CLK7_5'
		}

		const control = u16[0]
		const groupConfig = u16[6]

		const cbusFunction0123 = u16[12]  // 3 2 1 0
		const cbusFunction4567 = u16[13]  // 7 6 5 4
		const cbusFunction89 = u16[14]    // x x 9 8

		const controlH = (control >> 8) & 0xFF
		const controlL = control * 0xFF

		const channlA = 0
		const channelAType = 0
		const clockPolarity = 0
		const lsbData = 0
		const flowcontrol = 0
		const powersave = 0


		const cbusFunc0 = (cbusFunction0123 >> 0) & 0x0F
		const cbusFunc1 = (cbusFunction0123 >> 4) & 0x0F
		const cbusFunc2 = (cbusFunction0123 >> 8) & 0x0F
		const cbusFunc3 = (cbusFunction0123 >> 12) & 0x0F

		const cbusFunc4 = (cbusFunction4567 >> 0) & 0x0F
		const cbusFunc5 = (cbusFunction4567 >> 4) & 0x0F
		const cbusFunc6 = (cbusFunction4567 >> 8) & 0x0F
		const cbusFunc7 = (cbusFunction4567 >> 12) & 0x0F

		const cbusFunc8 = (cbusFunction89 >> 0) & 0x0F
		const cbusFunc9 = (cbusFunction89 >> 4) & 0x0F

		return {
			control,
			groupConfig,
			cbusFunction: {
				cbusFunc0: CBUS_FUNC_NAME[cbusFunc0],
				cbusFunc1: CBUS_FUNC_NAME[cbusFunc1],
				cbusFunc2: CBUS_FUNC_NAME[cbusFunc2],
				cbusFunc3: CBUS_FUNC_NAME[cbusFunc3],
				cbusFunc4: CBUS_FUNC_NAME[cbusFunc4],
				cbusFunc5: CBUS_FUNC_NAME[cbusFunc5],
				cbusFunc6: CBUS_FUNC_NAME[cbusFunc6],
				cbusFunc7: CBUS_FUNC_NAME[cbusFunc7],
				cbusFunc8: CBUS_FUNC_NAME[cbusFunc8],
				cbusFunc9: CBUS_FUNC_NAME[cbusFunc9]
			}
		}
	}

	static parseEEPROM_232R(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): EEPROMInfo232R {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)



		const CHANNEL_A_MASK = 0b0000_1000
		const HIGHT_CURRENT_MASK = 0b0000_0100
		const EXTERNAL_OSCILLATOR_MASK = 0b0000_0010

		const ENDPOINT_SIZE_MASK = 0b0100_0000

		const INVERT__MASK = 0
		//TXD","RXD","RTS","CTS","DTR","DSR","DCD","RI"

		const control = u16[0]
		const config = u16[5]

		const controlH = (control >> 8) & 0xFF // 1
		const controlL = control & 0xFF  // 0

		const invertL = (config >> 8) & 0xFF // 11

		const channelA = (controlH & CHANNEL_A_MASK) === 0
		const highCurrent = (controlH & HIGHT_CURRENT_MASK) === HIGHT_CURRENT_MASK
		const externalOscillator  = (controlH & EXTERNAL_OSCILLATOR_MASK) === EXTERNAL_OSCILLATOR_MASK

		const endpointSize = (controlL & ENDPOINT_SIZE_MASK) === ENDPOINT_SIZE_MASK

		const invert = {
			TXD: 0,
			RXD: 0,
			RTS: 0,
			CTS: 0,
			DTR: 0,
			DSR: 0,
			DCD: 0,
			RI: 0,
		}


		return {
			control,
			channelA,
			highCurrent,
			externalOscillator,
			endpointSize,
			invert
		}
	}

	static parseEEPROM_ChipSpecific(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): ChipSpecificInfo {
		if(chipInfo.major === 9) { return FTDIEEPROM.parseEEPROM_232H(buffer, chipInfo) }
		if(chipInfo.major === 6) { return FTDIEEPROM.parseEEPROM_232R(buffer, chipInfo) }

		return {}
	}

	static parseEEPROM(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): EEPROMInfo|undefined {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)

		const eepromSize16 = u16.length
		console.log('using eepromSize16', eepromSize16, chipInfo.eepromSize)

		const checksumCalculated = FTDIEEPROM.calculateChecksum(u16, eepromSize16)
		const checksum = u16[eepromSize16 - 1]

		const header = u16[0]
		const vendorId = u16[1]
		const productId = u16[2]
		const type = u16[3]
		const config = u16[4]
		const chipConfig = u16[5]
		const _groupConfig = u16[6]
		const manufactureInfo = u16[7]
		const productInfo = u16[8]
		const serialInfo = u16[9]

		const chipOffset = eepromTypeOffset(chipInfo)
		const eepromType = eepromTypeFromValue(chipInfo, chipOffset ? u16[chipOffset]: undefined)

		if(vendorId === undefined) { return undefined }
		if(productId === undefined) { return undefined }
		if(type === undefined) { return undefined }
		if(config === undefined) { return undefined }
		if(chipConfig === undefined) { return undefined }
		if(manufactureInfo === undefined) { return undefined }
		if(productInfo === undefined) { return undefined }
		if(serialInfo === undefined) { return undefined }

		//
		const chipMajor = type >> 8   // 7
		const chipMinor = type & 0xff // 6

		//
		const configL = config >> 8    // 9
		const configH = config & 0xFF  // 8
		const _reservedHigh = (configH & 0x80) === 0x80
		const selfPowered = (configH & 0x40) === 0x40
		const remoteWake = (configH & 0x20) === 0x20

		const maxPower = configL * MAX_POWER_MILLIAMP_PER_UNIT

		//
		// const chipConfigL = chipConfig >> 8 // 11
		const chipConfigH = chipConfig & 0xFF // 10
		const isInIsochronous = (chipConfigH & 0x01) === 0x01
		const isOutIsochronous = (chipConfigH & 0x02) === 0x02
		const suspendPullDowns = (chipConfigH & 0x04) === 0x04
		const useSerial = (chipConfigH & 0x08) === 0x08
		const useUSBVersion  = (chipConfigH & 0x10) === 0x10

		//
		const decoder = new TextDecoder('utf-16')
		const manufactureStr = FTDIEEPROM.parseEEPROMDescriptorString(manufactureInfo, u16, eepromSize16, decoder)
		const productStr = FTDIEEPROM.parseEEPROMDescriptorString(productInfo, u16, eepromSize16, decoder)
		const serialStr = FTDIEEPROM.parseEEPROMDescriptorString(serialInfo, u16, eepromSize16, decoder)

		//
		const chipSpecificInfo = FTDIEEPROM.parseEEPROM_ChipSpecific(buffer, chipInfo)

		return {
			vendorId,
			productId,
			chipVersion: {
				chipMajor,
				chipMinor,
			},

			eepromType,

			config: {
				_reservedHigh,
				selfPowered,
				remoteWake,
				maxPower
			},

			chipConfig: {
				isInIsochronous,
				isOutIsochronous,
				suspendPullDowns,
				useSerial,
				useUSBVersion
			},

			manufacture: manufactureStr,
			product: productStr,
			serial: serialStr,

			...chipSpecificInfo,

			checksumCalculated,
			checksum
		}
	}
}
