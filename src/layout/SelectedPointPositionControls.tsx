import { posSub, posMul, posDiv, posLength } from '../scripts/pos';
import { POS_POINT_TYPE } from '../scripts/posPoint';
import { getAfterControlPos, getBeforeControlPos } from '../scripts/controlPos';
import { updateCurveFromUpdatePoint } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import PosInput from '../templates/PosInput';

import type { pos } from '../scripts/pos';
import type { PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { Curve } from '../scripts/curve';

/** component defines controls to change position of selected point */
const SelectedPointPositionControls = ({
    posPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing position points */
    posPoints: Map<string, PosPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the currently selected point */
    selectedPoint: SelectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // find position of selected point, returning empty if none
    const posPoint = posPoints.get(selectedPoint.id);
    if (posPoint === undefined) { return <></>; }
    const { controlPos, anchorPos } = posPoint;
    const selectedPos =
        selectedPoint.type === 'anchor'        ? anchorPos
      : selectedPoint.type === 'beforeControl' ? getBeforeControlPos(anchorPos, controlPos)
      : selectedPoint.type === 'afterControl'  ? getAfterControlPos(anchorPos, controlPos)
      : selectedPoint.type satisfies never;

    /**
     * function handles updating position of selected point
     * @param changedPos values in pos that have changed; unlisted keys are unchanged
     */
    const handleUpdateSelectedPos = (changedPos: Partial<pos>) => {
        // determine new pos by applying changing to current selected point
        const newPos: pos = { ...selectedPos, ...changedPos };

        // determine new point
        const newPoint: Partial<PosPoint> = (() => {
            // if anchor position updated, apply new position to anchor
            if (selectedPoint.type === 'anchor') {
                return { anchorPos: newPos }
            }

            // calculate new control position relative to anchor
            const newControlPos = posSub(newPos, anchorPos);
            const length = posLength(newControlPos);
            const direction = posDiv(newControlPos, length);

            // if before control position updated, apply new position to before control
            if (selectedPoint.type === 'beforeControl') {
                return { controlPos: {
                    direction: posMul(direction, -1), // invert direction
                    beforeLength: length,
                    afterLength: controlPos.afterLength,
                } };
            }

            // if after control position updated, apply new position to after control
            if (selectedPoint.type === 'afterControl') {
                return { controlPos: {
                    direction,
                    beforeLength: controlPos.beforeLength,
                    afterLength: length,
                } };
            }

            return selectedPoint.type satisfies never;
        })();

        // update point based on new position
        onUpdateState(updateCurveFromUpdatePoint(POS_POINT_TYPE,
            posPoints, curves, selectedPoint.id, newPoint));
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
