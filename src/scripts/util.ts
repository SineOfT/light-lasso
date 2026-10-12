/** function linearly interpolates */
export const lerp = (a: number, b: number, t: number) => a * (1-t) + b * t;
/** function inverses a linear interpolation */
export const invLerp = (a: number, b: number, x: number) => a === b ? a : (x - a) / (b - a);

/** function finds ratio between a and b as t value from 0 to 1 */
export const proportion = (a: number, b: number) => a+b === 0 ? 0 : a / (a+b);

/**
 * function generates a random string ID, in the form XXXX-XXXX-XXXX, where each X is a hexadecimal digit
 */
export const generateId = (): string => {
    const generateRandom4BitHex = () => Math.round(Math.random() * 0x10000).toString(16);
    return `${generateRandom4BitHex()}-${generateRandom4BitHex()}-${generateRandom4BitHex()}`;
}
