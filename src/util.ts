/** biome-ignore-all lint/performance/noAwaitInLoops: <explanation> */
/** biome-ignore-all lint/style/useConsistentArrayType: <explanation> */
import type { FT232H } from "./ft232h.ts"
import { STATUS_PREFIX_LENGTH } from "./status.ts"

export interface ChipInfo {
	major: number
	minor: number
	name: string

	mpsse?: boolean
	cbus?: boolean
	driveZero?: boolean

	eepromSize?: number
}

export const USB_MAJOR_TYPE_BM = 4
export const USB_MAJOR_TYPE_2232C = 5
export const USB_MAJOR_TYPE_R = 6
export const USB_MAJOR_TYPE_2232H = 7
export const USB_MAJOR_TYPE_4232H = 8
export const USB_MAJOR_TYPE_232H = 9

export const CHIP_INFO: Array<ChipInfo> = [
	// FT8U232AM FT8U245AM // AM Series 1st gen
	// FT245BM FT232BL FT232BQ FT245BL // BM Series 2nd gen
	// FT2232C FT2232D
	// FT4222H // Hi-Speed Quad SPI/I2C Bridge
	// FT600Q / FT601Q / FT602Q
	{ major: 0x02, minor: 0, name: 'FT232AM' }, // 1st gen
	{ major: 0x04, minor: 0, name: 'FT232BM', eepromSize: 64 }, // 2nd gen
	{ major: 0x05, minor: 0, name: 'FT2232C', mpsse: true },
	{ major: 0x06, minor: 0, name: 'FT232R', eepromSize: 64, cbus: true },
	{ major: 0x07, minor: 0, name: 'FT2232H', mpsse: true }, // Dual Channel UART/FIFO/MPSSE
	{ major: 0x08, minor: 0, name: 'FT4232H', mpsse: true }, // Quad Channel UART/FIFO/MPSSE
	{ major: 0x09, minor: 0, name: 'FT232H', eepromSize: 128, mpsse: true, driveZero: true, cbus: true }, // Single Channel UART/FIFO/MPSSE
	{ major: 0x10, minor: 0, name: 'FT-X', cbus: true },
	{ major: 0x20, minor: 0, name: 'FT2233HP' }, // Dual Channel Type-C + Power Delivery
	{ major: 0x28, minor: 0, name: 'FT2233HP' },
	{ major: 0x29, minor: 0, name: 'FT4233HP' }, // Quad Channel Type-C + Power Delivery
	{ major: 0x30, minor: 0, name: 'FT2232HP' }, // Dual Channel Type-C + Power Delivery
	{ major: 0x31, minor: 0, name: 'FT4232HP', mpsse: true }, // Quad Channel Type-C + Power Delivery
	{ major: 0x32, minor: 0, name: 'FT233HP' }, // Single Channel Type-C + Power Delivery
	{ major: 0x33, minor: 0, name: 'FT232HP' }, // Single Channel Type-C + Power Delivery
	{ major: 0x36, minor: 0, name: 'FT4232HA', mpsse: true }, // Automotive Grade Quad UART
]


export const DEFAULT_DATA_READ_SIZE = 64
export const DEFAULT_MAX_POLL_ATTEMPTS = 5

export class Util {
	static chip(major: number, minor: number): ChipInfo | undefined {
		const info = CHIP_INFO.find(ci => ci.major === major && ci.minor === minor)
		if(info === undefined) { return undefined }
		return info
	}

	static async pollData(device: FT232H, attempts = DEFAULT_MAX_POLL_ATTEMPTS): Promise<Uint8Array<ArrayBuffer>> {
		for(let i = 0; i < attempts; i += 1) {
			const response = await device.readData(DEFAULT_DATA_READ_SIZE)
			if(response.byteLength === STATUS_PREFIX_LENGTH) { continue }
			if(response === undefined) { throw new Error('no response') }
			// const status = DeviceStatus.parse(response)
			// console.log('attempts', i)
			return new Uint8Array(response.buffer, STATUS_PREFIX_LENGTH)
		}

		throw new Error('no valid data acquired')
	}
}
