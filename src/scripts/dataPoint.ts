import { calculateNewPointBetween } from './point';
import { EMPTY_CONTROL_POS } from './controlPos';

import type { NewPointCalculator, PointType } from './point';
import type { ControlPos } from './controlPos';

/** type represents changes in data associated with points as progress along curve */
export type DataPoint = {
    /** the value of the data at this point */
    value: number,
    /** the position of the control point used to defined transitions between neighboring data */
    controlPos: ControlPos,
};

/** type represents type of point that is specifically some sort of data point */
export type DataPointType = PointType<DataPoint> & {
    /** what value of data will map to a 1 when mapped to a t value range; is able to go higher */
    upperValue: number,
}

/**
 * function calculates value of new data added between up to 2 existing data points
 * @param beforePoint data before where new point added, or undefined if none
 * @param afterPoint data after where new point added, or undefined if none
 */
export const calculateNewDataPoint: NewPointCalculator<DataPoint> = (beforePoint, afterPoint, currT) => {
    // if either neighboring point undefined, set to default
    beforePoint ??= { id: '', point: { value: 0, controlPos: EMPTY_CONTROL_POS }, t: null };
    afterPoint  ??= { id: '', point: { value: 0, controlPos: EMPTY_CONTROL_POS }, t: null };

    // if new point positioned, after curve point offset to be positioned at 2, since new point at 1
    const afterCurvePointTIfNull = currT === null ? 2 : 1;

    // find point halfway between points
    const beforeCurvePoint = {
        anchorPos: { x: beforePoint.t ?? 0, y: beforePoint.point.value },
        controlPos: beforePoint.point.controlPos,
    };
    const afterCurvePoint = {
        anchorPos: { x: afterPoint.t ?? afterCurvePointTIfNull, y: afterPoint.point.value },
        controlPos: afterPoint.point.controlPos,
    }
    let { newPoint, newBeforeControlPosLength, newAfterControlPosLength } 
        = calculateNewPointBetween(beforeCurvePoint, afterCurvePoint);

    return {
        newPoint: { value: newPoint.anchorPos.y, controlPos: newPoint.controlPos },
        t: newPoint.anchorPos.x,
        newBeforeControlPosLength,
        newAfterControlPosLength,
    };
}

export const RADIUS_POINT_TYPE: DataPointType= {
    updaterFunctionKey: 'updateRadiusPoints',
    calculateNewPoint: calculateNewDataPoint,
    calculateNewDeletedPointT: () => undefined, // since not positioned, no affect to t value
    upperValue: 1000,
}
