import { calculateNewPointBetween } from './point';
import { EMPTY_CONTROL_POS } from './controlPos';

import type { newPointCalculator, pointType } from './point';
import type { controlPos } from './controlPos';

/** type represents changes in data associated with points as progress along curve */
export type dataPoint = {
    /** the value of the data at this point */
    value: number,
    /** the position of the control point used to defined transitions between neighboring data */
    controlPos: controlPos,
};

/**
 * function calculates value of new data added between up to 2 existing data points
 * @param beforePoint data before where new point added, or undefined if none
 * @param afterPoint data after where new point added, or undefined if none
 */
export const calculateNewDataPoint: newPointCalculator<dataPoint> = (beforePoint, afterPoint) => {
    // if either neighboring point undefined, set to default
    beforePoint ??= { id: '', point: { value: 0, controlPos: EMPTY_CONTROL_POS }, t: null };
    afterPoint  ??= { id: '', point: { value: 0, controlPos: EMPTY_CONTROL_POS }, t: null };

    // return point halfway between points
    const beforeCurvePoint = {
        anchorPos: { x: beforePoint.t ?? 0, y: beforePoint.point.value },
        controlPos: beforePoint.point.controlPos,
    };
    const afterCurvePoint = {
        anchorPos: { x: afterPoint.t ?? 1, y: afterPoint.point.value },
        controlPos: afterPoint.point.controlPos,
    }
    const { newPoint, newBeforeControlPosLength, newAfterControlPosLength } 
        = calculateNewPointBetween(beforeCurvePoint, afterCurvePoint);
    return {
        newPoint: { value: newPoint.anchorPos.y, controlPos: newPoint.controlPos },
        t: newPoint.anchorPos.x,
        newBeforeControlPosLength,
        newAfterControlPosLength,
    };
}


export const RADIUS_POINT_TYPE: pointType<dataPoint> = {
    updaterFunctionKey: 'updateRadiusPoints',
    calculateNewPoint: calculateNewDataPoint,
}
