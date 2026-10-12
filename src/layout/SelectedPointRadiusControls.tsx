import { RADIUS_POINT_TYPE } from '../scripts/dataPoint';
import TogglableInputSet from '../templates/TogglableInputSet';
import SliderNumberInput from '../templates/SliderNumberInput';

import { updatePointFromUpdate, type pointUpdaterFunctions, type selectedPoint } from '../scripts/point';
import { updateCurveFromAddToExisting, updateCurveFromDeletePoint, type curve } from '../scripts/curve';
import type { dataPoint } from '../scripts/dataPoint';

/** component defines controls to change radius of selected point */
const SelectedPointRadiusControls = ({
    radiusPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** a record of all existing radius curves */
    radiusPoints: Map<string, dataPoint>,
    /** the currently selected point */
    selectedPoint: selectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: pointUpdaterFunctions|undefined) => void,
}) => {
    // find radius of selected point, if any
    const radiusPoint = radiusPoints.get(selectedPoint.id);

    /** 
     * function handles updating whether there is a radius associated with the selected point
     * @param isToggled whether the radius has just been toggled or not
     */
    const handleToggleRadius = (isToggled: boolean) => {
        if (isToggled) {
            onUpdateState(updateCurveFromAddToExisting(RADIUS_POINT_TYPE,
                radiusPoints, curves, selectedPoint.id));
        } else {
            onUpdateState(updateCurveFromDeletePoint(RADIUS_POINT_TYPE,
                selectedPoint.id));
        }
    }

    /**
     * function handles updating value of radius at selected point
     * @param newRadius new radius at selected point
     */
    const handleUpdateRadius = (newRadius: number) => {
        const changedPoint: Partial<dataPoint> = { value: newRadius };
        onUpdateState(updatePointFromUpdate(RADIUS_POINT_TYPE,
            radiusPoints, selectedPoint.id, changedPoint));
    }

    return (
        <TogglableInputSet title="Radius" id="radius" isToggled={radiusPoint !== undefined}
            onUpdateToggled={handleToggleRadius}
        >
            {radiusPoint !== undefined && (
                <SliderNumberInput id="radius" value={radiusPoint.value}
                    onUpdateValue={handleUpdateRadius}
                />
            )}
        </TogglableInputSet>
    );
}

export default SelectedPointRadiusControls;