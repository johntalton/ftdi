/** biome-ignore-all lint/style/noNestedTernary: we like them */
import type {
	SPIBus,
	SPIOptions,
	TransferRequest,
	TransferResult,
} from '@johntalton/and-other-delights'
import { DEFAULT_SPI_MODE, MODE_0 } from '@johntalton/and-other-delights'
import type { FTDIDevice } from '../ftdi.ts'
import {
	CLOCK_BASE_60,
	CLOCK_DEFAULT_STANDARD_MODE_100_kHz,
	Clock
} from '../mpsse/clock.ts'
import { H_COMMANDS, HOST_AND_MPSSE_MODE_COMMANDS, SHIFT_COMMAND } from '../mpsse/command.ts'
import { MPSSETemplate } from '../mpsse/mpsse-template.ts'
import { Util } from '../util.ts'


// const CLOCK_PIN_MASK = 0b0000_0001
// const MOSI_PIN_MASK =  0b0000_0010 // host out
// const MISO_PIN_MASK =  0b0000_0100 // host in
const CS0_PIN_MASK =   0b0000_1000

// const CS1_PIN_MASK =    0b0001_0000
// const LED_TX_PIN_MASK = 0b0010_0000
// const LED_RX_PIN_MASK = 0b0100_0000
// const CLOCK_MONITOR_PIN_MASK =   0b1000_0000

const SPI_PIN_DIRECTION = 0b0000_1011

export const delayMs = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export interface FT232HSPIOptions extends SPIOptions {
	chipSelect1?: [boolean]
	ledRxTx?: [boolean]
}

export class FTDISPIBus implements SPIBus {
	readonly #device: FTDIDevice
	readonly #options: Partial<FT232HSPIOptions>

	constructor(device: FTDIDevice, options?: Partial<FT232HSPIOptions>) {
		this.#device = device
		this.#options = options ?? {}
	}

	async transfer(request: TransferRequest, options?: Partial<FT232HSPIOptions>): Promise<TransferResult> {
		const {
			mode, speedHz
		} = {
			mode: DEFAULT_SPI_MODE,
			speedHz: CLOCK_DEFAULT_STANDARD_MODE_100_kHz,
			...this.#options,
			...(options ?? {})
		}

		const {
			sendBuffer,
			receiveBufferLength
		} = request

		if(mode !== MODE_0) { throw new Error('currently mode 0 only') }

		const writeLength = sendBuffer?.byteLength ?? 0
		const sendBufferU8 = (sendBuffer === undefined) ?
			[] :
			ArrayBuffer.isView(sendBuffer) ?
				new Uint8Array(sendBuffer.buffer, sendBuffer.byteOffset, sendBuffer.byteLength) :
				new Uint8Array(sendBuffer)

		// calc clock divider for non-div-5
		const divisor = Clock.clockDivisor(speedHz, CLOCK_BASE_60)

		const totalBytesWritten = await this.#device.sendData(Uint8Array.from([
			// preamble to set state
			H_COMMANDS.DISABLE_CLOCK_DIVIDE_BY_FIVE,
			...MPSSETemplate.setClockDivisor(divisor),
			H_COMMANDS.DISABLE_THREE_PHASE_CLOCKING,
			H_COMMANDS.DISABLE_ADAPTIVE_CLOCKING,

			// prep pins
			...MPSSETemplate.gpioSetLow(CS0_PIN_MASK, SPI_PIN_DIRECTION), // CS High / Clock Low
			...MPSSETemplate.gpioSetLow(0, SPI_PIN_DIRECTION), // CS Low / Clock Low

			// transfer data
			...MPSSETemplate.shiftOutBytes(SHIFT_COMMAND.OUT_MSB_BYTES_NEGATIVE_VE, writeLength, [ ...sendBufferU8 ]),
			...((receiveBufferLength === 0) ? [] : MPSSETemplate.shiftInByte(SHIFT_COMMAND.IN_MSB_BYTES_POSITIVE_VE, receiveBufferLength)),

			// return pins to idle state
			...MPSSETemplate.gpioSetLow(CS0_PIN_MASK, SPI_PIN_DIRECTION), // CS high / Clock Low

			HOST_AND_MPSSE_MODE_COMMANDS.SEND_IMMEDIATE // do it now
		]))

		if(totalBytesWritten === 0) { throw new Error('no bytes written') }

		if(receiveBufferLength === 0) {
			return {
				bytesWritten: writeLength
			}
		}

		// consume buffer
		const result = await Util.pollData(this.#device, receiveBufferLength)

		return {
			bytesWritten: writeLength,
			readBuffer: result
		}
	}

}
