import { POS_POINT_TYPE } from '../scripts/posPoint';
import {
    getEntireCurveLocation, updateCurveFromAddPoint, updateCurveFromDelete, updateCurveFromDeletePoint,
} from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { Curve } from '../scripts/curve';

/** component defines controls to add or delete points based on selected point */
const SelectedPointAddDeleteControls = ({
    posPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing points */
    posPoints: Map<string, PosPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the currently selected point */
    selectedPoint: SelectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getEntireCurveLocation(curves, selectedPoint.id);
    if (pointLocation === undefined) { return <></>; }
    const { curveId } = pointLocation;

    /**
     * function handles adding new point to curve, relative to selected point
     * @param isAfter whether or not new point added before or after given point
     */
    const handleAddPoint = (isAfter: boolean) => {
        onUpdateState(updateCurveFromAddPoint(POS_POINT_TYPE,
            posPoints, curves, selectedPoint.id, isAfter));
    }

    /**
     * function handles deleting the currently selected point
     */
    const handleDeletePoint = () => {
        onUpdateState(updateCurveFromDeletePoint(POS_POINT_TYPE, selectedPoint.id));
    }

    /**
     * function handles deleting the entire curve the currently selected point is on
     */
    const handleDeleteCurve = () => {
        onUpdateState(updateCurveFromDelete(curveId));
    }

    return (<>
        <InputSet title="Add Point">
            <Button title="+ Add Point Before"
                onClick={() => { handleAddPoint(false); }}
            />
            <Button title="Add Point After +"
                onClick={() => { handleAddPoint(true); }}
            />
        </InputSet>
        <InputSet title="Delete Point">
            <Button title="- Delete Point"
                onClick={handleDeletePoint}
            />
        </InputSet>
        <InputSet title="Delete Curve">
            <Button title="- Delete Curve"
                onClick={handleDeleteCurve}
            />
        </InputSet>
    </>);
}

export default SelectedPointAddDeleteControls;
