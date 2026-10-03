import SliderNumberInput from '../templates/SliderNumberInput';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';

import type { pos } from '../scripts/pos';
import { getPointLocationOnCurve, type curve } from '../scripts/curves';

/**
 * component defines controls to adjust local points and curves
 */
function LocalControls({
    curves,
    selectedPointId,
    onAddPoint,
    onUpdateSelected,
}: {
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** the ID of the currently selected point, or null if none selected */
    selectedPointId: string|null,
    /** function adds a new point at a given index of a given curve */
    onAddPoint: (curveId: string, pointIndex: number) => void,
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: string|null) => void,
}) {

    /**
     * function finds the point before and after the current selected point on the curve
     * it is located on, if they exists
     * @returns the point before and after the selected point, or undefined if they do not exist
     */
    const findNeighboringPointIds = (curve: curve, pointIndex: number) => {
        // if no point selected, no neighboring points
        if (selectedPointId == null) { return; }

        // find location of point in curves

        // find points before and after selected point on curve, skipping control points
        const pointBeforeId = pointIndex-2 >= 0
            ? curve[pointIndex-2]!
            : null;
        const pointAfterId  = pointIndex+2 < curve.length
            ? curve[pointIndex+2]!
            : null;

        // return relevant data
        return { pointBeforeId, pointAfterId };
    }

    // if no point selected, nothing to show
    if (selectedPointId == null) { return <></>; }

    // find location of selected point in curves, showing nothing if non-existant
    const pointLocation = getPointLocationOnCurve(curves, selectedPointId);
    if (pointLocation == undefined) { return <></>; }
    const { curveId, curve, anchorPointIndex } = pointLocation;

    // find neighboring points
    const neighboringPointIds = findNeighboringPointIds(curve, anchorPointIndex);
    const { pointBeforeId, pointAfterId } = neighboringPointIds
        ?? { pointBeforeId: null, pointAfterId: null };

    return (<div className="p-m">
        <InputSet title="Traverse Points">
            <Button title="< Point Before" disabled={pointBeforeId == null}
                onClick={() => { onUpdateSelected(pointBeforeId); }}
            />
            <Button title="Point After >"  disabled={pointAfterId  == null}
                onClick={() => { onUpdateSelected(pointAfterId); }}
            />
        </InputSet>
        <InputSet title="Add Point">
            <Button title="+ Add Point Before"
                onClick={() => { onAddPoint(curveId, anchorPointIndex); }}
            />
            <Button title="Add Point After +"
                onClick={() => { onAddPoint(curveId, anchorPointIndex+1); }}
            />
        </InputSet>
    </div>);
}

export default LocalControls;