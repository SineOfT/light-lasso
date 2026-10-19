import { generateId } from './util';
import { EMPTY_POS } from './pos';
import { EMPTY_CONTROL_POS } from './controlPos';

import type { Point, PartialPoint, SelectedPoint, PointUpdaterFunctions, PointType } from './point';
import type { PosPoint } from './posPoint';

/** type represents curve that holds the IDs of all points in the curve, in order */
export type Curve = {
    /** ID of point at position on curve */
    id: string,
    /** if null, has associated position; otherwise, interpolation between nearest positioned neighbors */
    t: number|null,
}[];

/** type represents point on curve, holding point value and t interpolation position */
export interface CurvePoint<T extends Point> {
    /** ID of point */
    id: string,
    /** value of point */
    point: T,
    /** if null, has associated position; otherwise, interpolated between positioned neighbors */
    t: number|null,
}

/**
 * function gets index of given point on curve and ID of curve point is located on,
 * looking at all points on the curve
 * @param curves a record of all existing curves
 * @param pointId the ID of the point to locate
 * @returns the location of the point in the entire curve curves, or undefined if non-existant
 */
export const getEntirePointLocation = (
    curves: Map<string, Curve>,
    pointId: string,
) => {
    // find which curve point is within
    const curveObj = Array.from(curves)
        .find(([_, curve]) => curve.some(({ id }) => id === pointId));
    if (curveObj === undefined) { return; }
    const [curveId, curve] = curveObj;

    // find index of point on curve
    const index = curve.findIndex(({ id }) => id === pointId);

    return { curveId, curve, index };
}

/**
 * function gets all points on given curve that is of given type
 * @template T the type of data on the curve to get
 * @param points a record of all existing points from which to get the curve for
 * @param curves a record of all existing curves
 * @param curveId the ID of the curve to get points
 * @returns curve consisting of all points of given type
 */
export const getCurvePoints = <T extends Point>(
    points: Map<string, T>,
    curves: Map<string, Curve>,
    curveId: string,
) => {
    // get curve, if exists
    const curve = curves.get(curveId);
    if (curve === undefined) { return; }

    // filter curve to only contain points existing in desired record
    const curvePoints = curve
        .map(({ id, t }, index) => ({ id, point: points.get(id), index, t }))
        .filter((curvePoint): curvePoint is { id: string, point: T, index: number, t: number } =>
            curvePoint.point !== undefined);

    return curvePoints;
}

/**
 * function gets index of given point on curve and ID of curve point is located on,
 * looking only at the points on the curve where a given data point type is defined
 * @template T the type of data on the curve to get
 * @param points a record of all existing points from which to get the curve for
 * @param curves a record of all existing curves
 * @param pointId the ID of the point to locate
 * @returns the location of the point in curves, or undefined if non-existant
 */
export const getCurvePointLocation = <T extends Point>(
    points: Map<string, T>,
    curves: Map<string, Curve>,
    pointId: string,
) => {
    // find location of point on entire curve
    const pointLocation = getEntirePointLocation(curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curveId, curve, index } = pointLocation;

    // get curve points from curve
    const curvePoints = getCurvePoints(points, curves, curveId);
    if (curvePoints === undefined) { return; }

    // find index of point on curve points
    const curvePointIndex = curvePoints.findIndex(({ id }) => id === pointId);

    // return relevant data
    return { curveId, curve, index, curvePoints, curvePointIndex };
}

/**
 * function adds new curve, with point positioned at top left of canvas
 * @returns functions that update affected curve and points
 */
export const updateCurveFromAdd = () => {
    // generate IDs for curve and point
    const newCurveId = generateId();
    const newPointId = generateId();

    // determine new curve, default point, and selected point
    const newCurve: Curve = [{ id: newPointId, t: null }]; // position, so not interpolated
    const newPoint: PosPoint = { anchorPos: EMPTY_POS, controlPos: EMPTY_CONTROL_POS };
    const newSelectedPoint: SelectedPoint = { id: newPointId, type: 'anchor' };

    // return function that adds curve and point
    return {
        updatePoints: (prevPoints: Map<string, PosPoint>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(newPointId, newPoint);
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, Curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(newCurveId, newCurve);
            return newCurves;
        },
        newSelectedPoint,
    };
}

/**
 * function handles deleting given curve
 * @param curveId ID of curve to delete
 * @returns functions that updates curve, points, and point datas
 */
export const updateCurveFromDelete = (
    curveId: string,
) => {
    // return functions that update state
    return {
        updateCurves: (prevCurves: Map<string, Curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.delete(curveId);
            return newCurves;
        },
        newSelectedPoint: null,
    }
}

