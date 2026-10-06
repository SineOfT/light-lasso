import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointControls from './SelectedPointControls';

import type { curve } from '../scripts/curves';

/**
 * component defines controls to adjust local points and curves
 */
function LocalControls({
    curves,
    selectedPointId,
    onAddPoint,
    onDeletePoint,
    onAddCurve,
    onDeleteCurve,
    onUpdateSelected,
}: {
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** the ID of the currently selected point, or null if none selected */
    selectedPointId: string|null,
    /** function adds a new point before or after a given point */
    onAddPoint: (pointId: string, isAfter: boolean) => void,
    /** function deletes point */
    onDeletePoint: (pointId: string) => void,
    /** function adds new curve with one default point */
    onAddCurve: () => void,
    /** function deletes given curve */
    onDeleteCurve: (curveId: string) => void, 
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: string|null) => void,
}) {
    return (
        <div className="p-m">
            {selectedPointId && 
                <SelectedPointControls
                    curves={curves}
                    selectedPointId={selectedPointId!}
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