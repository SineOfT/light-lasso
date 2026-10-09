import {
    getPointLocation,
    updateCurveFromAddPoint, updateCurveFromDeletePoint, updateCurveFromDelete,
} from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { point, selectedPoint } from '../scripts/point';
import type { curve } from '../scripts/curve';
import type { stateUpdaterFunctions } from '../App';

/** component defines controls to add or delete points based on selected point */
const SelectedPointAddDeleteControls = ({
    points,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing points */
    points: Map<string, point>,
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point */
    selectedPoint: selectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: stateUpdaterFunctions|undefined) => void,
}) => {
    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getPointLocation(curves, selectedPoint.id);
    if (pointLocation === undefined) { return <></>; }
    const { curveId } = pointLocation;

    /**
     * function handles adding new point to curve, relative to selected point
     * @param isAfter whether or not new point added before or after given point
     */
    const handleAddPoint = (isAfter: boolean) => {
        onUpdateState(updateCurveFromAddPoint(points, curves, selectedPoint.id, isAfter));
    }

    /**
     * function handles deleting the currently selected point
     */
    const handleDeletePoint = () => {
        onUpdateState(updateCurveFromDeletePoint(curves, selectedPoint.id));
    }

    /**
     * function handles deleting the entire curve the currently selected point is on
     */
    const handleDeleteCurve = () => {
        onUpdateState(updateCurveFromDelete(curves, curveId));
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
