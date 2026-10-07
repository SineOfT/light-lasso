import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointControls from './SelectedPointControls';

import type { pos } from '../scripts/pos';
import type { curve, selectedPointData } from '../scripts/curves';

/** component defines controls to adjust local points and curves */
const LocalControls = ({
    points,
    curves,
    selectedPointData,
    onUpdatePoint,
    onAddPoint,
    onDeletePoint,
    onAddCurve,
    onDeleteCurve,
    onUpdateSelected,
}: {
    /** a record of all existing points */
    points: Record<string, pos>,
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** the currently selected point, or null if none selected */
    selectedPointData: selectedPointData|null,
    /** function updates position of given point */
    onUpdatePoint: (pointId: string, newPos: pos) => void,
    /** function adds a new point before or after a given point */
    onAddPoint: (pointId: string, isAfter: boolean) => void,
    /** function deletes point */
    onDeletePoint: (pointId: string) => void,
    /** function adds new curve with one default point */
    onAddCurve: () => void,
    /** function deletes given curve */
    onDeleteCurve: (curveId: string) => void, 
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: selectedPointData|null) => void,
}) => {
    return (
        <div className="p-m">
            {selectedPointData && 
                <SelectedPointControls
                    points={points}
                    curves={curves}
                    selectedPointData={selectedPointData!}
                    onUpdatePoint={onUpdatePoint}
                    onAddPoint={onAddPoint}
                    onDeletePoint={onDeletePoint}
                    onDeleteCurve={onDeleteCurve}
                    onUpdateSelected={onUpdateSelected}
                />
            }
            <InputSet title="Add Curve">
                <Button title="+ Add Curve"
                    onClick={() => { onAddCurve(); }}
                />
            </InputSet>
        </div>
    );
}

export default LocalControls;