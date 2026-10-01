/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
/** biome-ignore-all lint/nursery/noMisleadingReturnType: <explanation> */
/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
/** biome-ignore-all lint/style/noExcessiveLinesPerFile: <explanation> */
/** biome-ignore-all lint/style/useDestructuring: <explanation> */
import type { FTDIDevice } from './ftdi.ts'
import {
	type ChipInfo,
	USB_MAJOR_TYPE_232H,
	USB_MAJOR_TYPE_2232H,
	USB_MAJOR_TYPE_R,
} from './util.ts'

export const MASK_16 = 0xFF_FF
export const MASK_8 = 0xFF
export const MASK_4 = 0x0F
export const MASK_3 = 0b0111


export const MAX_POWER_MILLIAMP_PER_UNIT = 2
export const USB_DESCRIPTOR_TYPE_STRING = 0x03

export const CONFIG_RESERVED_MASK = 0b1000_0000
export const CONFIG_SELF_POWERED_MASK = 0b0100_0000
export const CONFIG_REMOTE_WAKE_MASK = 0b0010_0000

export const CONFIG_IN_ISOCHRONOUS_MASK = 0b0000_0001
export const CONFIG_OUT_ISOCHRONOUS_MASK = 0b0000_0010
export const CONFIG_SUSPEND_PULL_DOWN = 0b0000_0100
export const CONFIG_USE_SERIAL = 0b0000_1000
export const CONFIG_USE_USB_VERSION = 0b0001_0000

export const CHANNEL_TYPE: Record<number, string> = {
	0: 'UART',
	1: 'FIFO',
	2: 'OPTO',
	4: 'CPU',
	8: 'FT1284'
}

export const GROUP_DRIVE: Record<number, GroupDriveInfo> = {
	0: { name: '4mA', mA: 4 },
	1: { name: '8mA', mA: 8 },
	2: { name: '12mA', mA: 12 },
	3: { name: '16mA', mA: 16 }
}

