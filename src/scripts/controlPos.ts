import { posAdd, posSub, posMul, posLength, posDiv } from "./pos";

import type { pos } from "./pos";

/** type represents control positions associated with point, constrained by same direction */
export interface ControlPos {
    /** normalized direction of after control position */
    direction: pos,
    /** how far before control position is from anchor position */
    beforeLength: number,
    /** how far after control position is from anchor position */
    afterLength: number,
}

/** type represents empty placeholder control position, defaulting to zero length horizontal */
export const EMPTY_CONTROL_POS: ControlPos = {
    direction: { x: 1, y: 0 },
    beforeLength: 0,
    afterLength: 0,
}

/** function finds position of before control position */
export const getBeforeControlPos = (anchorPos: pos, controlPos: ControlPos) =>
    posAdd(anchorPos, posMul(controlPos.direction, -controlPos.beforeLength));
/** function finds position of before control position */
export const getAfterControlPos = (anchorPos: pos, controlPos: ControlPos) =>
    posAdd(anchorPos, posMul(controlPos.direction, controlPos.afterLength));

/**
 * function calculates new control positions when given changes made to either before or after position
 * @param anchorPos position of anchor point
 * @param controlPos control position to modify
 * @param changedPos which axes of control position changed
 * @param isAfter whether changed control position is before control position or after control position
 * @returns new control position
 */
export const calculateNewControlPos = (
    anchorPos: pos,
    controlPos: ControlPos,
    changedPos: Partial<pos>,
    isAfter: boolean,
): ControlPos => {
    // determine current position of modified control position 
    const currPos = isAfter
        ? getAfterControlPos( anchorPos, controlPos)
        : getBeforeControlPos(anchorPos, controlPos);

    // determine new position of modified control point
    const newPos: pos = { ...currPos, ...changedPos };

    // calculate direction and length of new control pos
    const newControlPosOffset = posSub(newPos, anchorPos);
    const newLength = posLength(newControlPosOffset);
    const newDirection = posDiv(newControlPosOffset, newLength);

    // determine offset of opposite control position from the anchor position
    const currOppositeLength = isAfter ? controlPos.beforeLength : controlPos.afterLength;
    const oppositeControlPosOffset = posMul(controlPos.direction, currOppositeLength * (isAfter ? -1 : 1));

    // calculate new length of opposite control pos by maintaining unmodified axes
    const newOppositeLength =
        changedPos.x === undefined ? Math.abs(oppositeControlPosOffset.x / newDirection.x)
      : changedPos.y === undefined ? Math.abs(oppositeControlPosOffset.y / newDirection.y)
      : currOppositeLength; // if no reference axis, just keep length same
    
    return isAfter
        ? {
            direction: newDirection,
            beforeLength: newOppositeLength,
            afterLength: newLength,
        }
        : {
            direction: posMul(newDirection, -1),
            beforeLength: newLength,
            afterLength: newOppositeLength,
        };
}
