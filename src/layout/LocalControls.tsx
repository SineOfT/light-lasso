import { updateCurveFromAdd } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointTraversalControls from './SelectedPointTraversalControls';
import SelectedPointAddDeleteControls from './SelectedPointAddDeleteControls';
import SelectedPointPositionControls from './SelectedPointPositionControls';
import SelectedPointRadiusControls from './SelectedPointRadiusControls';

import type { pointUpdaterFunctions, selectedPoint } from '../scripts/point';
import type { posPoint } from '../scripts/posPoint';
import type { curve } from '../scripts/curve';
import type { dataPoint } from '../scripts/dataPoint';

/** component defines controls to adjust local points and curves */
const LocalControls = ({
    posPoints,
    radiusPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing points */
    posPoints: Map<string, posPoint>,
    /** a record of all existing radius curves */
    radiusPoints: Map<string, dataPoint>,
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: selectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: pointUpdaterFunctions|undefined) => void,
}) => {
    /**
     * function handles adding new curve, with default point at top left corner
     */
    const handleAddCurve = () => {
        onUpdateState(updateCurveFromAdd());
    }

    return (
        <div className="p-m">
            {selectedPoint && (<>
                <SelectedPointTraversalControls
                    curves={curves}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
                <SelectedPointAddDeleteControls
                    posPoints={posPoints}
                    curves={curves}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
                <SelectedPointPositionControls
                    posPoints={posPoints}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
                <SelectedPointRadiusControls
                    radiusPoints={radiusPoints}
                    curves={curves}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
            </>)
            }
            <InputSet title="Add Curve">
                <Button title="+ Add Curve"
                    onClick={handleAddCurve}
                />
            </InputSet>
        </div>
    );
}

export default LocalControls;