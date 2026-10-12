import { posAdd, posMul } from "./pos";

import type { pos } from "./pos";

/** type represents control positions associated with point, constrained by same direction */
export interface controlPos {
    /** normalized direction of after control position */
    direction: pos,
    /** how far before control position is from anchor position */
    beforeLength: number,
    /** how far after control position is from anchor position */
    afterLength: number,
}

/** type represents empty placeholder control position, defaulting to zero length horizontal */
export const EMPTY_CONTROL_POS: controlPos = {
    direction: { x: 1, y: 0 },
    beforeLength: 0,
    afterLength: 0,
}

/** function finds position of before control position */
export const getBeforeControlPos = (anchorPos: pos, controlPos: controlPos) =>
    posAdd(anchorPos, posMul(controlPos.direction, -controlPos.beforeLength));
/** function finds position of before control position */
export const getAfterControlPos = (anchorPos: pos, controlPos: controlPos) =>
    posAdd(anchorPos, posMul(controlPos.direction, controlPos.afterLength));
