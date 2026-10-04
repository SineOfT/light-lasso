import { generateId } from './util';
import { EMPTY_POS } from './pos';

import type { pos } from './pos';
import type { lut } from './lut';

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
): pos => {
    // get point ID at index on curve, if exists
    const pointId = curve[pointIndex];
    if (pointId == undefined) {
        console.warn('Tried to get out-of-bounds point at index %s on curve with length %d',
            pointIndex, curve.length);
        return EMPTY_POS;
    }

    // get point with ID
    return getPoint(points, pointId);
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
 * function finds indexes of sections before and after given point
 * 
 * works for both control poitns and anchor points
 * 
 * @param curve the curve the given point is on
 * @param pointIndex the point to find the neighboring sections for
 * @returns the indexes of the sections before and after the given point, or undefined if non-existant
 */
export const getNeighboringSectionIndexes = (curve: curve, pointIndex: number) => {
    // if point outisde bounds of curve, skip
    if (pointIndex >= curve.length) { return; }

    // find ID of control point relevant to given point
    const controlPointIndex = pointIndex - (isPointControl(pointIndex) ? 0 : 1);
    const controlPointId = curve[controlPointIndex]!;
    const anchorPointId = curve[controlPointIndex+1]!;

    // find indexes at which neighboring sections located
    let sectionAfterIndex: number|undefined = Math.floor(pointIndex / 2);
    let sectionBeforeIndex: number|undefined = sectionAfterIndex - 1;
    if (sectionBeforeIndex < 0) { sectionBeforeIndex = undefined; }
    if (sectionAfterIndex >= curve.length/2 - 1) { sectionAfterIndex = undefined; }

    // find indexes of points that define each section
    const controlBeforePointId = sectionBeforeIndex != undefined ? curve[controlPointIndex-2]! : undefined;
    const anchorBeforePointId  = sectionBeforeIndex != undefined ? curve[controlPointIndex-1]! : undefined;
    const controlAfterPointId  = sectionAfterIndex  != undefined ? curve[controlPointIndex+2]! : undefined;
    const anchorAfterPointId   = sectionAfterIndex  != undefined ? curve[controlPointIndex+3]! : undefined;

    // return relevant data
    return {
        controlPointIndex, controlPointId, anchorPointId,
        sectionBeforeIndex, controlBeforePointId, anchorBeforePointId,
        sectionAfterIndex,  controlAfterPointId,  anchorAfterPointId,
    };
}

/**
 * function generates the changes that need to be made to add a point to a section on a curve
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
    luts: Record<string, lut>,
    curveId: string,
    pointIndex: number,
    isAfter: boolean,
) => {
    // get curve
    const curve = curves[curveId];
    const lut = luts[curveId];
    if (curve == undefined || lut == undefined || lut.length === 0) { return; }
    if (pointIndex > curve.length) { return; } // ensure point index not out of bounds

    // get LUT of section new point place on
    const { controlPointIndex, sectionBeforeIndex, sectionAfterIndex }
        = getNeighboringSectionIndexes(curve, pointIndex)!;
    const sectionIndex = isAfter ? sectionAfterIndex : sectionBeforeIndex;
    const sectionLut = sectionIndex != undefined ? lut[sectionIndex] : undefined;
    const newPointIndex = controlPointIndex + (isAfter ? 2 : 0);

    // determine position of new point on section by getting point halfway on LUT
    let anchorPoint = sectionLut != undefined ? sectionLut[Math.floor(sectionLut.length/2)] : undefined;
    if (anchorPoint == undefined) {
        anchorPoint = getPointOnCurve(points, curve, pointIndex);
    }

    // generate IDs for new points
    const existingIds = Object.keys(points);
    const controlPointId = generateId(existingIds);
    const anchorPointId  = generateId([...existingIds, controlPointId]);

    // return relevant data
    return {
        newPointIndex,
        controlPointId, controlPoint: { ...anchorPoint } as pos,
        anchorPointId, anchorPoint,
    };
}
