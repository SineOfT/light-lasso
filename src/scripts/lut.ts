import { posAdd, posMul, posAddAll, getInvPos } from './pos';
import { getPointOnCurve, getPointLocation } from './curves';

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
    luts: Record<string, lut>,
    pointId: string,
    newPoint: pos,
) => {
    // get location of point in curves
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation == undefined) { return; }
    const { curveId, curve, pointIndex, isControlPoint } = pointLocation;

    // get affected LUT
    const curveLut = luts[curveId];
    if (curveLut == undefined) { return; }

    // generate LUTs for each section, if exists
    const beforeSection = pointIndex-1 >= 0
        ? {
            index: pointIndex-1,
            lut: generateBezierLut(
                getPointOnCurve(points, curve, pointIndex-1, true),
                getPointOnCurve(points, curve, pointIndex-1, false),
                isControlPoint ? newPoint : getPointOnCurve(points, curve, pointIndex, true),
                isControlPoint ? getPointOnCurve(points, curve, pointIndex, false) : newPoint,
            ),
        }
        : undefined;
    const afterSection = pointIndex < curve.length-1 // one less section than points on curve
        ? {
            index: pointIndex,
            lut: generateBezierLut(
                isControlPoint ? newPoint : getPointOnCurve(points, curve, pointIndex, true),
                isControlPoint ? getPointOnCurve(points, curve, pointIndex, false) : newPoint,
                getPointOnCurve(points, curve, pointIndex+1, true),
                getPointOnCurve(points, curve, pointIndex+1, false),
            ),
        }
        : undefined;

    // determine new LUT
    const newLut = [...curveLut] as lut;
    if (beforeSection != undefined) { newLut[beforeSection.index] = beforeSection.lut; }
    if (afterSection  != undefined) { newLut[afterSection.index]  = afterSection.lut;  }

    // return function that updates LUT
    return (prevLuts: Record<string, lut>) => {
        const newLuts = { ...prevLuts } as Record<string, lut>;
        newLuts[curveId] = newLut;
        return newLuts;
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
    luts: Record<string, lut>,
    pointId: string,
    isAfter: boolean,
    controlPoint: pos,
    anchorPoint: pos,
) => {
    // find location of point
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation == undefined) { return; }
    const { curveId, curve, pointIndex } = pointLocation;
    
    // get affected LUT
    const curveLut = luts[curveId];
    if (curveLut == undefined) { return; }

    // find which section point added to
    const sectionIndex = pointIndex + (isAfter ? 0 : -1);
    const sectionType = sectionIndex < 0               ? 'before'
                      : sectionIndex >= curve.length-1 ? 'after' // one less section than points on curve
                      :                                  'within';

    // generate LUTs for each section, if exists
    const beforeSectionLut = sectionType === 'before'
        ? undefined
        : generateBezierLut(
            getPointOnCurve(points, curve, sectionIndex, true),
            getPointOnCurve(points, curve, sectionIndex, false),
            controlPoint,
            anchorPoint,
        );
    const afterSectionLut = sectionType === 'after'
        ? undefined
        : generateBezierLut(
            controlPoint,
            anchorPoint,
            getPointOnCurve(points, curve, sectionIndex+1, true),
            getPointOnCurve(points, curve, sectionIndex+1, false),
        );

    // determine new LUT
    const newLut = [...curveLut] as lut;
    if (sectionType === 'before') {
        newLut.unshift(afterSectionLut!);
    } else if (sectionType === 'after') {
        newLut.push(beforeSectionLut!);
    } else if (sectionType === 'within') {
        newLut.splice(sectionIndex, 1, beforeSectionLut!, afterSectionLut!);
    } else {
        sectionType satisfies never;
    }

    // return function that updates LUT
    return (prevLuts: Record<string, lut>) => {
        const newLuts = { ...prevLuts } as Record<string, lut>;
        newLuts[curveId] = newLut;
        return newLuts;
    }
}
