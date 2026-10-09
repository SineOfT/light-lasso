import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import SelectedPointControls from './SelectedPointControls';

import type { pos } from '../scripts/pos';
import type { curve, selectedPointData } from '../scripts/curve';
import type { pointDataKey, pointData } from '../scripts/pointData';

/** component defines controls to adjust local points and curves */
const LocalControls = ({
    points,
    curves,
    radiusDatas,
    selectedPointData,
    onUpdatePoint,
    onAddPoint,
    onDeletePoint,
    onAddCurve,
    onDeleteCurve,
    onUpdateRadiusOnPoint,
    onAddRadiusToPoint,
    onDeleteRadiusFromPoint,
    onUpdateSelected,
}: {
    /** a record of all existing points */
    points: Record<string, pos>,
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** a record of all existing radius curves */
    radiusDatas: Map<pointDataKey, pointData>,
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
    /** function updates value of radius associated with given point */
    onUpdateRadiusOnPoint: (pointId: string, radius: number) => void,
    /** function adds radius to given point */
    onAddRadiusToPoint: (pointId: string) => void,
    /** function deletes radius from given point */
    onDeleteRadiusFromPoint: (pointId: string) => void,
    /** function updates the currently selected point */
    onUpdateSelected: (pointId: selectedPointData|null) => void,
}) => {
    return (
        <div className="p-m">
            {selectedPointData && 
                <SelectedPointControls
                    points={points}
                    curves={curves}
                    radiusDatas={radiusDatas}
                    selectedPointData={selectedPointData!}
                    onUpdatePoint={onUpdatePoint}
                    onAddPoint={onAddPoint}
                    onDeletePoint={onDeletePoint}
                    onDeleteCurve={onDeleteCurve}
                    onUpdateRadiusOnPoint={onUpdateRadiusOnPoint}
                    onAddRadiusToPoint={onAddRadiusToPoint}
                    onDeleteRadiusFromPoint={onDeleteRadiusFromPoint}
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