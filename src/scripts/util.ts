/** function linearly interpolates */
export const lerp = (a: number, b: number, t: number) => a * (1-t) + b * t;
/** function inverses a linear interpolation */
export const invLerp = (a: number, b: number, x: number) => a === b ? a : (x - a) / (b - a);

/**
 * function generates a random string ID, in the form XXXX-XXXX-XXXX, where each X is a hexadecimal digit
 * @param existingIds the IDs that already exist in the system, to ensure that no duplicate IDs are generated
 */
export const generateId = (existingIds: string[]): string => {
    const generateRandom4BitHex = () => Math.round(Math.random() * 0x10000).toString(16);
    const id = `${generateRandom4BitHex()}-${generateRandom4BitHex()}-${generateRandom4BitHex()}`;
    if (existingIds.includes(id)) { return generateId(existingIds); }
    return id;
}
