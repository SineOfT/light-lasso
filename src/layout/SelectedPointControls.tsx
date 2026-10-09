import { getInvPos } from '../scripts/pos';
import { getPoint, getPointLocation } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import TogglableInputSet from '../templates/TogglableInputSet';
import Button from '../templates/Button';
import PosInput from '../templates/PosInput';
import SliderNumberInput from '../templates/SliderNumberInput';

import type { pos } from '../scripts/pos';
import type { curve, selectedPointData } from '../scripts/curve';
import type { pointDataKey, pointData } from '../scripts/pointData';

/** component defines controls when point is selected */
const SelectedPointControls = ({
    points,
    curves,
    radiusDatas,
    selectedPointData,
    onUpdatePoint,
    onAddPoint,
    onDeletePoint,
    onDeleteCurve,
    onUpdateRadiusOnPoint,
    onAddRadiusToPoint,
    onDeleteRadiusFromPoint,
    onUpdateSelected,
}: {
    /** a record of all existing points */
    points: Record<string, pos>,
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** a record of all existing radius curves */
    radiusDatas: Map<pointDataKey, pointData>,
    /** the currently selected point */
    selectedPointData: selectedPointData,
    /** function updates position of given point */
    onUpdatePoint: (pointId: string, newPos: pos) => void,
    /** function adds a new point before or after a given point */
    onAddPoint: (pointId: string, isAfter: boolean) => void,
    /** function deletes point */
    onDeletePoint: (pointId: string) => void,
    /** function deletes given curve */
    onDeleteCurve: (curveId: string) => void,
    /** function updates value of radius associated with given point */
    onUpdateRadiusOnPoint: (pointId: string, radius: number) => void,
    /** function adds radius to given point */
    onAddRadiusToPoint: (pointId: string) => void,
    /** function deletes radius from given point */
    onDeleteRadiusFromPoint: (pointId: string) => void,
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: selectedPointData|null) => void,
}) => {
    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getPointLocation(curves, selectedPointData.id);
    if (pointLocation == undefined) { return <></>; }
    const { curveId, curve, pointIndex, isControlPoint } = pointLocation;

    // find position of selected point
    const anchorPoint  = getPoint(points, curve[pointIndex]!.anchorPointId);
    const controlPoint = getPoint(points, curve[pointIndex]!.controlPointId);
    const selectedPoint = isControlPoint
        ? selectedPointData.isInverse
            ? getInvPos(controlPoint, anchorPoint)
            : controlPoint
        : anchorPoint;

    // find radius of selected point, if any
    const radiusData = radiusDatas.get(selectedPointData.id);

    /** 
     * function handles updating whether there is a radius associated with the selected point
     * @param isToggled whether the radius has just been toggled or not
     */
    const handleToggleRadius = (isToggled: boolean) => {
        if (isToggled) {
            onAddRadiusToPoint(selectedPointData.id);
        } else {
            onDeleteRadiusFromPoint(selectedPointData.id);
        }
    }

    /**
     * function handles updating value of radius at selected point
     * @param radius new radius at selected point
     */
    const handleUpdateRadius = (radius: number) => {
        onUpdateRadiusOnPoint(selectedPointData.id, radius);
    }

    /**
     * function handles updating position of selected point
     * @param changedPosValues values in pos that have changed; unlisted keys are unchanged
     */
    const handleUpdateSelectedPos = (changedPosValues: { x?: number, y?: number }) => {
        // determine new pos by applying changing to current selected point
        const newRawPos = { ...selectedPoint, ...changedPosValues } as pos;

        // if inverse control point, invert position
        const newPos = (isControlPoint && selectedPointData.isInverse)
            ? getInvPos(newRawPos, anchorPoint)
            : newRawPos;

        // update state
        onUpdatePoint(selectedPointData.id, newPos);
    }

    // find neighboring points
    const beforeAnchorPointId = pointIndex-1 >= 0
        ? curve[pointIndex-1]!.anchorPointId
        : undefined;
    const afterAnchorPointId  = pointIndex+1 < curve.length
        ? curve[pointIndex+1]!.anchorPointId
        : undefined;
    const beforeSelectedPointData = beforeAnchorPointId != undefined
        ? { id: beforeAnchorPointId, isInverse: false } as selectedPointData
        : undefined;
    const afterSelectedPointData  = afterAnchorPointId != undefined
        ? { id: afterAnchorPointId,  isInverse: false } as selectedPointData
        : undefined;

    return (<>
        <InputSet title="Position">
            <PosInput id="point-pos" pos={selectedPoint}
                onUpdatePos={handleUpdateSelectedPos}
            />
        </InputSet>
        <TogglableInputSet title="Radius" id="radius" isToggled={radiusData != undefined}
            onUpdateToggled={handleToggleRadius}
        >
            {radiusData != undefined && (
                <SliderNumberInput id="radius" value={radiusData.value}
                    onUpdateValue={handleUpdateRadius}
                />
            )}
        </TogglableInputSet>
        <InputSet title="Traverse Points">
            <Button title="< Point Before" disabled={beforeAnchorPointId == undefined}
                onClick={() => { onUpdateSelected(beforeSelectedPointData!); }}
            />
            <Button title="Point After >"  disabled={afterAnchorPointId  == undefined}
                onClick={() => { onUpdateSelected(afterSelectedPointData!); }}
            />
        </InputSet>
        <InputSet title="Add Point">
            <Button title="+ Add Point Before"
                onClick={() => { onAddPoint(selectedPointData.id, false); }}
            />
            <Button title="Add Point After +"
                onClick={() => { onAddPoint(selectedPointData.id, true); }}
            />
        </InputSet>
        <InputSet title="Delete Point">
            <Button title="- Delete Point"
                onClick={() => { onDeletePoint(selectedPointData.id); }}
            />
        </InputSet>
        <InputSet title="Delete Curve">
            <Button title="- Delete Curve"
                onClick={() => { onDeleteCurve(curveId); }}
            />
        </InputSet>
    </>);
}

export default SelectedPointControls;