// import { posAdd, posMul, posAddAll, getInvPos } from './pos';
// import { getPointOnCurve, getPointLocation } from './curve';

// import type { pos } from './pos';
// import type { pointPos } from './point';
// import type { curve } from './curve';

// /** how much t value incremented in each section on curve when generating LUT */
// const LUT_STEP = 0.1;

// /**
//  * type represents look-up table for curve, which contains array of positions
//  * for each section of curve
//  */
// export type lut = pos[][];

// /**
//  * function generates a look-up table for a cubic bezier using the
//  * start position, end position, second control position, and
//  * inverse of the first control position (inv 1st -> start -> 1st)
//  * @returns an array containing the positions at each step of the bezier curve
//  */
// export const generateBezierLut = (
//     invControlPos1: pos, anchorPos1: pos, controlPos2: pos, anchorPos2: pos
// ) => {
//     // create LUT to be populated
//     let lut = [];

//     // determine first control position by inverting in relation to first anchor position
//     const controlPos1 = getInvPos(invControlPos1, anchorPos1);

//     /* 
//      * precompute coefficients used in cubic bezier polynomial
//      * cubic bezier defined by matrix:
//      *    [  1  0  0  0 ]
//      *    [ -3  3  0  0 ]
//      *    [  3 -6  3  0 ]
//      *    [ -1  3 -3  1 ]
//      */
//     const a0 =                  anchorPos1;
//     const a1 = posAddAll(posMul(anchorPos1, -3), posMul(controlPos1,  3));
//     const a2 = posAddAll(posMul(anchorPos1,  3), posMul(controlPos1, -6), posMul(controlPos2,  3));
//     const a3 = posAddAll(posMul(anchorPos1, -1), posMul(controlPos1,  3), posMul(controlPos2, -3), anchorPos2);
    
//     // in the range 0-1, increment through different steps of t and determine position on cubic bezier
//     for (let t = 0; t <= 1; t += LUT_STEP) {
//         // solve polynomial using coefficients and powers of t, add to LUT
//         const pos = posAdd(posMul(posAdd(posMul(posAdd(posMul(a3, t), a2), t), a1), t), a0);
//         lut.push(pos);
//     }

//     return lut;
// }

// /**
//  * function generates the changes that need to be made to a LUT for a curve when a point is changed
//  * 
//  * @param points a record of all existing points
//  * @param curves a record of all existing curves
//  * @param pointId the ID of the updated point
//  * @param isControl whether the updated position is the control position or not
//  * @param newPos the new updated position
//  * @returns function that updates affected LUT
//  */
// export const getLutFromUpdatePoint = (
//     points: Map<string, pointPos>,
//     curves: Map<string, curve>,
//     luts: Map<string, lut>,
//     pointId: string,
//     isControl: boolean,
//     newPos: pos,
// ) => {
//     // get location of point in curves
//     const pointLocation = getPointLocation(curves, pointId);
//     if (pointLocation === undefined) { return; }
//     const { curveId, curve, pointIndex } = pointLocation;

//     // get affected LUT
//     const curveLut = luts.get(curveId);
//     if (curveLut === undefined) { return; }

//     // find neighboring positions
//     const beforePoint = pointIndex > 0
//         ? getPointOnCurve(points, curve, pointIndex-1)
//         : undefined;
//     const afterPoint = pointIndex < curve.length-1
//         ? getPointOnCurve(points, curve, pointIndex+1)
//         : undefined;

//     // find updated point, updating new positino
//     const currPoint = getPointOnCurve(points, curve, pointIndex);
//     const newCurrPoint: [pos, pos] = isControl
//         ? [newPos, currPoint.anchorPos]
//         : [currPoint.controlPos, newPos];

//     // generate LUTs for each section, if exists
//     const beforeSection = beforePoint !== undefined
//         ? {
//             index: pointIndex-1,
//             lut: generateBezierLut(
//                 beforePoint.controlPos,
//                 beforePoint.anchorPos,
//                 ...newCurrPoint,
//             ),
//         }
//         : undefined;
//     const afterSection = afterPoint !== undefined
//         ? {
//             index: pointIndex,
//             lut: generateBezierLut(
//                 ...newCurrPoint,
//                 afterPoint.controlPos,
//                 afterPoint.anchorPos,
//             ),
//         }
//         : undefined;

//     // determine new LUT
//     const newLut: lut = [...curveLut];
//     if (beforeSection !== undefined) { newLut[beforeSection.index] = beforeSection.lut; }
//     if (afterSection  !== undefined) { newLut[afterSection.index]  = afterSection.lut;  }

//     // return function that updates LUT
//     return (prevLuts: Map<string, lut>) => {
//         const newLuts = new Map(prevLuts);
//         newLuts.set(curveId, newLut);
//         return newLuts;
//     };
// }