/**
 * function generates changes that need to be made to curve when point updated
 * @template T the type of data to update a new point of
 * @param pointType the type of the point to change
 * @param points a record of all existing points of the given type
 * @param curves a record of all existing curves
 * @param pointId ID of the point to update
 * @param changedPoint the values of the point that have changed from the update
 * @param newT the new t value at the point on the curve, if set and not already positioned
 * @returns functions that update affected points
 */
export const updateCurveFromUpdatePoint = <T extends Point>(
    pointType: PointType<T>,
    points: Map<string, T>,
    curves: Map<string, Curve>,
    pointId: string,
    changedPoint: PartialPoint<T>,
    newT?: number,
): PointUpdaterFunctions|undefined => {
    // find location of point
    const pointLocation = getEntirePointLocation(curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curveId, index } = pointLocation;

    // find current value of point 
    const point = points.get(pointId);
    if (point === undefined) { return; }

    // find new value of point by applying changes
    const newPoint: T = { ...point, ...changedPoint };
    if (changedPoint.controlPos !== undefined) {
        newPoint.controlPos = { ...point.controlPos, ...changedPoint.controlPos };
    }

    // return functions that updates points
    return {
        [pointType.updaterFunctionKey]: (prevPoints: Map<string, T>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(pointId, newPoint);
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, Curve>) => {
            if (newT === undefined) { return prevCurves; }
            const newCurves = new Map(prevCurves);
            const newCurvePoint = newCurves.get(curveId)?.[index];
            if (newCurvePoint === undefined) { return prevCurves; }
            if (newCurvePoint.t === null) { return prevCurves; } // do not update if already positioned
            newCurvePoint.t = newT;
            return newCurves;
        }
    };
}

/**
 * function generates the changes that need to be made to add a point to a section on a curve
 * 
 * the value of the new point is determined based on what existing points this point is placed between
 * 
 * @template T the type of data to add a new point of
 * @param pointType the type of the point to change
 * @param points a record of all existing points of given type
 * @param curves a record of all existing curves
 * @param pointId the ID of the point next to the new point
 * @param isAfter whether the point is added before or after the given point
 * @returns functions that updates affected curve and points
 */
export const updateCurveFromAddPoint = <T extends Point>(
    pointType: PointType<T>,
    points: Map<string, T>,
    curves: Map<string, Curve>,
    pointId: string,
    isAfter: boolean,
): PointUpdaterFunctions|undefined => {
    // get location of point
    const pointLocation = getCurvePointLocation(points, curves, pointId);
    if (pointLocation === undefined) { return };
    const { curveId, curve, curvePoints, curvePointIndex } = pointLocation;

    // determine indexes of neighboring points on curve
    const [beforeCurvePointIndex, afterCurvePointIndex] = isAfter
        ? [curvePointIndex,       curvePointIndex+1   ]
        : [curvePointIndex-1,     curvePointIndex     ];

    // find neighboring points
    const beforeCurvePoint = curvePoints[beforeCurvePointIndex];
    const afterCurvePoint  = curvePoints[afterCurvePointIndex];
    
    // find index at which to add new point on curve
    const newIndex =
        beforeCurvePoint !== undefined ? beforeCurvePoint.index + 1
      : afterCurvePoint  !== undefined ? afterCurvePoint.index
      : 0; // should never happen, so just add to start
    
    // generate new point and curve, select it
    const newPointId = generateId();
    const { newPoint, t, newBeforeControlPosLength, newAfterControlPosLength }
        = pointType.calculateNewPoint(beforeCurvePoint, afterCurvePoint);
    const newCurve = curve.toSpliced(newIndex, 0, { id: newPointId, t });
    const newSelectedPoint: SelectedPoint = { id: newPointId, type: 'anchor' };

    // return functions that modifies points and curve
    return {
        [pointType.updaterFunctionKey]: (prevPoints: Map<string, T>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(newPointId, newPoint);
            if (beforeCurvePoint !== undefined && newBeforeControlPosLength !== undefined) {
                newPoints.get(beforeCurvePoint.id)!.controlPos.afterLength = newBeforeControlPosLength;
            }
            if (afterCurvePoint !== undefined && newAfterControlPosLength !== undefined) {
                newPoints.get(afterCurvePoint.id)!.controlPos.beforeLength = newAfterControlPosLength;
            }
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, Curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(curveId, newCurve);
            return newCurves;
        },
        newSelectedPoint,
    };
}

