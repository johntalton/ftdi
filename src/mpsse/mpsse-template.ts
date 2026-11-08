/** biome-ignore-all lint/style/useConsistentArrayType: miss-classified */
/** biome-ignore-all lint/nursery/noMisleadingReturnType: false-positive */
import {
	CLOCK_DIVISOR_COMMANDS,
	FT232H_ONLY_COMMANDS,
	H_COMMANDS,
	LOOPBACK_COMMANDS,
	PIN_STATE_COMMANDS,
	type ShiftCommand
} from './command.ts'


export class MPSSETemplate {
	static shiftOutByte(command: ShiftCommand, length: number, data: number): Array<number> {
		if(length <= 0) { throw new RangeError('can not read zero length') }
		const lengthMinusOne = length - 1
		const lengthL = lengthMinusOne & 0xFF
		const lengthH = (lengthMinusOne >> 8) & 0xFF
		return [ command, lengthL, lengthH, data ]
	}

	static shiftOutBytes(command: ShiftCommand, length: number, data: Array<number>): Array<number> {
		if(length <= 0) { throw new RangeError('can not read zero length') }
		const lengthMinusOne = length - 1
		const lengthL = lengthMinusOne & 0xFF
		const lengthH = (lengthMinusOne >> 8) & 0xFF
		return [ command, lengthL, lengthH, ...data ]
	}

	static shiftInByte(command: ShiftCommand, length: number): Array<number> {
		if(length <= 0) { throw new RangeError('can not read zero length') }
		const lengthMinusOne = length - 1
		const lengthL = lengthMinusOne & 0xFF
		const lengthH = (lengthMinusOne >> 8) & 0xFF
		return [ command, lengthL, lengthH ]
	}

	static shiftOutBits(command: ShiftCommand, length: number, data: number): Array<number> {
		if(length <= 0) { throw new RangeError('can not read zero length') }
		const lengthMinusOne = length - 1
		return [ command, lengthMinusOne, data ]
	}

	static shiftInBits(command: ShiftCommand, length: number): Array<number> {
		if(length <= 0) { throw new RangeError('can not read zero length') }
		const lengthMinusOne = length - 1
		return [ command, lengthMinusOne ]
	}

	static gpioSetHigh(pins: number, directions: number): Array<number> {
		return [
			PIN_STATE_COMMANDS.SET_DATA_BITS_HIGH_BYTE,
			pins,
			directions
		]
	}

	static gpioSetLow(pins: number, directions: number): Array<number> {
		return [
			PIN_STATE_COMMANDS.SET_DATA_BITS_LOW_BYTE,
			pins,
			directions
		]
	}

	static gpioGetHigh(): Array<number> {
		return [ PIN_STATE_COMMANDS.READ_DATA_BITS_HIGH_BYTE ]
	}

	static gpioGetLow(): Array<number> {
		return [ PIN_STATE_COMMANDS.READ_DATA_BITS_LOW_BYTE ]
	}

	static setClockDivisor(divisor: number): Array<number> {
		const divisorL = divisor & 0xFF
		const divisorH = (divisor >> 8) & 0xFF

		return [
			CLOCK_DIVISOR_COMMANDS.SET_CLK_DIVISOR,
			divisorL,
			divisorH
		]
	}

	static enableLoopback(enable = true): Array<number> {
		if(enable) { return [ LOOPBACK_COMMANDS.ENABLED ] }
		return [ LOOPBACK_COMMANDS.DISABLE ]
	}

	static enableClockDivideBy5(enable = true): Array<number> {
		if(enable) { return [ H_COMMANDS.ENABLE_CLOCK_DIVIDE_BY_FIVE ] }
		return [ H_COMMANDS.DISABLE_CLOCK_DIVIDE_BY_FIVE]
	}

	static enableThreePhaseClocking(enable = true): Array<number> {
		if(enable) { return [ H_COMMANDS.ENABLE_THREE_PHASE_CLOCKING ] }
		return [ H_COMMANDS.DISABLE_THREE_PHASE_CLOCKING ]
	}

	static enableAdaptiveClocking(enable = true): Array<number> {
		if(enable) { return [ H_COMMANDS.ENABLE_ADAPTIVE_CLOCKING ] }
		return [ H_COMMANDS.DISABLE_ADAPTIVE_CLOCKING ]
	}

	static setDriveOnlyZero(pinsLow: number, pinsHigh: number): Array<number> {
		return [
			FT232H_ONLY_COMMANDS.SET_IO_ONLY_DRIVE_LOW,
			pinsLow,
			pinsHigh
		]
	}
}

