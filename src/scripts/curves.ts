import { generateId } from './util';
import { EMPTY_POS, posAdd, posSub, posWithDistance, getInvPos, posLerp } from './pos';

import type { pos } from './pos';

/**
 * how much distance to put when adding a new point to either the very start or end of a curve
 */
const ADD_EXTREME_OVERSHOOT = 50;

/**
 * type represents curve that holds the IDs of all points in the curve, in order
 */
export type curve = { controlPointId: string, anchorPointId: string }[];

/**
 * function gets the point with the given ID
 * 
 * if the point ID is invalid, an empty point will be returned
 * 
 * @param points a record of all existing points
 * @param pointId the ID of the point
 * @returns the point at the given location, or an empty point if invalid
 */
export const getPoint = (
    points: Record<string, pos>,
    pointId: string,
): pos => {
    // get point with point ID, if exists
    const point = points[pointId];
    if (point == undefined) {
        console.warn('Tried to get non-existent point with ID %s', pointId);
        return EMPTY_POS;
    }

    return point;
}

/**
 * function gets a point on the given curve at the given index
 * 
 * if any of the accessed are invalid (non-existent ID, index out of bounds),
 * an empty point will be returned
 * 
 * @param points a record of all existing points
 * @param curve the curve to get the point from
 * @param pointIndex the index at which the point is in the curve
 * @returns the point at the given location, or an empty point if invalid
 */
export const getPointOnCurve = (
    points: Record<string, pos>,
    curve: curve,
    pointIndex: number,
    isControl: boolean,
): pos => {
    // get point ID at index on curve, if exists
    const curvePointIds = curve[pointIndex];
    if (curvePointIds == undefined) {
        console.warn('Tried to get out-of-bounds point at index %s on curve with length %d',
            pointIndex, curve.length);
        return EMPTY_POS;
    }

    // get either control point or anchor point based on parameter
    const pointId = isControl ? curvePointIds.controlPointId : curvePointIds.anchorPointId;

    // get point with ID
    return getPoint(points, pointId);
}

/**
 * function gets index of given point on curve and ID of curve point is located on
 * @param curves a record of all existing curves
 * @param pointId the ID of the point to locate
 * @returns the location of the point in curves, or undefined if non-existant
 */
export const getPointLocation = (
    curves: Record<string, curve>,
    pointId: string,
) => {
    // find curve point is within
    const curveObj = Object.entries(curves)
        .map(([curveId, curve]) => ({
            curveId,
            curve,
            pointIndex: curve.findIndex(({ controlPointId, anchorPointId }) =>
                pointId === controlPointId || pointId === anchorPointId)
        }))
        .find(({ pointIndex }) => pointIndex !== -1);
    if (curveObj == undefined) { return; }
    const { curveId, curve, pointIndex } = curveObj;

    // determine whether point is control point
    const isControlPoint = curve[pointIndex]!.controlPointId === pointId;
    
    // return relevant data
    return { curveId, curve, pointIndex, isControlPoint };
}

/**
 * function generates the changes that need to be made to add a point to a section on a curve
 * 
 * the position, radius, and timing are determined based on what existing points
 * this point is placed between
 * 
 * @param points a record of all existing points
 * @param curve the curve to get the point from
 * @param pointId the ID of the point next to the new point
 * @param isAfter whether the point is added before or after the given point
 * @returns functions that updates affected curve and points
 */