/**
 * function generates the changes that need to be made to add a point to an existing point on a curve
 * 
 * the value of the new point is determined based on what existing points this point is placed between
 * 
 * @template T the type of data to add a new point of
 * @param pointType the type of the point to change
 * @param points a record of all existing points of given type
 * @param curves a record of all existing curves
 * @param pointId the ID of the existing point to add the new point into 
 * @returns functions that updates affected curve and points
 */
export const updateCurveFromAddToExisting = <T extends Point>(
    pointType: PointType<T>,
    points: Map<string, T>,
    curves: Map<string, Curve>,
    pointId: string,
): PointUpdaterFunctions|undefined => {
    // find location of point, skipping if point doesn't exist or already set
    const pointLocation = getCurvePointLocation(points, curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curveId, curve, index, curvePoints, curvePointIndex } = pointLocation;
    if (curvePointIndex !== -1) { return; }

    // find neighboring points
    const { beforeCurvePoint, afterCurvePoint } = curvePoints.reduce<{
        beforeCurvePoint: CurvePoint<T>|undefined,
        afterCurvePoint:  CurvePoint<T>|undefined
    }>(
        (acc, { id, point, index: i, t }) => {
            // if this point before desired point, update to new closest before point
            if (i < index) {
                acc.beforeCurvePoint = { id, point, t };
            // if this point just became after desired point, update to after point
            } else if (acc.afterCurvePoint === undefined) {
                acc.afterCurvePoint = { id, point, t };
            }
            return acc;
        },
        { beforeCurvePoint: undefined, afterCurvePoint: undefined }
    );

    // create copy of curve to update, find updated point
    const newCurve: Curve = [...curve];
    const newCurvePoint = newCurve[index]!;

    // generate new point
    const { newPoint, t, newBeforeControlPosLength, newAfterControlPosLength }
        = pointType.calculateNewPoint(beforeCurvePoint, afterCurvePoint, newCurvePoint.t);

    // updating t values on new curve if changed
    if (newCurvePoint.t !== null) { // null is stronger value, so only set if not already null
        newCurvePoint.t = t;
    }

    // select anchor of changed point
    const newSelectedPoint: SelectedPoint = { id: pointId, type: 'anchor' };
    
    // return functions that modifies points and curve
    return {
        [pointType.updaterFunctionKey]: (prevPoints: Map<string, T>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(pointId, newPoint);
            if (beforeCurvePoint !== undefined && newBeforeControlPosLength !== undefined) {
                newPoints.get(beforeCurvePoint.id)!.controlPos.afterLength = newBeforeControlPosLength;
            }
            if (afterCurvePoint !== undefined && newAfterControlPosLength !== undefined) {
                newPoints.get(afterCurvePoint!.id)!.controlPos.beforeLength = newAfterControlPosLength;
            }
            return newPoints;
        },
        updateCurves: (prevCurves: Map<string, Curve>) => {
            const newCurves = new Map(prevCurves);
            newCurves.set(curveId, newCurve);
            return newCurves;
        },
        newSelectedPoint,
    };
}

/**
 * function generates changes that need to be made to point when point deleted
 * @template T the type of data to delete a new point of
 * @param pointType the type of the point to change
 * @param points a record of all existing points of given type
 * @param curves a record of all existing curves
 * @param pointId ID of the point to delete
 * @returns functions that update affected points
 */
export const updateCurveFromDeletePoint = <T extends Point>(
    pointType: PointType<T>,
    points: Map<string, T>,
    curves: Map<string, Curve>,
    pointId: string,
): PointUpdaterFunctions|undefined => {
    // find location of point
    const pointLocation = getCurvePointLocation(points, curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curveId, curve, index, curvePoints, curvePointIndex } = pointLocation;

    // find deleted point and neighboring points
    const deletedCurvePoint = curvePoints[curvePointIndex]!;
    const beforeCurvePoint  = curvePoints[curvePointIndex-1];
    const afterCurvePoint   = curvePoints[curvePointIndex+1];

    // calculate new t value
    const newT = pointType.calculateNewDeletedPointT(deletedCurvePoint, beforeCurvePoint, afterCurvePoint);

    // calculate new curve
    const newCurve = newT !== undefined
        ? curve.toSpliced(index, 1, { ...curve[index]!, t: newT })
        : undefined;

    // return functions that updates points
    return {
        [pointType.updaterFunctionKey]: (prevPoints: Map<string, T>) => {
            const newPoints = new Map(prevPoints);
            newPoints.delete(pointId);
            return newPoints;
        },
        ...(newCurve !== undefined ? {
            updateCurves: (prevCurves: Map<string, Curve>) => {
                const newCurves = new Map(prevCurves);
                newCurves.set(curveId, newCurve);
                return newCurves;
            }
        } : { })
    };
}
