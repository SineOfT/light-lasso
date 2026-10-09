import TogglableInputSet from '../templates/TogglableInputSet';
import SliderNumberInput from '../templates/SliderNumberInput';

import type { selectedPoint } from '../scripts/point';
import type { curve } from '../scripts/curve';
import { updateDataFromAddToPoint, updateDataFromDeleteFromPoint, updateDataFromUpdate, type pointData } from '../scripts/pointData';
import type { stateUpdaterFunctions } from '../App';

/** component defines controls to change radius of selected point */
const SelectedPointRadiusControls = ({
    radiusDatas,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** a record of all existing radius curves */
    radiusDatas: Map<string, pointData>,
    /** the currently selected point */
    selectedPoint: selectedPoint,
    /** function updates states based on updater function */
    onUpdateState: (data: stateUpdaterFunctions|undefined) => void,
}) => {
    // find radius of selected point, if any
    const radiusData = radiusDatas.get(selectedPoint.id);

    /** 
     * function handles updating whether there is a radius associated with the selected point
     * @param isToggled whether the radius has just been toggled or not
     */
    const handleToggleRadius = (isToggled: boolean) => {
        if (isToggled) {
            onUpdateState(updateDataFromAddToPoint(radiusDatas, selectedPoint.id));
        } else {
            onUpdateState(updateDataFromDeleteFromPoint(curves, radiusDatas, selectedPoint.id));
        }
    }

    /**
     * function handles updating value of radius at selected point
     * @param newRadius new radius at selected point
     */
    const handleUpdateRadius = (newRadius: number) => {
        onUpdateState(updateDataFromUpdate(radiusDatas, selectedPoint.id, newRadius));
    }

    return (
        <TogglableInputSet title="Radius" id="radius" isToggled={radiusData !== undefined}
            onUpdateToggled={handleToggleRadius}
        >
            {radiusData !== undefined && (
                <SliderNumberInput id="radius" value={radiusData.value}
                    onUpdateValue={handleUpdateRadius}
                />
            )}
        </TogglableInputSet>
    );
}

export default SelectedPointRadiusControls;