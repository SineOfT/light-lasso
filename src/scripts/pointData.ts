import type { pos } from "./pos";
import { getPointLocation, type curve } from "./curve";

/**
 * type represents key used to identify data associated with point(s)
 * 
 * it must be guranteed that this type is consistent with the positionType value in pointData
 */
export type pointDataKey = string|{ before: string, after: string };

/** type represents changes in data associated with points as progress along curve */
export type pointData = {
    /** the value of the data at this point */
    value: number,
    /** whether this data is associated at a single point or between 2 points */
    positionType: 'atPoint'|'betweenPoints',
    /** if between 2 points, the position at which it is placed between */
    t: number,
    /** the position of the control point used to defined transitions between neighboring data */
    controlPos: pos,
};

/**
 * function generates changes made to data associated to given point when value updated
 * @param pointDatas record of all existing data associated with points
 * @param pointId ID of point data updated for
 * @param value new value of data at point
 * @returns function that updates point datas
 */
export const getDataFromUpdate = (
    pointDatas: Map<pointDataKey, pointData>,
    pointId: string,
    value: number,
) => {
    // get data at given point, skipping if doesn't exist
    const pointData = pointDatas.get(pointId);
    if (pointData == undefined) { return; }
    
    // determine new data
    const newPointData = { ...pointData };
    newPointData.value = value;

    // return function that updates point datas
    return (prevPointDatas: Map<pointDataKey, pointData>) => {
        const newPointDatas = new Map(prevPointDatas);
        newPointDatas.set(pointId, newPointData);
        return newPointDatas;
    }
}

/**
 * function generates changes made to data associated to given point when newly added
 * @param pointDatas record of all existing data associated with points
 * @param pointId ID of point data added to
 * @returns function that updates point datas
 */
export const getDataFromAddToPoint = (
    pointDatas: Map<pointDataKey, pointData>,
    pointId: string,
) => {
    // if point already has associated data, skip
    if (Object.hasOwn(pointDatas, pointId)) { return; };

    // determine new data associated to point
    const newPointData: pointData = {
        value: 0,
        positionType: 'atPoint',
        t: 0, // placeholder, not used
        controlPos: { x: 0.25, y: 0 } as pos,
    };
    const newPointDataKey: pointDataKey = pointId;

    // return function that updates adds new data
    return (prevPointDatas: Map<pointDataKey, pointData>) => {
        const newPointDatas = new Map(prevPointDatas);
        newPointDatas.set(newPointDataKey, newPointData);
        return newPointDatas;
    }
}

/**
 * function generates changes made to data associated to given point when deleted
 * @param curves a record of all existing curves
 * @param pointDatas a record of all existing data associated with points
 * @param pointId ID of point data deleted from
 * @returns function that updates point datas
 */
export const getDataFromDeleteFromPoint = (
    curves: Record<string, curve>,
    pointDatas: Map<pointDataKey, pointData>,
    pointId: string,
) => {
    // get location curve point is on
    const pointLocation = getPointLocation(curves, pointId);
    if (pointLocation == undefined) { return; }
    const { curve, pointIndex } = pointLocation;

    // want to delete data associated with deleted point
    const dataAtPointKey: pointDataKey = pointId;

    // want to either delete or update data positioned between deleted point, if exists
    const dataBeforePointKey: pointDataKey|undefined = pointIndex > 0
        ? { before: curve[pointIndex-1]!.anchorPointId, after: pointId }
        : undefined;
    const dataAfterPointKey: pointDataKey|undefined = pointIndex < curve.length-1
        ? { before: pointId, after: curve[pointIndex+1]!.anchorPointId }
        : undefined;
    
    // determine whether above neighboring data points should be deleted or updated
    const hasBetweenData = pointIndex > 0 && pointIndex < curve.length-1;

    // if data after point exists, update values
    const newDataBeforePoint: [pointDataKey, pointData]|undefined
        = dataBeforePointKey != undefined && hasBetweenData
        ? (() => {
            const data = pointDatas.get(dataBeforePointKey);
            if (data == undefined) { return; } // if data non existant, do not add new data
            const newData: pointData = { ...data };
            newData.t = newData.t / 2;
            newData.controlPos.x = newData.controlPos.x / 2;
            const newKey = { before: dataBeforePointKey.before, after: curve[pointIndex+1]!.anchorPointId };
            return [newKey, newData];
        })()
        : undefined;
    const newDataAfterPoint: [pointDataKey, pointData]|undefined
        = dataAfterPointKey != undefined && hasBetweenData
        ? (() => {
            const data = pointDatas.get(dataAfterPointKey);
            if (data == undefined) { return; } // if data non existant, do not add new data
            const newData: pointData = { ...data };
            newData.t = 0.5 + newData.t / 2;
            newData.controlPos.x = 0.5 + newData.controlPos.x / 2;
            const newKey = { before: curve[pointIndex-1]!.anchorPointId, after: dataAfterPointKey.after };
            return [newKey, newData];
        })()
        : undefined;

    // return function that updates data of associated points
    return (prevPointDatas: Map<pointDataKey, pointData>) => {
        const newPointDatas = new Map(prevPointDatas);
        newPointDatas.delete(dataAtPointKey);
        if (dataBeforePointKey != undefined) { newPointDatas.delete(dataBeforePointKey); }
        if (dataAfterPointKey  != undefined) { newPointDatas.delete(dataAfterPointKey);  }
        if (newDataBeforePoint != undefined) { newPointDatas.set(...newDataBeforePoint); }
        if (newDataAfterPoint  != undefined) { newPointDatas.set(...newDataAfterPoint);  }
        return newPointDatas;
    }
}
