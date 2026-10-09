import { getInvPos } from '../scripts/pos';
import { getPoint, updatePointsFromUpdate } from '../scripts/point';
import InputSet from '../templates/InputSet';
import PosInput from '../templates/PosInput';

import type { pos } from '../scripts/pos';
import type { point, selectedPoint } from '../scripts/point';
import type { stateUpdaterFunctions } from '../App';

/** component defines controls to change position of selected point */
const SelectedPointPositionControls = ({
    points,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing points */
    points: Map<string, point>,
    /** the currently selected point */
    selectedPoint: selectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: stateUpdaterFunctions|undefined) => void,
}) => {
    // find position of selected point
    const { controlPos, anchorPos } = getPoint(points, selectedPoint.id);
    const selectedPos =
        selectedPoint.type === 'control'    ? controlPos
      : selectedPoint.type === 'invControl' ? getInvPos(controlPos, anchorPos)
      : selectedPoint.type === 'anchor'     ? anchorPos
      : selectedPoint.type satisfies never;

    /**
     * function handles updating position of selected point
     * @param changedPos values in pos that have changed; unlisted keys are unchanged
     */
    const handleUpdateSelectedPos = (changedPos: Partial<pos>) => {
        // determine new pos by applying changing to current selected point
        const newRawPos = { ...selectedPos, ...changedPos } as pos;

        // if inverse control point, invert position
        const newPos = selectedPoint.type === 'invControl'
            ? getInvPos(newRawPos, anchorPos)
            : newRawPos;

        // determine new point
        const newPoint = selectedPoint.type === 'anchor'
            ? { anchorPos: newPos }
            : { controlPos: newPos };

        // update state
        onUpdateState(updatePointsFromUpdate(points, selectedPoint.id, newPoint));
    }

    return (
        <InputSet title="Position">
            <PosInput id="point-pos" pos={selectedPos}
                onUpdatePos={handleUpdateSelectedPos}
            />
        </InputSet>
    );
}

export default SelectedPointPositionControls;
