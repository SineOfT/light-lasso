import { posAdd, posMul, posAddAll, getInvPos } from './pos';
import { getPointOnCurve, getPointLocationOnCurve, getNeighboringSectionIndexes, getPoint } from './curves';

import type { pos } from './pos';
import type { curve } from './curves';

const LUT_STEP = 0.1;

/**
 * type represents look-up table for curve, which contains array of positions
 * for each section of curve
 */
export type lut = pos[][];

/**
 * function generates a look-up table for a cubic bezier using the start point, end point,
 * second control point, and inverse of the first control point (inv 1st -> start -> 1st)
 * @returns an array containing the positions at each step of the bezier curve
 */
export const generateBezierLut = (
    invControlPoint1: pos, point1: pos, controlPoint2: pos, point2: pos
) => {    
    // create LUT to be populated
    let lut = [];

    // determine position of first control point by inverting in relation to first point
    const controlPos1 = getInvPos(invControlPoint1, point1);

    /* 
     * precompute coefficients used in cubic bezier polynomial
     * cubic bezier defined by matrix:
     *    [  1  0  0  0 ]
     *    [ -3  3  0  0 ]
     *    [  3 -6  3  0 ]
     *    [ -1  3 -3  1 ]
     */
    const a0 =                  point1;
    const a1 = posAddAll(posMul(point1, -3), posMul(controlPos1,  3));
    const a2 = posAddAll(posMul(point1,  3), posMul(controlPos1, -6), posMul(controlPoint2,  3));
    const a3 = posAddAll(posMul(point1, -1), posMul(controlPos1,  3), posMul(controlPoint2, -3), point2);
    
    // in the range 0-1, increment through different steps of t and determine position on cubic bezier
    for (let t = 0; t <= 1; t += LUT_STEP) {
        
        // solve polynomial using coefficients and powers of t, add to LUT
        const pos = posAdd(posMul(posAdd(posMul(posAdd(posMul(a3, t), a2), t), a1), t), a0);
        lut.push(pos);
    }

    return lut;
}

/**
 * function generates the changes that need to be made to a LUT for a curve when a point is changed
 * 
 * @param points a record of all existing points
 * @param curves a record of all existing curves
 * @param pointId the ID of the updated point
 * @param newPoint the new position of the updated point
 * @returns the data for up to 2 changed LUT curve sections
 */
export const getLutFromUpdatePoint = (
    points: Record<string, pos>,
    curves: Record<string, curve>,
    pointId: string,
    newPoint: pos,
) => {
    // get location of point in curves
    const pointLocation = getPointLocationOnCurve(curves, pointId);
    if (pointLocation == undefined) { return; }
    const { curveId, curve, isControlPoint, anchorPointIndex } = pointLocation;

    // must have 4 points to be valid cubic bezier
    if (curve.length < 4) { return; }


    // find which sections this point affects on curve
    const neighboringSectionIndexes = getNeighboringSectionIndexes(curve, anchorPointIndex);
    if (neighboringSectionIndexes == undefined) { return; }
    const { sectionBeforeIndex, sectionAfterIndex } = neighboringSectionIndexes;

    // generate LUTs for each section, if exists
    const sectionBeforeLut = sectionBeforeIndex != undefined ? generateBezierLut(
        getPointOnCurve(points, curve, sectionBeforeIndex*2  ),
        getPointOnCurve(points, curve, sectionBeforeIndex*2+1),
        isControlPoint ? newPoint : getPointOnCurve(points, curve, sectionBeforeIndex*2+2),
        isControlPoint ? getPointOnCurve(points, curve, sectionBeforeIndex*2+3) : newPoint,
    ) : undefined;
    const sectionAfterLut  = sectionAfterIndex  != undefined ? generateBezierLut(
        isControlPoint ? newPoint : getPointOnCurve(points, curve, sectionAfterIndex*2  ),
        isControlPoint ? getPointOnCurve(points, curve, sectionAfterIndex*2+1) : newPoint,
        getPointOnCurve(points, curve, sectionAfterIndex*2+2),
        getPointOnCurve(points, curve, sectionAfterIndex*2+3),
    ) : undefined;

    // return relevant data
    return {
        curveId,
        sectionBeforeIndex, sectionBeforeLut,
        sectionAfterIndex, sectionAfterLut,
    };
}

/**
 * function generates the changes that need to be amde to a LUT for a curve when a point is added
 * 
 * @param points a record of all existing points
 * @param curves  a record of all existing curves
 * @param curveId the ID of the modified curve
 * @param pointIndex the index at which the new point was added on the curve
 * @param controlPoint the position of the new control point
 * @param point the position of the new point
 * @returns the data for up to 2 changed LUT curve sections
 */
export const getLutFromAddPoint = (
    points: Record<string, pos>,
    curves: Record<string, curve>,
    curveId: string,
    pointIndex: number,
    isAfter: boolean,
    controlPoint: pos,
    anchorPoint: pos,
) => {
    // get curve at specified index
    const curve = curves[curveId];
    if (curve == undefined) { return; }
    if (curve.length < 4) { return; }
    if (pointIndex >= curve.length) { return; }
    
    // find which section point added to
    const neighboringSectionIndexes = getNeighboringSectionIndexes(curve, pointIndex);
    if (neighboringSectionIndexes == undefined) { return; }
    const {
        sectionIndex,
        controlBeforeSectionId, anchorBeforeSectionId,
        controlAfterSectionId,  anchorAfterSectionId,
    } = isAfter ? {
        sectionIndex: neighboringSectionIndexes.sectionAfterIndex,
        controlBeforeSectionId: neighboringSectionIndexes.controlPointId,
        anchorBeforeSectionId: neighboringSectionIndexes.anchorPointId,
        controlAfterSectionId: neighboringSectionIndexes.controlAfterPointId,
        anchorAfterSectionId: neighboringSectionIndexes.anchorAfterPointId,
    } : {
        sectionIndex: neighboringSectionIndexes.sectionBeforeIndex,
        controlBeforeSectionId: neighboringSectionIndexes.controlBeforePointId,
        anchorBeforeSectionId: neighboringSectionIndexes.anchorBeforePointId,
        controlAfterSectionId: neighboringSectionIndexes.controlPointId,
        anchorAfterSectionId: neighboringSectionIndexes.anchorPointId,
    };

    // generate LUTs for each section, if exists
    const sectionBeforeLut = (sectionIndex != undefined || isAfter)
        ? generateBezierLut(
            getPoint(points, controlBeforeSectionId!),
            getPoint(points, anchorBeforeSectionId!),
            controlPoint,
            anchorPoint,
        ) : undefined;
    const sectionAfterLut = (sectionIndex != undefined || !isAfter)
        ? generateBezierLut(
            controlPoint,
            anchorPoint,
            getPoint(points, controlAfterSectionId!),
            getPoint(points, anchorAfterSectionId!),
        ) : undefined;

    console.log(isAfter, sectionIndex, sectionBeforeLut, sectionAfterLut);

    // return relevant data
    return { sectionIndex, sectionBeforeLut, sectionAfterLut };
}
