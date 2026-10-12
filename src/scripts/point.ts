import { posDistance, posAdd, posSub, posMul, posDiv, posLength, posLerp, posRound } from "./pos";
import { getAfterControlPos, getBeforeControlPos } from "./controlPos";

import type { pos } from "./pos";
import type { controlPos } from "./controlPos";
import type { posPoint } from "./posPoint";
import type { dataPoint } from "./dataPoint";
import type { curve, curvePoint } from "./curve";

/** type defines point, which has constraint of requiring to hold control position */
export interface point {
    controlPos: controlPos,
}

/** type defines set of functions that can be returned by updater to update different types of points */
export interface pointUpdaterFunctions {
    updatePosPoints?: (prevPoints: Map<string, posPoint>) => Map<string, posPoint>,
    updateRadiusPoints?: (prevRadiusPoints: Map<string, dataPoint>) => Map<string, dataPoint>,
    updateCurves?: (prevCurves: Map<string, curve>) => Map<string, curve>,
    newSelectedPoint?: selectedPoint|null,
}

/** type represents function that calculates new point on curve based on neighboring points */
export type newPointCalculator<T extends point> = (
    beforePoint: curvePoint<T>|undefined,
    afterPoint:  curvePoint<T>|undefined,
) => {
    newPoint: T,
    t: number|null,
    newBeforeControlPosLength: number|undefined,
    newAfterControlPosLength: number|undefined,
}

/**
 * type represents point
 * @template T type of data stored in point
 */
export interface pointType<T extends point> {
    /** key used by updater function to update relevant points */
    updaterFunctionKey: keyof pointUpdaterFunctions,
    /** function calculates position of new point added between up to 2 existing points */
    calculateNewPoint: newPointCalculator<T>,
}

/** type defines 3 different types of positions stored in point */
export type pointHandleType = 'anchor'|'beforeControl'|'afterControl';

/** type represents description of selected point, indicating ID and which point in group */
export interface selectedPoint {
    /** ID of selected point */
    id: string,
    /** whether the anchor position, control position, or inverse control position is selected */
    type: pointHandleType,
};

/** type represents description of point that can be dragged on curve editor */
export interface draggablePoint {
    /** ID of the point */
    id: string,
    /** position of the point */
    pos: pos,
    /** position of the point this point is controlling, if set */
    controlForPoint?: pos,
    /** which type of point this position represents */
    type: pointHandleType,
    /** whether or not this point is currently selected */
    isSelected: boolean,
}

/**
 * function generates changes that need to be made to point when point updated
 * @template T the type of data to update a new point of
 * @param pointType the type of the point to change
 * @param points a record of all existing points of the given type
 * @param pointId ID of the point to update
 * @param changedPoint the values of the point that have changed from the update
 * @returns functions that update affected points
 */
export const updatePointFromUpdate = <T extends point>(
    pointType: pointType<T>,
    points: Map<string, T>,
    pointId: string,
    changedPoint: Partial<T>,
) => {
    // find current value of point
    const point = points.get(pointId);
    if (point === undefined) { return; }

    // find new value of point by applying changes
    const newPoint: T = { ...point, ...changedPoint };

    // return functions that updates points
    return {
        [pointType.updaterFunctionKey]: (prevPoints: Map<string, T>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(pointId, newPoint);
            return newPoints;
        },
    };
}

/**
 * function generates changes needed to update current selected point
 * @param newSelectedPoint the newly selected point, or null if deselected
 * @returns new selected point
*/
export const updateSelectedPoint
    = (newSelectedPoint: selectedPoint|null) => ({ newSelectedPoint });

/**
 * function calculates where to add position of new point added between 2 existing points
 * @param beforeCurvePoint point right before new point to add
 * @param afterCurvePoint point right after new point to add
 * @returns new point along with updates to neighboring control positions
 */
export const calculateNewPointBetween = (
    beforeCurvePoint: { anchorPos: pos, controlPos: controlPos },
    afterCurvePoint:  { anchorPos: pos, controlPos: controlPos },
): {
    newPoint: { anchorPos: pos, controlPos: controlPos },
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
