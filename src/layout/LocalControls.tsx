import { updateCurveFromAdd } from '../scripts/curve';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointTraversalControls from './SelectedPointTraversalControls';
import SelectedPointAddDeleteControls from './SelectedPointAddDeleteControls';
import SelectedPointPositionControls from './SelectedPointPositionControls';
import SelectedPointRadiusControls from './SelectedPointRadiusControls';

import type { point, selectedPoint } from '../scripts/point';
import type { curve } from '../scripts/curve';
import type { pointData } from '../scripts/pointData';
import type { stateUpdaterFunctions } from '../App';

/** component defines controls to adjust local points and curves */
const LocalControls = ({
    points,
    radiusDatas,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** a record of all existing points */
    points: Map<string, point>,
    /** a record of all existing radius curves */
    radiusDatas: Map<string, pointData>,
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: selectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: stateUpdaterFunctions|undefined) => void,
}) => {
    /**
     * function handles adding new curve, with default point at top left corner
     */
    const handleAddCurve = () => {
        onUpdateState(updateCurveFromAdd(curves));
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
                    points={points}
                    curves={curves}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
                <SelectedPointPositionControls
                    points={points}
                    selectedPoint={selectedPoint}
                    onUpdateState={onUpdateState}
                />
                <SelectedPointRadiusControls
                    radiusDatas={radiusDatas}
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