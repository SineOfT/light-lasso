import { generateId } from './util';
import { posAdd, posSub, posWithDistance, getInvPos, posLerp, posRound } from './pos';
import { EMPTY_POINT, getPoint } from './point';

import type { pos } from './pos';
import type { point, selectedPoint } from './point';
import type { pointData } from './pointData';

/**
 * how much distance to put when adding a new point to either the very start or end of a curve
 */
const ADD_EXTREME_OVERSHOOT = 50;

/** type represents curve that holds the IDs of all points in the curve, in order */
export type curve = string[];

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
    points: Map<string, point>,
    curve: curve,
    pointIndex: number,
) => {
    // get point ID at index on curve, if exists
    const pointId = curve[pointIndex];
    if (pointId === undefined) {
        console.warn('Tried to get out-of-bounds point at index %s on curve with length %d',
            pointIndex, curve.length);
        return EMPTY_POINT;
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
export const getPointLocation = (
    curves: Map<string, curve>,
    pointId: string,
) => {
    // find curve point is within
    const curveObj = Array.from(curves,
        ([curveId, curve]) => ({
            curveId,
            curve,
            pointIndex: curve.findIndex((curvePointId) => pointId === curvePointId),
        }))
        .find(({ pointIndex }) => pointIndex !== -1);
    if (curveObj === undefined) { return; }
    const { curveId, curve, pointIndex } = curveObj;

    // return relevant data
    return { curveId, curve, pointIndex };
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
export const updateCurveFromAddPoint = (
    points: Map<string, point>,
    curves: Map<string, curve>,
    pointId: string,
    isAfter: boolean,
) => {
    // get location of point
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation === undefined) { return };
    const { curveId, curve, pointIndex } = pointLocation; 

    // get section new point placed on
    const sectionIndex = pointIndex + (isAfter ? 0 : -1);
    const sectionType = sectionIndex < 0               ? 'before'
                      : sectionIndex >= curve.length-1 ? 'after'
                      :                                  'within';

    // determine position of new control and anchor point based on neighboring points
    const newPoint: point =
        sectionType === 'within' ? (() => {
            // find IDs of neighboring points
            const beforePointId = curve[sectionIndex]!;
            const afterPointId  = curve[sectionIndex+1]!;

            // find positions of relevant neighboring points
            const {
                controlPos: beforeInvControlPos,
                anchorPos: beforeAnchorPos,
            } = getPoint(points, beforePointId);
            const beforeControlPoint = getInvPos(beforeInvControlPos, beforeAnchorPos);
            const {
                controlPos: afterControlPos,
                anchorPos: afterAnchorPos,
            } = getPoint(points, afterPointId);
            
            // find positions of intermediary positions
            const newBeforeControlPos = posLerp(beforeAnchorPos,     beforeControlPoint, 2);
            const newAfterControlPos  = posLerp(afterAnchorPos,      afterControlPos,    2);
            const lerpMidPoint        = posLerp(newBeforeControlPos, newAfterControlPos, 0.5);

            // calculate new points
            const newControlPos = posLerp(newBeforeControlPos, lerpMidPoint, 0.5);
            const newAnchorPos = lerpMidPoint;
            return { // round positions to nearest integer
                controlPos: posRound(newControlPos),
                anchorPos:  posRound(newAnchorPos),
            };
        })()
      : sectionType === 'before' ? (() => {
            // calculate new points based on first points on curve
            const {
                controlPos: firstControlPos,
                anchorPos:  firstAnchorPos,
            } = getPointOnCurve(points, curve, 0);
            const newAnchorPos = posAdd(
                firstControlPos,
                posWithDistance(posSub(firstControlPos, firstAnchorPos), ADD_EXTREME_OVERSHOOT),
            );
            const newControlPos = getInvPos(firstControlPos, newAnchorPos); // inversed
            return { // round positions to nearest integer
                controlPos: posRound(newControlPos),
                anchorPos:  posRound(newAnchorPos),
            };
        })()
      : sectionType === 'after' ? (() => {
            // calculate new points based on last points on curve
            const {
                controlPos: lastInvControlPos,
                anchorPos: lastAnchorPos,
            } = getPointOnCurve(points, curve, curve.length-1);
            const lastControlPos = getInvPos(lastInvControlPos, lastAnchorPos);
            const newAnchorPoint = posAdd(
                lastControlPos,
                posWithDistance(posSub(lastControlPos, lastAnchorPos), ADD_EXTREME_OVERSHOOT),
            );
            const newControlPoint = lastControlPos;
            return { // round positions to nearest integer
                controlPos: posRound(newControlPoint),
                anchorPos:  posRound(newAnchorPoint),
            };
        })()
      : sectionType satisfies never;

    // generate ID for new point
    const existingIds = Object.keys(points);
    const newPointId = generateId(existingIds);

    // determine new curve and selected point
    const newCurve: curve = curve.toSpliced(sectionIndex+1, 0, newPointId);
    const newSelectedPoint: selectedPoint = { id: newPointId, type: 'anchor' };

    // return functions that modifies points and curve
    return {
        updatePoints: (prevPoints: Map<string, point>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(newPointId, newPoint);
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(curveId, newCurve);
            return newCurves;
        },
        newSelectedPoint,
    };
}

/**
 * function generates changes that need to be made to curve when point deleted
 * @param curves a record of all existing curves
 * @param pointId ID of the point to delete
 * @returns functions that update affected curve and points
 */
export const updateCurveFromDeletePoint = (
    curves: Map<string, curve>,
    pointId: string,
) => {
    // get location of point
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curveId, curve, pointIndex } = pointLocation;

    // determine new curve
    const newCurve: curve = curve.toSpliced(pointIndex, 1);

    // return functions that updates curve and points
    return {
        updatePoints: (prevPoints: Map<string, point>) => {
            const newPoints = new Map(prevPoints);
            newPoints.delete(pointId);
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(curveId, newCurve);
            return newCurves;
        },
        newSelectedPoint: null,
    };
}

/**
 * function adds new curve, with point positioned at top left of canvas
 * @param curves a record of all existing curves
 * @returns functions that update affected curve and points
 */
export const updateCurveFromAdd = (
    curves: Map<string, curve>,
) => {
    // find positions of point to add on new curve
    const newAnchorPos: pos = { x: 0, y: 0 };
    const newControlPos: pos = { x: -ADD_EXTREME_OVERSHOOT, y: 0 };

    // generate ID for curve and point
    const existingIds = Object.keys(curves);
    const newCurveId = generateId(existingIds);
    const newPointId = generateId([...existingIds, newCurveId]);

    // determine new curve, point, and selected point
    const newCurve: curve = [newPointId];
    const newPoint: point = { controlPos: newControlPos, anchorPos: newAnchorPos };
    const newSelectedPoint: selectedPoint = { id: newPointId, type: 'anchor' };

    // return function that adds curve and point
    return {
        updatePoints: (prevPoints: Map<string, point>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(newPointId, newPoint);
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(newCurveId, newCurve);
            return newCurves;
        },
        newSelectedPoint,
    };
}

/**
 * function handles deleting given curve
 * @param curves a record of all existing curves
 * @param curveId ID of curve to delete
 * @returns functions that updates curve, points, and point datas
 */
export const updateCurveFromDelete = (
    curves: Map<string, curve>,
    curveId: string,
) => {
    // find IDs of all points in curve
    const curve = curves.get(curveId);
    if (curve === undefined) { return; }

    // return functions that update state
    return {
        updatePoints: (prevPoints: Map<string, point>) => {
            const newPoints = new Map(prevPoints);
            for (const pointId of curve) {
                newPoints.delete(pointId);
            }
            return newPoints;
        },
        updatePointDatas: (prevRadiusDatas: Map<string, pointData>) => {
            const newRadiusDatas = new Map(prevRadiusDatas);
            for (const pointId of curve) {
                newRadiusDatas.delete(pointId);
            }
            return newRadiusDatas;
        },
        updateCurves: (prevCurves: Map<string, curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.delete(curveId);
            return newCurves;
        },
        newSelectedPoint: null,
    }
}
