import { getPointLocation } from "./curve";

import type { pos } from "./pos";
import type { point } from "./point";
import type { curve } from "./curve";

/** type represents changes in data associated with points as progress along curve */
export type pointData = {
    /** the value of the data at this point */
    value: number,
    /** the position of the control point used to defined transitions between neighboring data */
    controlPos: pos,
    /** any other points place before this data point and after previous data point */
    beforePointsData: point[],
    /** any other points place after this data point and before next data point */
    afterPointsData: point[],
};

/**
 * function generates changes made to data associated to given point when value updated
 * @param pointDatas record of all existing data associated with points
 * @param pointId ID of point data updated for
 * @param value new value of data at point
 * @returns function that updates point datas
 */
export const updateDataFromUpdate = (
    pointDatas: Map<string, pointData>,
    pointId: string,
    newValue: number,
) => {
    // get data at given point, skipping if doesn't exist
    const pointData = pointDatas.get(pointId);
    if (pointData === undefined) { return; }
    
    // determine new data
    const newPointData = { ...pointData };
    newPointData.value = newValue;

    // return function that updates point datas
    return {
        updatePointDatas: (prevPointDatas: Map<string, pointData>) => {
            const newPointDatas = new Map(prevPointDatas);
            newPointDatas.set(pointId, newPointData);
            return newPointDatas;
        },
    }
}

/**
 * function generates changes made to data associated to given point when newly added
 * @param pointDatas record of all existing data associated with points
 * @param pointId ID of point data added to
 * @returns function that updates point datas
 */
export const updateDataFromAddToPoint = (
    pointDatas: Map<string, pointData>,
    pointId: string,
) => {
    // if point already has associated data, skip
    if (Object.hasOwn(pointDatas, pointId)) { return; };

    // determine new data associated to point
    const newPointData: pointData = {
        value: 0,
        controlPos: { x: 0.25, y: 0 } as pos,
        beforePointsData: [], // no points placed before or after
        afterPointsData: [],  //
    };

    // return function that updates adds new data
    return {
        updatePointDatas: (prevPointDatas: Map<string, pointData>) => {
            const newPointDatas = new Map(prevPointDatas);
            newPointDatas.set(pointId, newPointData);
            return newPointDatas;
        },
    };
}

/**
 * function generates changes made to data associated to given point when deleted
 * @param curves a record of all existing curves
 * @param pointDatas a record of all existing data associated with points
 * @param pointId ID of point data deleted from
 * @returns function that updates point datas
 */
export const updateDataFromDeleteFromPoint = (
    curves: Map<string, curve>,
    pointDatas: Map<string, pointData>,
    pointId: string,
) => {
    // get location curve point is on
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation === undefined) { return; }
    const { curve, pointIndex } = pointLocation;

    // will always delete data at given point, and may modify data at neighboring points

    // get ID and new data for points before, or undefined if no change
    const newDataBeforePoint: [string, pointData]|undefined = (() => {
        // find ID of point before, skipping if out of bounds
        if (pointIndex <= 0) { return; }
        const beforePointId = curve[pointIndex-1]!;
        // get data at point before, skipping if doens't exist
        const data = pointDatas.get(beforePointId);
        if (data === undefined) { return; }
        if (data.afterPointsData.length === 0) { return; }
        // create copy of data to modify
        const newData: pointData = { ...data };
        // if after delete is now last point on curve, no points after so delete
        if (pointIndex === curve.length-1) {
            newData.afterPointsData = [];
        // otherwise, update timings of each data point after
        } else {
            newData.afterPointsData.forEach((data) => {
                data.controlPos.x = data.controlPos.x / 2;
                data.anchorPos.x  = data.anchorPos.x  / 2;
            });
        }
        return [beforePointId, newData];
        })();
    // get ID and new data for points after, or undefined if no change
    const newDataAfterPoint: [string, pointData]|undefined = (() => {
        // find ID of point before, skipping if out of bounds
        if (pointIndex >= curve.length-1) { return; }
        const afterPointId = curve[pointIndex+1]!;
        // get data at point after, skipping if doens't exist
        const data = pointDatas.get(afterPointId);
        if (data === undefined) { return; }
        if (data.beforePointsData.length === 0) { return; }
        // create copy of data to modify
        const newData: pointData = { ...data };
        // if after delete is now first point on curve, no points before so delete
        if (pointIndex === 0) {
            newData.beforePointsData = [];
        // otherwise, update timings of each data point before
        } else {
            newData.beforePointsData.forEach((data) => {
                data.controlPos.x = data.controlPos.x / 2 + 0.5;
                data.anchorPos.x  = data.anchorPos.x  / 2 + 0.5;
            });
        }
        return [afterPointId, newData];
    })();

    // return function that updates data of associated points
    return {
        updatePointDatas: (prevPointDatas: Map<string, pointData>) => {
            const newPointDatas = new Map(prevPointDatas);
            newPointDatas.delete(pointId);
            if (newDataBeforePoint !== undefined) { newPointDatas.set(...newDataBeforePoint); }
            if (newDataAfterPoint  !== undefined) { newPointDatas.set(...newDataAfterPoint);  }
            return newPointDatas;
        },
    };
}
