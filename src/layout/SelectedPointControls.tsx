import { getPointLocation } from '../scripts/curves';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { curve } from '../scripts/curves';

/**
 * component defines controls when point is selected
 */
function SelectedPointControls({
    curves,
    selectedPointId,
    onAddPoint,
    onDeletePoint,
    onDeleteCurve,
    onUpdateSelected,
}: {
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** the ID of the currently selected point */
    selectedPointId: string
    /** function adds a new point before or after a given point */
    onAddPoint: (pointId: string, isAfter: boolean) => void,
    /** function deletes point */
    onDeletePoint: (pointId: string) => void,
    /** function deletes given curve */
    onDeleteCurve: (curveId: string) => void, 
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: string|null) => void,
}) {

    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getPointLocation(curves, selectedPointId);
    if (pointLocation == undefined) { return <></>; }
    const { curveId, curve, pointIndex } = pointLocation;

    // find neighboring points
    const beforeAnchorPointId = pointIndex-1 >= 0
        ? curve[pointIndex-1]!.anchorPointId
        : undefined;
    const afterAnchorPointId  = pointIndex+1 < curve.length
        ? curve[pointIndex+1]!.anchorPointId
        : undefined;

    return (<>
        <InputSet title="Traverse Points">
            <Button title="< Point Before" disabled={beforeAnchorPointId == undefined}
                onClick={() => { onUpdateSelected(beforeAnchorPointId!); }}
            />
            <Button title="Point After >"  disabled={afterAnchorPointId  == undefined}
                onClick={() => { onUpdateSelected(afterAnchorPointId!); }}
            />
        </InputSet>
        <InputSet title="Add Point">
            <Button title="+ Add Point Before"
                onClick={() => { onAddPoint(selectedPointId, false); }}
            />
            <Button title="Add Point After +"
                onClick={() => { onAddPoint(selectedPointId, true); }}
            />
        </InputSet>
        <InputSet title="Delete Point">
            <Button title="- Delete Point"
                onClick={() => { onDeletePoint(selectedPointId); }}
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