// /**
//  * function generates the changes that need to be made to a LUT for a curve when a point is added
//  * @param points a record of all existing points
//  * @param curves  a record of all existing curves
//  * @param luts a record of all existing LUTs
//  * @param pointId ID of a point relative to where the new point is added
//  * @param isAfter whether or not the new point is added before or after the given point
//  * @param controlPoint position of the new control point
//  * @param anchorPoint position of the new anchor point
//  * @returns function that updates affected LUT
//  */
// export const getLutFromAddPoint = (
//     points: Map<string, pointPos>,
//     curves: Map<string, curve>,
//     luts: Map<string, lut>,
//     pointId: string,
//     isAfter: boolean,
//     newPoint: pointPos,
// ) => {
//     // find location of point
//     const pointLocation = getPointLocation(curves, pointId);
//     if (pointLocation === undefined) { return; }
//     const { curveId, curve, pointIndex } = pointLocation;
    
//     // get affected LUT
//     const curveLut = luts.get(curveId);
//     if (curveLut === undefined) { return; }

//     // find which section point added to
//     const sectionIndex = pointIndex + (isAfter ? 0 : -1);
//     const sectionType = sectionIndex < 0               ? 'before'
//                       : sectionIndex >= curve.length-1 ? 'after' // one less section than points on curve
//                       :                                  'within';

//     // find neighboring points
//     const beforePoint = sectionType === 'before'
//         ? undefined
//         : getPointOnCurve(points, curve, sectionIndex);
//     const afterPoint = sectionType === 'after'
//         ? undefined
//         : getPointOnCurve(points, curve, sectionIndex+1);

//     // generate LUTs for each section, if exists
//     const beforeSectionLut = sectionType === 'before'
//         ? undefined
//         : generateBezierLut(
//             beforePoint!.controlPos,
//             beforePoint!.anchorPos,
//             newPoint.controlPos,
//             newPoint.anchorPos,
//         );
//     const afterSectionLut = sectionType === 'after'
//         ? undefined
//         : generateBezierLut(
//             newPoint.controlPos,
//             newPoint.anchorPos,
//             afterPoint!.controlPos,
//             afterPoint!.anchorPos,
//         );

//     // determine new LUT
//     const newLut: lut = [...curveLut];
//     if (sectionType === 'before') {
//         newLut.unshift(afterSectionLut!);
//     } else if (sectionType === 'after') {
//         newLut.push(beforeSectionLut!);
//     } else if (sectionType === 'within') {
//         newLut.splice(sectionIndex, 1, beforeSectionLut!, afterSectionLut!);
//     } else {
//         sectionType satisfies never;
//     }

//     // return function that updates LUT
//     return (prevLuts: Map<string, lut>) => {
//         const newLuts = new Map(prevLuts);
//         newLuts.set(curveId, newLut);
//         return newLuts;
//     }
// }

// /**
//  * function generates the changes that need to be made to a LUT for a curve when a point is added
//  * @param points a record of all existing points
//  * @param curves  a record of all existing curves
//  * @param luts a record of all existing LUTs
//  * @param pointId ID of deleted point
//  * @returns function that updates affected LUT
//  */
// export const getLutFromDeletePoint = (
//     points: Map<string, pointPos>,
//     curves: Map<string, curve>,
//     luts: Map<string, lut>,
//     pointId: string,
// ) => {
//     // get location of point
//     const pointLocation = getPointLocation(curves, pointId);
//     if (pointLocation === undefined) { return; }
//     const { curveId, curve, pointIndex } = pointLocation;
  
//     // get affected LUT
//     const curveLut = luts.get(curveId);
//     if (curveLut === undefined) { return; }

//     // determine type of section point was in
//     const sectionIndex = pointIndex - 1;
//     const sectionType = sectionIndex < 0               ? 'before'
//                       : sectionIndex >= curve.length-2 ? 'after'
//                       :                                  'within';

//     // determine new LUT for affected curve
//     const newLut: lut = [...curveLut];
//     if (sectionType === 'before') {
//         newLut.shift();
//     } else if (sectionType === 'after') {
//         newLut.pop();
//     } else if (sectionType === 'within') {
//         const beforePoint = getPointOnCurve(points, curve, sectionIndex);
//         const afterPoint  = getPointOnCurve(points, curve, sectionIndex+2); // since +1 is deleted point
//         const newSectionLut = generateBezierLut(
//             beforePoint.controlPos,
//             beforePoint.anchorPos,
//             afterPoint.controlPos,
//             afterPoint.anchorPos,
//         );
//         newLut.splice(sectionIndex, 2, newSectionLut);
//     } else {
//         sectionType satisfies never;
//     }

//     // return function that updates LUT
//     return (prevLuts: Map<string, lut>) => {
//         const newLuts = new Map(prevLuts);
//         newLuts.set(curveId, newLut);
//         return newLuts;
//     };
// }
