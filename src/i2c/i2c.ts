/** biome-ignore-all lint/style/noNestedTernary: preserve const assign */
/** biome-ignore-all lint/performance/noAwaitInLoops: simplify impl */
/** biome-ignore-all lint/style/useConsistentArrayType: miss-classified */
import type {
	I2CAddress,
	I2CBufferSource,
	I2CBus,
	I2CCommand,
	I2CReadResult,
	I2CWriteResult
} from '@johntalton/and-other-delights'
import type { FTDIDevice } from '../ftdi.ts'
import { CLOCK_DEFAULT_STANDARD_MODE_100_kHz } from '../mpsse/clock.ts'
import { DeviceStatus } from '../status.ts'
import { DEFAULT_DATA_READ_SIZE, Util } from '../util.ts'
import { I2CTemplate } from './i2c-template.ts'
import { range } from './range.ts'

export function checkAck(data: Uint8Array<ArrayBuffer>): boolean {
	if(data.byteLength !== 1) {
		console.log('more ack', data)
		// throw new Error('not just an ack')
	}
	const [ byte ] = data
	if(byte === undefined) { return false }

	return  (byte & 0b0000_0001) === 0
}

export async function sendAndReadACK(device: FTDIDevice, transaction: Uint8Array<ArrayBuffer>): Promise<boolean> {
	await device.sendData(transaction)
	const response = await Util.pollData(device)
	return checkAck(response)
}

export async function readData(device: FTDIDevice, length: number, targetBuffer?: I2CBufferSource): Promise<I2CBufferSource> {
	const buffer = (targetBuffer === undefined) ?
		new Uint8Array(length) :
		(ArrayBuffer.isView(targetBuffer) ?
			new Uint8Array(targetBuffer.buffer, targetBuffer.byteOffset, length) :
			new Uint8Array(targetBuffer, 0, length))

	// c0 low - RX-LED-emulation
	// await device.mpsse.setGpioHigh(0b0000_0000, 0b0000_0001)

	for(let offset = 0; offset < length; offset += 1) {
		const ack = offset + 1 < length // is last byte

		const readByteTransaction = I2CTemplate.readData(ack)
		await device.sendData(readByteTransaction)
		const byteReadResponse = await Util.pollData(device)

		buffer.set(new Uint8Array(byteReadResponse.buffer, byteReadResponse.byteOffset, 1), offset)
	}

	// c0 high - RX-LED-emulation
	// await device.mpsse.setGpioHigh(0b0000_0001, 0b0000_0001)

	return buffer
}

export async function writeData(device: FTDIDevice, length: number, buffer: I2CBufferSource): Promise<void> {
	const u8 = ArrayBuffer.isView(buffer) ?
		new Uint8Array(buffer.buffer, buffer.byteOffset, length) :
		new Uint8Array(buffer, 0, length)

	for(let i = 0; i < length; i += 1) {
		const data = u8[i]
		if(data === undefined) { throw new Error('data byte undefined') }

		const writeAck = await sendAndReadACK(device, I2CTemplate.writeByte(data))
		if(!writeAck) { throw new Error('write data nack') }
	}
}

export interface FT232HBusOptions {
	enableClockDivideBy5?: boolean
	targetClockHz?: number
}

export class FT232HBus implements I2CBus {
	readonly name = 'FT232H'
	readonly supportsScan = true
	readonly supportsMultiByteDataAddress = false

	readonly #device: FTDIDevice

	static async init(device: FTDIDevice, options?: FT232HBusOptions): Promise<void> {
		const transaction = I2CTemplate.initI2C(options?.targetClockHz ?? CLOCK_DEFAULT_STANDARD_MODE_100_kHz, options?.enableClockDivideBy5 ?? false)
		await device.sendData(transaction)

		// todo this is direct read, not pollData
		const result = await device.readData(DEFAULT_DATA_READ_SIZE)
		const status = DeviceStatus.parse(result)
		console.log('init status', status)
	}

	constructor(device: FTDIDevice) {
		this.#device = device
	}

	// biome-ignore lint/nursery/useThisInClassMethods: close is a noop
	close(): void {
		// noop
	}

	async scan(): Promise<I2CAddress[]> {
		const result: Array<I2CAddress> = []

		const I2C_RANGE_START = 0x08
		const I2C_RANGE_END = 0x77

		for(const addr of range(I2C_RANGE_START, I2C_RANGE_END)) {
			//
			const startAck = await sendAndReadACK(this.#device, I2CTemplate.startWithAddress(addr, true))
			if(startAck) { result.push(addr) }

			// todo reset or send stop?
		}

		return result
	}

	// biome-ignore lint/nursery/useThisInClassMethods: no impl
	async sendByte(_address: I2CAddress, _byteValue: number): Promise<void> {
		throw new Error('Method not implemented.')
	}

	async readI2cBlock(address: I2CAddress, cmd: I2CCommand, length: number, targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		//
		const startAck = await sendAndReadACK(this.#device, I2CTemplate.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const cmdBuffer = Uint8Array.from(Array.isArray(cmd) ? cmd : [ cmd ])
		await writeData(this.#device, cmdBuffer.byteLength, cmdBuffer)

		//
		const repeatStartAck = await sendAndReadACK(this.#device, I2CTemplate.repeatStartWithAddress(address))
		if(!repeatStartAck) { throw new Error('repeat start nack') }

		//
		const buffer = await readData(this.#device, length, targetBuffer)

		//
		await this.#device.sendData(I2CTemplate.stop())

		return {
			bytesRead: length,
			buffer
		}
	}

	async writeI2cBlock(address: I2CAddress, cmd: I2CCommand, length: number, buffer: I2CBufferSource): Promise<I2CWriteResult> {
		if(Array.isArray(cmd)) { throw new Error('single command byte only') }

		//
		const startAck = await sendAndReadACK(this.#device, I2CTemplate.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const cmdBuffer = Uint8Array.from(Array.isArray(cmd) ? cmd : [ cmd ])
		await writeData(this.#device, cmdBuffer.byteLength, cmdBuffer)

		//
		await writeData(this.#device, length, buffer)

		//
		await this.#device.sendData(I2CTemplate.stop())

		return {
			bytesWritten: length,
			buffer
		}
	}

	async i2cRead(address: I2CAddress, length: number, targetBuffer?: I2CBufferSource): Promise<I2CReadResult> {
		//
		const startAck = await sendAndReadACK(this.#device, I2CTemplate.startWithAddress(address))
		if(!startAck) { throw new Error('start with address nack') }

		//
		const buffer = await readData(this.#device, length, targetBuffer)

		//
		await this.#device.sendData(I2CTemplate.stop())

		return {
			bytesRead: length,
			buffer
		}
	}

	async i2cWrite(address: I2CAddress, length: number, buffer: I2CBufferSource): Promise<I2CWriteResult> {
		//
		const startAck = await sendAndReadACK(this.#device, I2CTemplate.startWithAddress(address, true))
		if(!startAck) { throw new Error('start with address nack') }

		//
		await writeData(this.#device, length, buffer)

		//
		await this.#device.sendData(I2CTemplate.stop())

		return {
			bytesWritten: length,
			buffer
		}
	}
}
