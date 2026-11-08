/** biome-ignore-all lint/style/noNestedTernary: <explanation> */
import type {
	Mode,
	SPIBus,
	SPIOptions,
	TransferRequest,
	TransferResult,
} from '@johntalton/and-other-delights'
import { DEFAULT_SPI_MODE } from '@johntalton/and-other-delights'
import type { FTDIDevice } from '../ftdi.ts'
import {
	CLOCK_BASE_60,
	CLOCK_DEFAULT_STANDARD_MODE_100_kHz,
	Clock
} from '../mpsse/clock.ts'
import { H_COMMANDS, HOST_AND_MPSSE_MODE_COMMANDS, SHIFT_COMMAND } from '../mpsse/command.ts'
import { MPSSETemplate } from '../mpsse/mpsse-template.ts'
import { Util } from '../util.ts'


const CLOCK_PIN_MASK = 0b0000_0001
const MOSI_PIN_MASK =  0b0000_0010 // host out
const MISO_PIN_MASK =  0b0000_0100 // host in
const CS0_PIN_MASK =   0b0000_1000

const CS1_PIN_MASK =    0b0001_0000
const LED_TX_PIN_MASK = 0b0010_0000
const LED_RX_PIN_MASK = 0b0100_0000
const CLOCK_MONITOR_PIN_MASK =   0b1000_0000

const SPI_PIN_DIRECTION = 0b0000_1011

export const delayMs = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export interface FT232HSPIOptions {
	mode: Mode
	targetClockHz?: [number]
	secondChipSelect_pin4?: [boolean]
	ledTxRx_pin5_6?: [boolean]
}

export class FTDISPIBus implements SPIBus {
	readonly #device: FTDIDevice
	readonly #options: FT232HSPIOptions


	static async init(device: FTDIDevice, options?: FT232HSPIOptions): Promise<void> {
		// const transaction = Uint8Array.from([])
		// await device.sendData(transaction)
	}

	constructor(device: FTDIDevice, options?: FT232HSPIOptions) {
		this.#device = device
		this.#options = options ?? { mode: DEFAULT_SPI_MODE }
	}

	// async read() {

	// }

	// async write() {

	// }

	async transfer(request: TransferRequest, options?: SPIOptions): Promise<TransferResult> {
		// console.log('spi transfer', request)

		// await delayMs(100)

		const {
			sendBuffer,
			receiveBufferLength
		} = request

		const writeLength = sendBuffer?.byteLength ?? 0
		const writeLengthMinusOne = Math.max(0, writeLength - 1)
		const writeLengthHigh = (writeLengthMinusOne >> 8) & 0xFF
		const writeLengthLow = writeLengthMinusOne & 0xFF

		const readLength = Math.max(0, receiveBufferLength - 1)
		const readLengthHigh = (readLength >> 8) & 0xFF
		const readLengthLow = readLength & 0xFF

		// console.log('transfer read length', receiveBufferLength, readLength, readLengthHigh, readLengthLow)

		const sendBufferU8 = (sendBuffer === undefined) ?
			[] :
			ArrayBuffer.isView(sendBuffer) ?
				new Uint8Array(sendBuffer.buffer, sendBuffer.byteOffset, sendBuffer.byteLength) :
				new Uint8Array(sendBuffer)

		const divisor = Clock.clockDivisor(options?.speedHz ?? CLOCK_DEFAULT_STANDARD_MODE_100_kHz, CLOCK_BASE_60)

		const _totalBytesWritten = await this.#device.sendData(Uint8Array.from([
			H_COMMANDS.DISABLE_CLOCK_DIVIDE_BY_FIVE,
			...MPSSETemplate.setClockDivisor(divisor),
			H_COMMANDS.DISABLE_THREE_PHASE_CLOCKING,
			H_COMMANDS.DISABLE_ADAPTIVE_CLOCKING,

			...MPSSETemplate.gpioSetLow(CS0_PIN_MASK, SPI_PIN_DIRECTION), // idle clock High
			...MPSSETemplate.gpioSetLow(0, SPI_PIN_DIRECTION), // CS low

			SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE,  writeLengthLow, writeLengthHigh,
			...sendBufferU8,
			...((receiveBufferLength === 0) ? [] : [ SHIFT_COMMAND.IN_MSB_BYTES_POSITIVE_VE, readLengthLow, readLengthHigh ]),

			// ...MPSSETemplate.shiftOutBytes(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, writeLength, [ ...sendBufferU8 ]),
			// ...MPSSETemplate.shiftInByte(SHIFT_COMMAND.IN_MSB_BYTES_POSITIVE_VE, receiveBufferLength),

			...MPSSETemplate.gpioSetLow(CS0_PIN_MASK, SPI_PIN_DIRECTION), // CS high
			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE // do it now
		]))

		if(receiveBufferLength === 0) {
			return {
				bytesWritten: writeLength
			}
		}

		const result = await Util.pollData(this.#device, receiveBufferLength)

		return {
			bytesWritten: writeLength,
			readBuffer: result
		}
	}

}
