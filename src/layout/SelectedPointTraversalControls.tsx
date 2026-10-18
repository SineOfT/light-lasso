import { updateSelectedPoint } from '../scripts/point';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { Curve } from '../scripts/curve';

/** component defines controls to move selection between points */
const SelectedPointTraversalControls = ({
    curves,
    selectedPoint,
    selectedCurveId,
    onUpdateState,
}: {
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the currently selected point */
    selectedPoint: SelectedPoint,
    /** ID of curve currently selected */
    selectedCurveId: string,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    /**
     * function handles updating point currently selected
     * @param newSelectedPoint point to newly select, or null if deselecting
     */
    const handleUpdateSelected = (newSelectedPoint: SelectedPoint|null) => {
        onUpdateState(updateSelectedPoint(newSelectedPoint));
    }

    // find location of selected point in curve, showing nothing if non-existant
    const curve = curves.get(selectedCurveId);
    if (curve === undefined) { return <></>; }
    const index = curve.findIndex(({ id }) => id === selectedPoint.id);
    if (index === -1) { return <></>; }

    // find neighboring points
    const beforeSelectedPoint: SelectedPoint|undefined = index-1 >= 0
        ? { id: curve[index-1]!.id, type: 'anchor' }
        : undefined;
    const afterSelectedPoint: SelectedPoint|undefined = index+1 < curve.length
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