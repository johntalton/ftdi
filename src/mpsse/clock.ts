
export const CLOCK_BASE_12 = 12_000_000  // 91 Hz - 6 MHz
export const CLOCK_BASE_60 = 60_000_000  // 457 Hz - 30 MHz

export const DIVISOR_MIN = 0
export const DIVISOR_MAX = 0xFF_FF


export const CLOCK_DEFAULT_STANDARD_MODE_100_kHz = 100 * 1000
export const CLOCK_DEFAULT_FAST_MODE_400_kHz = 400 * 1000
export const CLOCK_DEFAULT_FAST_MODE_PLUS_1_MHz = 1 * 1000 * 1000
export const CLOCK_DEFAULT_HIGH_SPEED_MODE_3_4_MHz = 3.4 * 1000 * 1000
export const CLOCK_DEFAULT_ULTRA_FAST_MODE_5_MHz = 5 * 1000 * 1000


export type ClockBase = typeof CLOCK_BASE_12 | typeof CLOCK_BASE_60

export class Clock {
	static clockHz(divisor: number, base: ClockBase): number {
		return (base / ((1 + divisor) * 2))
	}

	static clockDivisor(hertz: number, base: ClockBase): number {
		const raw =  Math.trunc(base / (hertz * 2)) - 1

		if(raw < DIVISOR_MIN) { return DIVISOR_MIN }
		if(raw > DIVISOR_MAX) { return DIVISOR_MAX }
		return raw
	}

	static hertzToHuman(hertz: number): string {
		if(hertz >= (1000 * 1000)) { return `${hertz / (1000 * 1000)} MHz`}
		if(hertz >= (1000)) { return `${hertz / (1000)} kHz`}
		return `${hertz} Hz`
	}
}
