import { updateSelectedPoint } from '../scripts/point';
import { getEntireCurveLocation } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { pointUpdaterFunctions, selectedPoint } from '../scripts/point';
import type { curve } from '../scripts/curve';

/** component defines controls to move selection between points */
const SelectedPointTraversalControls = ({
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point */
    selectedPoint: selectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: pointUpdaterFunctions|undefined) => void,
}) => {
    /**
     * function handles updating point currently selected
     * @param newSelectedPoint point to newly select, or null if deselecting
     */
    const handleUpdateSelected = (newSelectedPoint: selectedPoint|null) => {
        onUpdateState(updateSelectedPoint(newSelectedPoint));
    }

    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getEntireCurveLocation(curves, selectedPoint.id);
    if (pointLocation === undefined) { return <></>; }
    const { curve, index } = pointLocation;

    // find neighboring points
    const beforeSelectedPoint: selectedPoint|undefined = index-1 >= 0
        ? { id: curve[index-1]!.id, type: 'anchor' }
        : undefined;
    const afterSelectedPoint: selectedPoint|undefined = index+1 < curve.length
        ? { id: curve[index+1]!.id,  type: 'anchor' }
        : undefined;

    return (
        <InputSet title="Traverse Points">
            <Button title="< Point Before" disabled={beforeSelectedPoint === undefined}
                onClick={() => { handleUpdateSelected(beforeSelectedPoint!); }}
            />
            <Button title="Point After >"  disabled={afterSelectedPoint === undefined}
                onClick={() => { handleUpdateSelected(afterSelectedPoint!); }}
            />
        </InputSet>
    );
}

export default SelectedPointTraversalControls;