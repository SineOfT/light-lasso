import { generateId } from './util';
import { EMPTY_POS, posAvg } from './pos';

import type { pos } from './pos';

/**
 * type represents curve that holds the IDs of all points in the curve, in order
 */
export type curve = string[];

/**
 * function gets whether point at given index on curve is control point
 * @param pointIndex the index of the point on the curve
 */
export const isPointControl = (pointIndex: number) => pointIndex % 2 === 0;

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
): pos => {
    // get point ID at index on curve, if exists
    const curvePointId = curve[pointIndex];
    if (curvePointId == undefined) {
        console.warn('Tried to get out-of-bounds point at index %s on curve with length %d',
            pointIndex, curve.length);
        return EMPTY_POS;
    }

    // get point with above point ID, if exists;
    const curvePoint = points[curvePointId];
    if (curvePoint == undefined) {
        console.warn('Tried to get non-existent point with ID %s', curvePointId);
        return EMPTY_POS;
    }

    return curvePoint;
}

/**
 * function gets index of given point on curve and ID of curve point is located on
 * @param curves a record of all existing curves
 * @param pointId the ID of the point to locate
 * @returns the location of the point in curves, or undefined if non-existant
 */
export const getPointLocationOnCurve = (
    curves: Record<string, curve>,
    pointId: string,
) => {
    // find curve point is within
    const curveObj = Object.entries(curves).find(([_, curve]) => curve.includes(pointId));
    if (curveObj == undefined) { return; }
    const [curveId, curve] = curveObj;

    // find index of point on curve
    const pointIndex = curve.indexOf(pointId);
    if (pointIndex === -1) { return; }

    // determine whether point is control point or not
    const isControlPoint = isPointControl(pointIndex);

    // get control point and anchor point indexes and IDs relevant to point
    const { controlPointIndex, anchorPointIndex } = isControlPoint
        ? { controlPointIndex: pointIndex,   anchorPointIndex: pointIndex+1 }
        : { controlPointIndex: pointIndex-1, anchorPointIndex: pointIndex   };

    // return relevant data
    return { curveId, curve, isControlPoint, controlPointIndex, anchorPointIndex };
}

/**
 * function generates the changes that need to be made to add a point to a curve
 * 
 * the position, radius, and timing are determined based on what existing points
 * this point is placed between
 * 
 * @param points a record of all existing points
 * @param curve the curve to get the point from
 * @param curveId the ID of the curve to add the point to
 * @param pointIndex the index on the curve at which to add the point
 */
export const getCurveFromAddPoint = (
    points: Record<string, pos>,
    curves: Record<string, curve>,
    curveId: string,
    pointIndex: number,
) => {
    // point must not be control point
    if (isPointControl(pointIndex)) { return; }

    // get the points from the curve the point is being added to
    const prevCurve = curves[curveId];
    if (prevCurve == undefined) { return; }
    if (pointIndex > prevCurve.length) { return; } // ensure point index not out of bounds

    // determine the values of the point based on the points before and after the new point
    const surroundingPoints = 
        pointIndex === 0                ? [getPointOnCurve(points, prevCurve, 0)]
      : pointIndex === prevCurve.length ? [getPointOnCurve(points, prevCurve, prevCurve.length-1)]
      : [getPointOnCurve(points, prevCurve, pointIndex-1), getPointOnCurve(points, prevCurve, pointIndex)];
    
    // generate new points, positioning between surrounding points
    const newPointId = generateId(Object.keys(points));
    const newPoint = posAvg(...surroundingPoints);
    const newControlPointId = generateId([...Object.keys(points), newPointId]);
    const newControlPoint = { ...newPoint } as pos;

    // return relevant data
    return {
        newControlPointId, newControlPoint,
        newPointId, newPoint,
    };
}
