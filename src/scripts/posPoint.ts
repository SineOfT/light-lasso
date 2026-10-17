import { EMPTY_POS, posAdd, posRound, posMul, posInvLerp } from './pos';
import { calculateNewPointBetween } from './point';
import { EMPTY_CONTROL_POS } from './controlPos';

import type { pos } from './pos';
import type { NewDeletedPointTCalculator, NewPointCalculator, PointType, } from './point';
import type { ControlPos } from './controlPos';

/** interface defines point, which has control position & anchor position */
export interface PosPoint {
    anchorPos: pos,
    controlPos: ControlPos,
}

/** how much distance to put when adding a new point to either the very start or end of a curve */
export const DEFAULT_CONTROL_POS_LENGTH = 50;

/**
 * function calculates where to add position of new point added between up to 2 existing points
 * @param beforePoint point right before new point to add, or undefined if none
 * @param afterPoint point right after new point to add, or undefined if none
 * @returns new point, along with t value between 2 points
 */
const calculateNewPosPoint: NewPointCalculator<PosPoint> = (beforePoint, afterPoint) => {
    // if between 2 existing points, add halfway between
    if (beforePoint !== undefined && afterPoint !== undefined) {
        const { newPoint, newBeforeControlPosLength, newAfterControlPosLength }
            = calculateNewPointBetween(
                beforePoint.point,
                afterPoint.point,
            );
        return {
            newPoint,
            t: null, // position, so not interpolated
            newBeforeControlPosLength,
            newAfterControlPosLength,
        };
    }

    // if only point after, is first point so add to start
    if (afterPoint !== undefined) {
        // calculate new point based on direction and position of control point
        const newAnchorPos = posAdd(
            afterPoint.point.anchorPos,
            // evenly space anchor -> control -> control -> anchor, so 3 lengths
            posMul(afterPoint.point.controlPos.direction, -DEFAULT_CONTROL_POS_LENGTH * 3),
        );
        const newControlPos = {
            direction: afterPoint.point.controlPos.direction, // direction same
            beforeLength: DEFAULT_CONTROL_POS_LENGTH,
            afterLength: DEFAULT_CONTROL_POS_LENGTH,
        };
        const newPoint: PosPoint = {
            anchorPos:  posRound(newAnchorPos), // round positions to nearest integer
            controlPos: newControlPos,
        };

        return {
            newPoint,
            t: null, // position so not interpolated
            newBeforeControlPosLength: undefined,
            newAfterControlPosLength: DEFAULT_CONTROL_POS_LENGTH,
        };
    }

    // if only point before, is last point so add to end
    if (beforePoint !== undefined) {
        // calculate new point based on direction and position of control point
        const newAnchorPos = posAdd(
            beforePoint.point.anchorPos,
            // evenly space anchor -> control -> control -> anchor, so 3 lengths
            posMul(beforePoint.point.controlPos.direction, DEFAULT_CONTROL_POS_LENGTH * 3),
        );
        const newControlPos = {
            direction: beforePoint.point.controlPos.direction, // direction same
            beforeLength: DEFAULT_CONTROL_POS_LENGTH,
            afterLength: DEFAULT_CONTROL_POS_LENGTH,
        };
        const newPoint = {
            anchorPos:  posRound(newAnchorPos), // round positions to nearest integer
            controlPos: newControlPos,
        };

        return {
            newPoint,
            t: null, // position so not interpolated
            newBeforeControlPosLength: DEFAULT_CONTROL_POS_LENGTH,
            newAfterControlPosLength: undefined,
        };
    }

    // if no point before and after, new point is only point so set to default
    const newPoint: PosPoint = {
        anchorPos:  EMPTY_POS,
        controlPos: EMPTY_CONTROL_POS,
    };
    return {
        newPoint,
        t: null, // position so not interpolated
        newBeforeControlPosLength: undefined,
        newAfterControlPosLength: undefined,
    };
}

/**
 * function calculates new t value of point on curve when given point deleted
 * @param deletedPoint point that will be deleted
 * @param beforePoint point right before deleted point, or undefined if none
 * @param afterPoint point right after deleted point, or undefined if none
 * @returns new t value to set on point on curve where point deleted
 */
const calculateNewDeletedPosPointT: NewDeletedPointTCalculator<PosPoint> = (
    deletedPoint, beforePoint, afterPoint
) => {
    // if deleted point not between 2 existing points, use default t value of halfway
    if (beforePoint === undefined || afterPoint === undefined) {
        return 0.5;
    }

    // find how far along deleted point is compared to total distance between points
    // note that this is only an approximation, since it uses linear interpolation instead of a curve
    const newT = posInvLerp(
        beforePoint.point.anchorPos,
        afterPoint.point.anchorPos,
        deletedPoint.point.anchorPos);
    
    return newT;
}

/** type of point that holds positions of points of curve */
export const POS_POINT_TYPE: PointType<PosPoint> = {
    updaterFunctionKey: 'updatePosPoints',
    calculateNewPoint: calculateNewPosPoint,
    calculateNewDeletedPointT: calculateNewDeletedPosPointT,
}
