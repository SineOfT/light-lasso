import { updateCurveFromAdd } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointTraversalControls from './SelectedPointTraversalControls';
import SelectedPointAddDeleteControls from './SelectedPointAddDeleteControls';
import SelectedPointPositionControls from './SelectedPointPositionControls';
import SelectedPointRadiusControls from './SelectedPointRadiusControls';

import type { PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { Curve } from '../scripts/curve';
import type { DataPoint } from '../scripts/dataPoint';

/** component defines controls to adjust local points and curves */
const LocalControls = ({
    posPoints,
    radiusPoints,
    curves,
    selectedPoint,
    selectedCurveId,
    onUpdateState,
}: {
    /** a record of all existing points */
    posPoints: Map<string, PosPoint>,
    /** a record of all existing radius curves */
    radiusPoints: Map<string, DataPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: SelectedPoint|null,
    /** ID of curve currently selected, or null if none selected */
    selectedCurveId: string|null,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    /**
     * function handles adding new curve, with default point at top left corner
     */
    const handleAddCurve = () => {
        onUpdateState(updateCurveFromAdd());
    }

    return (
        <div className="p-m" id="local-controls">
            {selectedPoint && (<>
                {selectedCurveId && (<>
                    <SelectedPointTraversalControls
                        curves={curves}
                        selectedPoint={selectedPoint}
                        selectedCurveId={selectedCurveId}
                        onUpdateState={onUpdateState}
                    />
                    <SelectedPointAddDeleteControls
                        posPoints={posPoints}
                        curves={curves}
                        selectedPoint={selectedPoint}
                        selectedCurveId={selectedCurveId}
                        onUpdateState={onUpdateState}
                    />
                </>)}
                <SelectedPointPositionControls
                    posPoints={posPoints}
                    curves={curves}
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