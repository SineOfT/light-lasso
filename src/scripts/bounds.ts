import type { pos } from "./pos";

/** type defines bounds to constrain position within minimum and maximum values */
export type PosBounds = {
    x: { min: number|undefined, max: number|undefined }|undefined,
    y: { min: number|undefined, max: number|undefined }|undefined,
}|undefined;

/**
 * function clamps position to be within given bounds
 * @param pos the position to clamp
 * @param bounds the bounds within which the position should be clamped
 * @returns the position clamped to the bounds
 */
export const clampPosToBounds = (pos: pos, bounds: PosBounds): pos => ({
    x: Math.min(Math.max(pos.x, bounds?.x?.min ?? -Infinity), bounds?.x?.max ?? Infinity),
    y: Math.min(Math.max(pos.y, bounds?.y?.min ?? -Infinity), bounds?.y?.max ?? Infinity),
})