export const CBUS_FUNC_NAME_H: Record<number, string> = {
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

export const CBUS_FUNC_NAME_R: Record<number, string> = {
	0: 'TXDEN',
	1: 'PWREN',
	2: 'RXLED',
	3: 'TXLED',
	4: 'TX+RXLED',
	5: 'SLEEP',
	6: 'CLK48',
	7: 'CLK24',
	8: 'CLK12',
	9: 'CLK6',
	10: 'IOMODE',
	11: 'BB_WR',
	12: 'BB_RD"'
}

export const GROUP_DRIVE_MASK = 0b0000_0011
export const SLOW_SLEW_MASK   = 0b0000_0100
export const IS_SCHMITT_MASK  = 0b0000_1000

export const EEPROM_CHIP_TYPE_ID = {
	LC_46: 0x46, //  64 x 16-bit
	LC_56: 0x56, // 128 x 16-bit
	LC_66: 0x66 //  256 x 16-bit
} as const

export type EEPROMChipType = typeof EEPROM_CHIP_TYPE_ID[keyof typeof EEPROM_CHIP_TYPE_ID]

export interface EEPROMChipInfo {
	id: EEPROMChipType | 0
	name: string
	byteLength: number
}

export const EEPROM_CHIP_TYPE_INFO: Record<string, EEPROMChipInfo> = {
	[EEPROM_CHIP_TYPE_ID.LC_46]: { id: EEPROM_CHIP_TYPE_ID.LC_46, name: '93LC46 64 x 16-bit', byteLength: 128 },
	[EEPROM_CHIP_TYPE_ID.LC_56]: { id: EEPROM_CHIP_TYPE_ID.LC_56, name: '93LC56 128 x 16-bit', byteLength: 256 },
	[EEPROM_CHIP_TYPE_ID.LC_66]: { id: EEPROM_CHIP_TYPE_ID.LC_66, name: '93LC66 256 x 16-bit', byteLength: 512 }
}

export function eepromTypeFromValue(chipInfo: ChipInfo, value: number|undefined): EEPROMChipInfo|undefined {
	if(chipInfo.major === USB_MAJOR_TYPE_R) { return { id: 0, name: 'Built-in 64 x 16-bit', byteLength: 128 } }

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

	chipInfo: ChipInfo

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

export interface GroupDriveInfo {
	name: string
	mA: number
}

export interface GroupItem {
	name: string
	drive: GroupDriveInfo | undefined
	isSchmitt: boolean
	slowSlew: boolean
}

export const CHANNEL_DRIVE_D2XX = 'D2xx'
export const CHANNEL_DRIVE_VCP = 'VCP'

export type ChannelDrive = typeof CHANNEL_DRIVE_D2XX | typeof CHANNEL_DRIVE_VCP

export interface EEPROMInfo2232H {
	channelADrive: ChannelDrive
	channelAType: string | undefined

	channelBDrive: ChannelDrive
	channelBType: string | undefined

	suspendDBUS7: boolean

	group: [ GroupItem, GroupItem, GroupItem, GroupItem ],
}

export interface EEPROMInfo232H {
	channelADrive: ChannelDrive
	channelAType: string | undefined
	clockPolarityHigh: boolean
	lsbData: boolean
	flowcontrol: boolean
	powersave: boolean

	group: [ GroupItem, GroupItem ],

	cbusFunction: Array<string|undefined>

}

export interface EEPROMInfo232R {
	channelADrive: ChannelDrive
	highCurrent: boolean
	externalOscillator: boolean

	invert: {
		TXD: boolean
		RXD: boolean
		RTS: boolean
		CTS: boolean
		DTR: boolean
		DSR: boolean
		DCD: boolean
		RI: boolean
	}

	cbusFunction: Array<string|undefined>
}

export type ChipSpecificInfo = EEPROMInfo2232H | EEPROMInfo232H | EEPROMInfo232R | undefined

export function eepromTypeOffset(chipInfo: ChipInfo): number|undefined {
	// if(chipInfo.major === USB_MAJOR_TYPE_2232C) { return 10 }// 2232C  0x14 -> 10
	// this is wrong? if(major === USB_MAJOR_TYPE_R) { return 11 } // R  0x16 -> 11
	if(chipInfo.major === USB_MAJOR_TYPE_2232H) { return 12 } // 2232H / 4232H 0x18 -> 12
	// if(chipInfo.major === USB_MAJOR_TYPE_4232H) { return 12 } // 2232H / 4232H 0x18 -> 12
	if(chipInfo.major === USB_MAJOR_TYPE_232H) { return 15 } // 232H 0x1e -> 15

	return undefined
}

export class FTDIEEPROM {

	static async readEEPROMBulk(device: FTDIDevice, eepromSize16: number): Promise<ArrayBufferView<ArrayBuffer>> {
		const result16 = new Uint16Array(eepromSize16)
		for(let i = 0; i < eepromSize16; i += 1) {
			const result = await device.readEEPROM(i, 2)
			result16.set([result.getUint16(0, true)], i)
		}

		// const buf = Uint16Array.from([
		// 	0x03_12,
		// 	...('🧟 ❤️ 🧠'.split('').map(c => c.charCodeAt(0)))
		// ])
		// result16.set(buf, 80)

		// checksum
		// const csbuf = Uint16Array.from([ 42791 ])
		// result16.set(csbuf, eepromSize16 - 1)

		// console.log('read eeprom result', result16)

		return result16
	}

	static calculateChecksum(buffer16: Uint16Array, size16: number): number {
		const CHECKSUM_INITIAL_VALUE = 0xAA_AA
		let checksum = CHECKSUM_INITIAL_VALUE

		for(let i = 0; i < (size16 - 1); i += 1) {
			const value = buffer16[i]
			checksum ^= value ?? 0
			checksum = ((checksum << 1) | (checksum >>> (16 - 1))) & MASK_16 // rotate16
		}
		return checksum
	}

	static parseEEPROMDescriptorString(info: number, buffer16: Uint16Array, eepromSize16: number, decoder = new TextDecoder('utf-16LE')): string|undefined {
		// info offset suffer from wrap-around indexing
		//  mask off the bits of the size to make sure index
		//  is withing the size.
		const DESCRIPTOR_OFFSET_MASK = (eepromSize16 * 2) - 1

		// info contains offset/length to the descriptor
		const offset16 = (info & DESCRIPTOR_OFFSET_MASK) / 2
		const length = (info >> 8) / 2

		//
		const prefix = buffer16[offset16]
		if(prefix === undefined) {
			console.warn('undefined prefix value', offset16)
			return undefined
		}

		// descriptors have length and USB descriptor type (length includes prefix)
		const prefixLength = (prefix & MASK_8) / 2
		const prefixDescriptorType = prefix >> 8

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

		// decode utf-16le
		return decoder.decode(buffer)
	}

	static parseEEPROM_FT2232H(buffer: ArrayBufferView<ArrayBuffer>|ArrayBuffer, _chipInfo: ChipInfo): EEPROMInfo2232H | undefined {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)

		const DRIVE_MASK = 0b0000_1000
		const SUSPEND_DBUS_7_MASK = 0b1000_0000

		const control = u16[0]
		const groupConfig = u16[6]

		if(control === undefined) { return undefined }
		if(groupConfig === undefined) { return undefined }

		const controlH = (control >> 8) & MASK_8 // 1
		const controlL = control & MASK_8 // 0

		const channelAType = CHANNEL_TYPE[controlL & MASK_3]
		const channelBType = CHANNEL_TYPE[controlH & MASK_3]

		const channelADrive = ((controlL & DRIVE_MASK) === DRIVE_MASK) ? CHANNEL_DRIVE_VCP : CHANNEL_DRIVE_D2XX
		const channelBDrive = ((controlH & DRIVE_MASK) === DRIVE_MASK) ? CHANNEL_DRIVE_VCP : CHANNEL_DRIVE_D2XX

		const suspendDBUS7 = (controlH & SUSPEND_DBUS_7_MASK) === SUSPEND_DBUS_7_MASK

		const groupConfigH = (groupConfig >> 8) & MASK_8 // d
		const groupConfigL = groupConfig & MASK_8 // c

		const groupConfigHH = (groupConfigH >> 4) & MASK_4 // 3
		const groupConfigHL = groupConfigH  & MASK_4       // 2
		const groupConfigLH = (groupConfigL >> 4) & MASK_4 // 1
		const groupConfigLL = groupConfigL & MASK_4        // 0

		const group: [ GroupItem, GroupItem, GroupItem, GroupItem ] = [
			{
				name: 'AL',
				drive: GROUP_DRIVE[(groupConfigLL & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigLL & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigLL & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			},
			{
				name: 'AH',
				drive: GROUP_DRIVE[(groupConfigLH & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigLH & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigLH & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			},
			{
				name: 'BL',
				drive: GROUP_DRIVE[(groupConfigHL & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigHL & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigHL & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			},
			{
				name: 'BH',
				drive: GROUP_DRIVE[(groupConfigHH & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigHH & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigHH & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			}
		]

		return {
			channelAType,
			channelBType,
			channelADrive,
			channelBDrive,

			suspendDBUS7,

			group
		}
	}

	static parseEEPROM_232H(buffer: ArrayBufferView<ArrayBuffer>|ArrayBuffer, _chipInfo: ChipInfo): EEPROMInfo232H | undefined {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)

		const DRIVE_H_MASK = 0b0001_0000
 		const FT1284_CLOCK_STATE_MASK = 0b0000_0001
		const FT1284_DATA_LSB_MASK = 0b0000_0010
		const FT1284_FLOW_CONTROL_MASK = 0b0000_0100
		const POWER_SAVE_DISABLE_H_MASK = 0b0000_1000

		const control = u16[0]
		const groupConfig = u16[6]

		const cbusFunction0123 = u16[12]  // 3 2 1 0
		const cbusFunction4567 = u16[13]  // 7 6 5 4
		const cbusFunction89 = u16[14]    // x x 9 8

		if(control === undefined) { return undefined }
		if(groupConfig === undefined) { return undefined }
		if(cbusFunction0123 === undefined) { return undefined }
		if(cbusFunction4567 === undefined) { return undefined }
		if(cbusFunction89 === undefined) { return undefined }

		const controlH = (control >> 8) & MASK_8 // 1
		const controlL = control & MASK_8 // 0

		const channelADrive = ((controlL & DRIVE_H_MASK) === DRIVE_H_MASK) ? CHANNEL_DRIVE_VCP : CHANNEL_DRIVE_D2XX
		const channelAType = CHANNEL_TYPE[controlL & MASK_4]

		const clockPolarityHigh = (controlH & FT1284_CLOCK_STATE_MASK) === FT1284_CLOCK_STATE_MASK
		const lsbData = (controlH & FT1284_DATA_LSB_MASK) === FT1284_DATA_LSB_MASK
		const flowcontrol = (controlH & FT1284_FLOW_CONTROL_MASK) === FT1284_FLOW_CONTROL_MASK
		const powersave = (controlH & POWER_SAVE_DISABLE_H_MASK) === POWER_SAVE_DISABLE_H_MASK

		const groupConfigH = (groupConfig >> 8) & MASK_8 // d
		const groupConfigL = groupConfig & MASK_8 // c

		const group: [ GroupItem, GroupItem ] = [
			{
				name: 'ACBUS',
				drive: GROUP_DRIVE[(groupConfigL & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigL & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigL & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			},
			{
				name: 'ADBUS',
				drive: GROUP_DRIVE[(groupConfigH & GROUP_DRIVE_MASK)],
				isSchmitt: (groupConfigH & IS_SCHMITT_MASK) === IS_SCHMITT_MASK,
				slowSlew: (groupConfigH & SLOW_SLEW_MASK) === SLOW_SLEW_MASK
			}
		]

		const cbusFunc0 = (cbusFunction0123 >> 0) & MASK_4
		const cbusFunc1 = (cbusFunction0123 >> 4) & MASK_4
		const cbusFunc2 = (cbusFunction0123 >> 8) & MASK_4
		const cbusFunc3 = (cbusFunction0123 >> 12) & MASK_4

		const cbusFunc4 = (cbusFunction4567 >> 0) & MASK_4
		const cbusFunc5 = (cbusFunction4567 >> 4) & MASK_4
		const cbusFunc6 = (cbusFunction4567 >> 8) & MASK_4
		const cbusFunc7 = (cbusFunction4567 >> 12) & MASK_4

		const cbusFunc8 = (cbusFunction89 >> 0) & MASK_4
		const cbusFunc9 = (cbusFunction89 >> 4) & MASK_4

		return {
			channelADrive,
			channelAType,
			clockPolarityHigh,
			lsbData,
			flowcontrol,
			powersave,

			group,

			cbusFunction: [
				CBUS_FUNC_NAME_H[cbusFunc0],
				CBUS_FUNC_NAME_H[cbusFunc1],
				CBUS_FUNC_NAME_H[cbusFunc2],
				CBUS_FUNC_NAME_H[cbusFunc3],
				CBUS_FUNC_NAME_H[cbusFunc4],
				CBUS_FUNC_NAME_H[cbusFunc5],
				CBUS_FUNC_NAME_H[cbusFunc6],
				CBUS_FUNC_NAME_H[cbusFunc7],
				CBUS_FUNC_NAME_H[cbusFunc8],
				CBUS_FUNC_NAME_H[cbusFunc9]
			]
		}
	}

	static parseEEPROM_232R(buffer: ArrayBufferView<ArrayBuffer>|ArrayBuffer, _chipInfo: ChipInfo): EEPROMInfo232R | undefined {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)

		const DRIVE_MASK = 0b0000_1000
		const HIGH_CURRENT_MASK = 0b0000_0100
		const EXTERNAL_OSCILLATOR_MASK = 0b0000_0010

		// const ENDPOINT_SIZE_MASK = 0b0100_0000

		const INVERT_TXD_MASK = 0b0000_0001
		const INVERT_RXD_MASK = 0b0000_0010
		const INVERT_RTS_MASK = 0b0000_0100
		const INVERT_CTS_MASK = 0b0000_1000
		const INVERT_DTR_MASK = 0b0001_0000
		const INVERT_DSR_MASK = 0b0010_0000
		const INVERT_DCD_MASK = 0b0100_0000
		const INVERT_RI_MASK  = 0b1000_0000

		const control = u16[0]
		const config = u16[5]

		const cbusFunction0123 = u16[10]  // 3 2 1 0
		const cbusFunction4 = u16[11]  // x x x 4

		if(control === undefined) { return undefined }
		if(config === undefined) { return undefined }
		if(cbusFunction0123 === undefined) { return undefined }
		if(cbusFunction4 === undefined) { return undefined }

		const controlH = (control >> 8) & MASK_8 // 1
		const controlL = control & MASK_8 // 0

		const invertH = (config >> 8) & MASK_8 // 11

		const channelADrive = ((controlL & DRIVE_MASK) === DRIVE_MASK) ? CHANNEL_DRIVE_D2XX : CHANNEL_DRIVE_VCP
		const highCurrent = (controlH & HIGH_CURRENT_MASK) === HIGH_CURRENT_MASK
		const externalOscillator  = (controlH & EXTERNAL_OSCILLATOR_MASK) === EXTERNAL_OSCILLATOR_MASK

		// const endpointSize = (controlL & ENDPOINT_SIZE_MASK) === ENDPOINT_SIZE_MASK

		const invert = {
			TXD: (invertH & INVERT_TXD_MASK) === INVERT_TXD_MASK,
			RXD: (invertH & INVERT_RXD_MASK) === INVERT_RXD_MASK,
			RTS: (invertH & INVERT_RTS_MASK) === INVERT_RTS_MASK,
			CTS: (invertH & INVERT_CTS_MASK) === INVERT_CTS_MASK,
			DTR: (invertH & INVERT_DTR_MASK) === INVERT_DTR_MASK,
			DSR: (invertH & INVERT_DSR_MASK) === INVERT_DSR_MASK,
			DCD: (invertH & INVERT_DCD_MASK) === INVERT_DCD_MASK,
			RI: (invertH & INVERT_RI_MASK) === INVERT_RI_MASK
		}

		const cbusFunc0 = (cbusFunction0123 >> 0) & MASK_4
		const cbusFunc1 = (cbusFunction0123 >> 4) & MASK_4
		const cbusFunc2 = (cbusFunction0123 >> 8) & MASK_4
		const cbusFunc3 = (cbusFunction0123 >> 12) & MASK_4

		const cbusFunc4 = (cbusFunction4 >> 0) & MASK_4

		return {
			channelADrive,
			highCurrent,
			externalOscillator,

			invert,

			cbusFunction: [
				CBUS_FUNC_NAME_R[cbusFunc0],
				CBUS_FUNC_NAME_R[cbusFunc1],
				CBUS_FUNC_NAME_R[cbusFunc2],
				CBUS_FUNC_NAME_R[cbusFunc3],
				CBUS_FUNC_NAME_R[cbusFunc4]
			]
		}
	}

	static parseEEPROM_ChipSpecific(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): ChipSpecificInfo {
		// if(chipInfo.major === USB_MAJOR_TYPE_BM) { return FTDIEEPROM.parseEEPROM_FT2232BM(buffer, chipInfo) }
		if(chipInfo.major === USB_MAJOR_TYPE_R) { return FTDIEEPROM.parseEEPROM_232R(buffer, chipInfo) }
		if(chipInfo.major === USB_MAJOR_TYPE_2232H) { return FTDIEEPROM.parseEEPROM_FT2232H(buffer, chipInfo) }
		if(chipInfo.major === USB_MAJOR_TYPE_232H) { return FTDIEEPROM.parseEEPROM_232H(buffer, chipInfo) }

		return undefined
	}

	static parseEEPROM(buffer: ArrayBufferView<ArrayBuffer|ArrayBuffer>, chipInfo: ChipInfo): EEPROMInfo|undefined {
		const u16 = ArrayBuffer.isView(buffer) ?
			new Uint16Array(buffer.buffer, buffer.byteOffset) :
			new Uint16Array(buffer)

		// cache the chip info as it will be updated
		// to reflect the values used when parsing
		const usedChipInfo = { ...chipInfo }

		usedChipInfo.eepromSize = chipInfo.eepromSize ?? u16.length
		console.log('using eepromSize16', usedChipInfo.eepromSize)
		console.log('with u16 array length', u16.length)

		const checksumCalculated = FTDIEEPROM.calculateChecksum(u16, usedChipInfo.eepromSize)
		const checksum = u16[usedChipInfo.eepromSize - 1]

		// const header = u16[0]
		const vendorId = u16[1]
		const productId = u16[2]
		const type = u16[3]
		const config = u16[4]
		const chipConfig = u16[5]
		// const _groupConfig = u16[6]
		const manufactureInfo = u16[7]
		const productInfo = u16[8]
		const serialInfo = u16[9]

		//
		if(type === undefined) { return undefined }
		const chipMajor = type >> 8   // 7
		const chipMinor = type & MASK_8 // 6

		//
		usedChipInfo.major = usedChipInfo.major ?? chipMajor
		usedChipInfo.minor = usedChipInfo.minor ?? chipMinor

		//
		const chipOffset = eepromTypeOffset(usedChipInfo)
		const eepromType = eepromTypeFromValue(usedChipInfo, chipOffset ? u16[chipOffset]: undefined)

		if(eepromType !== undefined && ((eepromType.byteLength/2) !== usedChipInfo.eepromSize)) {
			console.log('Used ChipInfo byteLength does not match Detected EEPROM byteLength', eepromType.byteLength/2, usedChipInfo.eepromSize)
		}

		//
		if(vendorId === undefined) { return undefined }
		if(productId === undefined) { return undefined }
		if(config === undefined) { return undefined }
		if(chipConfig === undefined) { return undefined }
		if(manufactureInfo === undefined) { return undefined }
		if(productInfo === undefined) { return undefined }
		if(serialInfo === undefined) { return undefined }

		//
		const configH = config >> 8    // 9
		const configL = config & MASK_8  // 8
		const _reservedHigh = (configL & CONFIG_RESERVED_MASK) === CONFIG_RESERVED_MASK
		const selfPowered = (configL & CONFIG_SELF_POWERED_MASK) === CONFIG_SELF_POWERED_MASK
		const remoteWake = (configL & CONFIG_REMOTE_WAKE_MASK) === CONFIG_REMOTE_WAKE_MASK

		const maxPower = configH * MAX_POWER_MILLIAMP_PER_UNIT

		//
		// const chipConfigH = chipConfig >> 8 // 11
		const chipConfigL = chipConfig & MASK_8 // 10
		const isInIsochronous = (chipConfigL & CONFIG_IN_ISOCHRONOUS_MASK) === CONFIG_IN_ISOCHRONOUS_MASK
		const isOutIsochronous = (chipConfigL & CONFIG_OUT_ISOCHRONOUS_MASK) === CONFIG_OUT_ISOCHRONOUS_MASK
		const suspendPullDowns = (chipConfigL & CONFIG_SUSPEND_PULL_DOWN) === CONFIG_SUSPEND_PULL_DOWN
		const useSerial = (chipConfigL & CONFIG_USE_SERIAL) === CONFIG_USE_SERIAL
		const useUSBVersion  = (chipConfigL & CONFIG_USE_USB_VERSION) === CONFIG_USE_USB_VERSION

		//
		const decoder = new TextDecoder('utf-16le') // per-USB descriptor spec
		const manufactureStr = FTDIEEPROM.parseEEPROMDescriptorString(manufactureInfo, u16, usedChipInfo.eepromSize, decoder)
		const productStr = FTDIEEPROM.parseEEPROMDescriptorString(productInfo, u16, usedChipInfo.eepromSize, decoder)
		const serialStr = FTDIEEPROM.parseEEPROMDescriptorString(serialInfo, u16, usedChipInfo.eepromSize, decoder)

		//
		const chipSpecificInfo = FTDIEEPROM.parseEEPROM_ChipSpecific(buffer, usedChipInfo) ?? {}

		return {
			vendorId,
			productId,

			chipVersion: {
				chipMajor,
				chipMinor,
			},
			chipInfo: usedChipInfo,

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
