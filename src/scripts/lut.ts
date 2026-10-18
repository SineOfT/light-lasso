import { getAfterControlPos, getBeforeControlPos } from './controlPos';
import { posAdd, posMul, posAddAll } from './pos';

import type { pos } from './pos';
import type { DataPoint } from './dataPoint';
import type { Curve, CurvePoint } from './curve';

/** how much t value incremented in each section on curve when generating LUT */
const LUT_STEP = 0.1;

/**
 * type represents look-up table for curve, which contains array of positions
 * for each section of curve
 */
export type LutPoint<T extends { }> = {
    /** value of the point at given position */
    value: T,
    /** t value of given position; may also contain integer component to denote which section */
    t: number,
    /** ID of point which defines start of section, or undefined if very first point */
    beforePointId: string|undefined,
    /** ID of point which defines end of section, or undefined if very last point */
    afterPointId: string|undefined,
};

/**
 * function generates a look-up table for a cubic bezier using the
 * start position, end position, second control position, and
 * inverse of the first control position (inv 1st -> start -> 1st)
 * @returns an array containing the positions at each step of the bezier curve
 */
export const generateCubicBezierLutSection = (
    anchorPos1: pos, controlPos1: pos, controlPos2: pos, anchorPos2: pos
) => {
    // create LUT to be populated
    let lut = [];

    /* 
     * precompute coefficients used in cubic bezier polynomial
     * cubic bezier defined by matrix:
     *    [  1  0  0  0 ]
     *    [ -3  3  0  0 ]
     *    [  3 -6  3  0 ]
     *    [ -1  3 -3  1 ]
     */
    const a0 =                  anchorPos1;
    const a1 = posAddAll(posMul(anchorPos1, -3), posMul(controlPos1,  3));
    const a2 = posAddAll(posMul(anchorPos1,  3), posMul(controlPos1, -6), posMul(controlPos2,  3));
    const a3 = posAddAll(posMul(anchorPos1, -1), posMul(controlPos1,  3), posMul(controlPos2, -3), anchorPos2);
    
    // in the range 0-1, increment through different steps of t and determine position on cubic bezier
    for (let t = 0; t <= 1; t += LUT_STEP) {
        // solve polynomial using coefficients and powers of t, add to LUT
        const pos = posAdd(posMul(posAdd(posMul(posAdd(posMul(a3, t), a2), t), a1), t), a0);
        lut.push(pos);
    }

    return lut;
}

/**
 * function generates LUT for cubic bezier curve with data points
 * @param dataPoints record of all existing data points of given type
 * @param curve given curve to draw
 * @returns an array of LUT points, representing value at each t value
 */
export const generateCubicBezierLutForDataCurve = (
    dataPoints: Map<string, DataPoint>,
    curve: Curve,
) => {
    // get all points on curve
    const curvePoints = curve.reduce<CurvePoint<DataPoint>[]>((acc, { id, t }) => {
        const point = dataPoints.get(id);
        if (point === undefined) { return acc; }
        acc.push({ id, point, t });
        return acc;
    }, []);

    // must have at least 1 point to have a curve
    if (curvePoints.length < 1) { return []; }

    // store all calculated positions in LUT
    const lut: LutPoint<number>[] = [];

    // create variables that store current position on loop iterator
    let point2 = curvePoints[0]!;
    let point1 = point2; // will be overwritten, so just use placeholder
    let baseT = point2.t === null ? 1 : 0; // increment base t value at each positioned point
    let anchorPos2: pos = { x: baseT + (point2.t ?? 0), y: point2.point.value };
    let anchorPos1: pos = anchorPos2; // will be overwritten, so just use placeholder

    // add LUT section from first point to zero point
    lut.push(...generateCubicBezierLutSection(
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        getBeforeControlPos(anchorPos2, point2.point.controlPos),
        anchorPos2,
    ).map((pos) => ({
        value: pos.y,
        t: pos.x,
        beforePointId: undefined,
        afterPointId: point2.id,
    })));

    // iterate over each section in curve
    for (let i = 1; i < curvePoints.length; i++) {
        // move to next section on curve
        point1 = point2;
        point2 = curvePoints[i]!;

        // if point positioned, increment base t value
        if (point2.t === null) { baseT++; }

        // calculate new anchor positions
        anchorPos1 = anchorPos2;
        anchorPos2 = { x: baseT + (point2.t ?? 0), y: point2.point.value };

        // add LUT points from section to overall LUT for curve
        lut.push(...generateCubicBezierLutSection(
            anchorPos1,
            getAfterControlPos(anchorPos1, point1.point.controlPos),
            getBeforeControlPos(anchorPos2, point2.point.controlPos),
            anchorPos2,
        ).map((pos) => ({
            value: pos.y,
            t: pos.x,
            beforePointId: point1.id,
            afterPointId: point2.id,
        })));
    }

    // add LUT section from last point to zero point
    lut.push(...generateCubicBezierLutSection(
        anchorPos2,
        getAfterControlPos(anchorPos2, point2.point.controlPos),
        { x: anchorPos2.x + 1, y: 0 }, // one further than t value of furthest point
        { x: anchorPos2.x + 1, y: 0 }, // 
    ).map((pos) => ({
        value: pos.y,
        t: pos.x,
        beforePointId: point2.id,
        afterPointId: undefined,
    })));

    return lut;
}
