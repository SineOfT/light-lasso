import { posSub, posDiv, posLength, posLerp, posRound } from "./pos";
import { getAfterControlPos, getBeforeControlPos } from "./controlPos";

import type { pos } from "./pos";
import type { ControlPos } from "./controlPos";
import type { PosPoint } from "./posPoint";
import type { DataPoint } from "./dataPoint";
import type { Curve, CurvePoint } from "./curve";

/** type defines point, which has constraint of requiring to hold control position */
export interface Point {
    controlPos: ControlPos,
}

/** type defines point that can have unfilled values, used to change only certain parts of point */
export type PartialPoint<T extends Point> = Partial<
    { controlPos: Partial<T['controlPos']> }
  & { [P in Exclude<keyof T, 'controlPos'>]: T[P] }
>

/** type defines set of functions that can be returned by updater to update different types of points */
export interface PointUpdaterFunctions {
    updatePosPoints?: (prevPoints: Map<string, PosPoint>) => Map<string, PosPoint>,
    updateRadiusPoints?: (prevRadiusPoints: Map<string, DataPoint>) => Map<string, DataPoint>,
    updateCurves?: (prevCurves: Map<string, Curve>) => Map<string, Curve>,
    newSelectedPoint?: SelectedPoint|null,
}

/** type represents function that calculates new point on curve based on neighboring points */
export type NewPointCalculator<T extends Point> = (
    beforePoint: CurvePoint<T>|undefined,
    afterPoint:  CurvePoint<T>|undefined,
) => {
    newPoint: T,
    t: number|null,
    newBeforeControlPosLength: number|undefined,
    newAfterControlPosLength: number|undefined,
}

/**
 * type represents function that calculates new t value on curve point when given point deleted
 */
export type NewDeletedPointTCalculator<T extends Point> = (
    deletedPoint: CurvePoint<T>,
    beforePoint: CurvePoint<T>|undefined,
    afterPoint: CurvePoint<T>|undefined,
) => number|undefined;

/**
 * type represents point
 * @template T type of data stored in point
 */
export interface PointType<T extends Point> {
    /** key used by updater function to update relevant points */
    updaterFunctionKey: keyof PointUpdaterFunctions,
    /** function calculates position of new point added between up to 2 existing points */
    calculateNewPoint: NewPointCalculator<T>,
    /** function calculates new t value on curve point when point deleted */
    calculateNewDeletedPointT: NewDeletedPointTCalculator<T>,
}

/** type defines 3 different types of positions stored in point */
export type PointHandleType = 'anchor'|'beforeControl'|'afterControl';

/** type represents description of selected point, indicating ID and which point in group */
export interface SelectedPoint {
    /** ID of selected point */
    id: string,
    /** whether the anchor position, control position, or inverse control position is selected */
    type: PointHandleType,
};

/**
 * function generates changes needed to update current selected point
 * @param newSelectedPoint the newly selected point, or null if deselected
 * @returns new selected point
*/
export const updateSelectedPoint
    = (newSelectedPoint: SelectedPoint|null) => ({ newSelectedPoint });

/**
 * function calculates where to add position of new point added between 2 existing points
 * @param beforeCurvePoint point right before new point to add
 * @param afterCurvePoint point right after new point to add
 * @returns new point along with updates to neighboring control positions
 */
export const calculateNewPointBetween = (
    beforeCurvePoint: { anchorPos: pos, controlPos: ControlPos },
    afterCurvePoint:  { anchorPos: pos, controlPos: ControlPos },
): {
    newPoint: { anchorPos: pos, controlPos: ControlPos },
    newBeforeControlPosLength: number,
    newAfterControlPosLength: number,
} => {
    // find positions of control positions
    const beforeControlPos = getAfterControlPos(beforeCurvePoint.anchorPos, beforeCurvePoint.controlPos);
    const afterControlPos = getBeforeControlPos(afterCurvePoint.anchorPos,  afterCurvePoint.controlPos );

    // find positions of intermediary positions in bezier curve
    const a1 = posLerp(beforeCurvePoint.anchorPos, beforeControlPos, 0.5);
    const a2 = posLerp(afterCurvePoint.anchorPos,  afterControlPos,  0.5);
    const a3 = posLerp(beforeControlPos,      afterControlPos,  0.5);
    const b1 = posLerp(a1, a2, 0.5);
    const b2 = posLerp(a3, a2, 0.5);
    const c1 = posLerp(b1, b2, 0.5);

    // determine new point
    const newBeforeControlPos = posSub(b1, c1);
    const newAfterControlPos  = posSub(b2, c1);
    const beforeLength = posLength(newBeforeControlPos);
    const afterLength  = posLength(newAfterControlPos);
    const direction = posDiv(newAfterControlPos, afterLength);
    const newPoint = {
        anchorPos: posRound(c1), // round to nearest integer
        controlPos: { direction, beforeLength, afterLength },
    };

    // determine new lengths of neighboring control positions
    const newBeforeControlPosLength = beforeCurvePoint.controlPos.afterLength / 2;
    const newAfterControlPosLength  = afterCurvePoint.controlPos.beforeLength / 2;

    return { newPoint, newBeforeControlPosLength, newAfterControlPosLength };
}
