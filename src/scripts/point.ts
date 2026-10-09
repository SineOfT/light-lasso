import { EMPTY_POS } from './pos';

import type { pos } from './pos';

/** interface defines point, which has control position & anchor position */
export interface point {
    controlPos: pos,
    anchorPos: pos,
}

/** defines empty placeholder point, with all values set to 0 */
export const EMPTY_POINT: point = {
    controlPos: EMPTY_POS,
    anchorPos: EMPTY_POS,
};

/** type defines 3 different types of positions stored in point */
export type pointType = 'control'|'invControl'|'anchor';

/** type represents description of selected point, indicating ID and which point in group */
export type selectedPoint = {
    id: string,
    type: pointType,
};

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
    points: Map<string, point>,
    pointId: string,
) => {
    // get point with point ID, if exists
    const point = points.get(pointId);
    if (point === undefined) {
        console.warn('Tried to get non-existent point with ID %s', pointId);
        return EMPTY_POINT;
    }

    return point;
}

/**
 * function generates changes needed to update given point
 * @param points a record of all existing points
 * @param pointId ID of updated point
 * @param changedPoint positions in points that have been changed
 * @returns function that updates points
*/
export const updatePointsFromUpdate = (
    points: Map<string, point>,
    pointId: string,
    changedPoint: Partial<point>,
) => {
    // get point at given ID, skpping if doesn't exist
    const point = points.get(pointId);
    if (point === undefined) { return; }

    // determine new point by updating relevant position
    const newPoint: point = { ...point };
    Object.assign(newPoint, changedPoint);

    // return function that updates points
    return {
        updatePoints: (prevPoints: Map<string, point>) => {
            const newPoints = new Map(prevPoints);
            newPoints.set(pointId, newPoint);
            return newPoints;
        },
    };
}

/**
 * function generates changes needed to update current selected point
 * @param newSelectedPoint the newly selected point, or null if deselected
 * @returns new selected point
*/
export const updateSelectedPoint
    = (newSelectedPoint: selectedPoint|null) => ({ newSelectedPoint });
