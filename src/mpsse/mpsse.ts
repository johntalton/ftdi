/** biome-ignore-all lint/style/useConsistentArrayType: miss-classified */
import type { FTDIDevice } from '../ftdi.ts'
import { Util } from '../util.ts'
import { BAD_COMMAND, BAD_COMMAND_RESPONSE } from './command.ts'
import { MPSSETemplate } from './mpsse-template.ts'

export class MPSSE {
	readonly #device: FTDIDevice

	constructor(device: FTDIDevice) {
		this.#device = device
	}

	async executeCommands(commands: Array<number>|number): Promise<void> {
		const cmdList = Array.isArray(commands) ? commands : [ commands ]
		const flatCmdList = cmdList.flat()
		await this.#device.sendData(Uint8Array.from(flatCmdList))
	}

	async validateMPSSE(command = BAD_COMMAND): Promise<boolean> {
		await this.executeCommands(command)
		const response = await Util.pollData(this.#device).catch(() => undefined)

		if(response === undefined) { return false }
		const [ first, second ] = response
		if(first !== BAD_COMMAND_RESPONSE) { return false }
		if(second !== command) { return false }
		return true
	}

	async setGpioHigh(pins: number, directions: number): Promise<void> {
		const command = MPSSETemplate.gpioSetHigh(pins, directions)
		return this.executeCommands(command)
	}

	async setGpioLow(pins: number, directions: number): Promise<void> {
		const command = MPSSETemplate.gpioSetLow(pins, directions)
		return this.executeCommands(command)
	}

	async getGpioHigh(): Promise<void> {
		const command = MPSSETemplate.gpioGetHigh()
		return this.executeCommands(command)
	}

	async getGpioLow(): Promise<void> {
		const command = MPSSETemplate.gpioGetLow()
		return this.executeCommands(command)
	}


	async setClockDivisor(divisor: number): Promise<void> {
		const command = MPSSETemplate.setClockDivisor(divisor)
		return this.executeCommands(command)
	}

	// async waitIOHigh(): Promise<void> {s

	// async waitIOLow(): Promise<void> {
	// }

	async enableClockDivideBy5(enable = true): Promise<void> {
		const command = MPSSETemplate.enableClockDivideBy5(enable)
		return this.executeCommands(command)
	}

	async enableThreePhaseClocking(enable = true): Promise<void> {
		const command = MPSSETemplate.enableThreePhaseClocking(enable)
		return this.executeCommands(command)
	}

	// async clcokWaitIOHigh(): Promise<void> {
	// }

	// async clockWaitIOLow(): Promise<void> {
	// }

	async enableAdaptiveClocking(enable = true): Promise<void> {
		const command = MPSSETemplate.enableAdaptiveClocking(enable)
		return this.executeCommands(command)
	}

	// async clockBitsNoTransferOrUntilHigh(): Promise<void> {
	// }

	// async clockByteNoTransferOrUntilLow(): Promise<void> {
	// }

	async setDriveOnlyZero(pinsLow: number, pinsHigh: number): Promise<void> {
		const command = MPSSETemplate.setDriveOnlyZero(pinsLow, pinsHigh)
		return this.executeCommands(command)
	}
}