export const getCurveFromAddPoint = (
    points: Record<string, pos>,
    curves: Record<string, curve>,
    pointId: string,
    isAfter: boolean,
) => {
    // get location of point
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation == undefined) { return };
    const { curveId, curve, pointIndex } = pointLocation; 

    // get section new point placed on
    const sectionIndex = pointIndex + (isAfter ? 0 : -1);
    const sectionType = sectionIndex < 0               ? 'before'
                      : sectionIndex >= curve.length-1 ? 'after'
                      :                                  'within';

    // determine position of new control and anchor point based on neighboring points
    const { controlPoint, anchorPoint } =
        sectionType === 'within' ? (() => {
            // find IDs of neighboring points
            const beforePoints = curve[sectionIndex]!;
            const afterPoints  = curve[sectionIndex+1]!;

            // find positions of relevant neighboring points
            const beforeInvControlPoint = getPoint(points, beforePoints.controlPointId);
            const beforeAnchorPoint     = getPoint(points, beforePoints.anchorPointId);
            const afterControlPoint     = getPoint(points, afterPoints.controlPointId);
            const afterAnchorPoint      = getPoint(points, afterPoints.anchorPointId);
            const beforeControlPoint    = getInvPos(beforeInvControlPoint, beforeAnchorPoint);
            
            // find positions of intermediary positions
            const newBeforeControlPoint = posLerp(beforeAnchorPoint, beforeControlPoint, 2);
            const newAfterControlPoint  = posLerp( afterAnchorPoint,  afterControlPoint, 2);
            const lerpMidPoint = posLerp(newBeforeControlPoint, newAfterControlPoint, 0.5);

            // calculate new points
            const controlPoint = posLerp(newBeforeControlPoint, lerpMidPoint, 0.5);
            const anchorPoint = lerpMidPoint;
            return { controlPoint, anchorPoint };
        })()
      : sectionType === 'before' ? (() => {
            // calculate new points based on first points on curve
            const firstControlPoint = getPointOnCurve(points, curve, 0, true);
            const firstAnchorPoint  = getPointOnCurve(points, curve, 0, false);
            const anchorPoint = posAdd(
                firstControlPoint,
                posWithDistance(posSub(firstControlPoint, firstAnchorPoint), ADD_EXTREME_OVERSHOOT),
            );
            const controlPoint = getInvPos(firstControlPoint, anchorPoint); // inversed
            return { controlPoint, anchorPoint };
        })()
      : sectionType === 'after' ? (() => {
            // calculate new points based on last points on curve
            const lastInvControlPoint = getPointOnCurve(points, curve, curve.length-1, true);
            const lastAnchorPoint     = getPointOnCurve(points, curve, curve.length-1, false);
            const lastControlPoint    = getInvPos(lastInvControlPoint, lastAnchorPoint);
            const anchorPoint = posAdd(
                lastControlPoint,
                posWithDistance(posSub(lastControlPoint, lastAnchorPoint), ADD_EXTREME_OVERSHOOT),
            );
            const controlPoint = lastControlPoint;
            return { controlPoint, anchorPoint };
        })()
      : sectionType satisfies never;

    // generate IDs for new points
    const existingIds = Object.keys(points);
    const controlPointId = generateId(existingIds);
    const anchorPointId  = generateId([...existingIds, controlPointId]);

    // determine new curve
    const newCurve = curve.toSpliced(sectionIndex+1, 0, { controlPointId, anchorPointId }) as curve;

    // return functions that modifies points and curve
    return {
        controlPoint,
        anchorPoint,
        updatePoints: (prevPoints: Record<string, pos>) => {
            const newPoints = { ...prevPoints } as Record<string, pos>;
            newPoints[controlPointId] = controlPoint;
            newPoints[anchorPointId]  = anchorPoint;
            return newPoints;
        },
        updateCurves: (prevCurves: Record<string, curve>) => {
            const newCurves = { ...prevCurves } as Record<string, curve>;
            newCurves[curveId] = newCurve;
            return newCurves;
        }
    };
}

/**
 * function generates changes that need to be made to curve when point deleted
 * @param curves a record of all existing curves
 * @param pointId ID of the point to delete
 * @returns functions that update affected curve and points
 */
export const getCurveFromDeletePoint = (
    curves: Record<string, curve>,
    pointId: string,
) => {
    // get location of point
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation == undefined) { return; }
    const { curveId, curve, pointIndex } = pointLocation;

    // determine new curve
    const newCurve = curve.toSpliced(pointIndex, 1);

    // return functions that updates curve and points
    return {
        updatePoints: (prevPoints: Record<string, pos>) => {
            const newPoints = { ...prevPoints } as Record<string, pos>;
            delete newPoints[pointId];
            return newPoints;
        },
        updateCurves: (prevCurves: Record<string, curve>) => {
            const newCurves = { ...prevCurves } as Record<string, curve>;
            newCurves[curveId] = newCurve;
            return newCurves;
        }
    }
}

/**
 * function adds new curve, with point positioned at center of canvas
 * @param curves a record of all existing curves
 * @param resolution dimensions of the canvas
 * @returns functions that update affected curve and points
 */
export const addCurve = (curves: Record<string, curve>, resolution: pos) => {
    // create points to add on new curve
    const anchorPoint = { x: resolution.x / 2, y: resolution.y / 2 } as pos;
    const controlPoint = { x: anchorPoint.x - ADD_EXTREME_OVERSHOOT, y: anchorPoint.y } as pos;

    // generate ID for curve and point
    const existingIds = Object.keys(curves);
    const curveId = generateId(existingIds);
    const controlPointId = generateId([...existingIds, curveId]);
    const anchorPointId = generateId([...existingIds, curveId, controlPointId]);

    // determine new curve
    const newCurve = [{ controlPointId, anchorPointId }] as curve;

    // return function that adds curve and point
    return {
        curveId,
        updatePoints: (prevPoints: Record<string, pos>) => {
            const newPoints = { ...prevPoints } as Record<string, pos>;
            newPoints[controlPointId] = controlPoint;
            newPoints[anchorPointId]  = anchorPoint;
            return newPoints;
        },
        updateCurves: (prevCurves: Record<string, curve>) => {
            const newCurves = { ...prevCurves } as Record<string, curve>;
            newCurves[curveId] = newCurve;
            return newCurves;
        },
    };
}
