import { getCurvePoints, updateCurveFromAddPoint, updateCurveFromDeletePoint } from '../scripts/curve';
import { RADIUS_POINT_TYPE } from '../scripts/dataPoint';
import DataPointCurveEditor from '../templates/DataPointCurveEditor';

import { updateSelectedPoint, type PointUpdaterFunctions, type SelectedPoint } from '../scripts/point';
import type { DataPoint } from '../scripts/dataPoint';
import type { Curve } from '../scripts/curve';
import type { LutPoint } from '../scripts/lut';
import Button from '../templates/Button';

import '../styles/DataControls.css';

/** component defines controls for the data associated with each point, with a data curve editor */
const DataControls = ({
    radiusPoints,
    curves,
    radiusLuts,
    selectedPoint,
    selectedCurveId,
    onUpdateState,
}: {
    /** a record of all existing radius data points */
    radiusPoints: Map<string, DataPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** a LUT for each radius data curve */
    radiusLuts: Map<string, LutPoint<number>[]>,
    /** point currently selected, or null if none selected */
    selectedPoint: SelectedPoint|null,
    /** ID of curve currently selected */
    selectedCurveId: string,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // get curve of data points of selected point
    const curvePoints = getCurvePoints(radiusPoints, curves, selectedCurveId);
    if (curvePoints === undefined) { return <></>; }

    // get index of selected point on curve points, if it exists
    const selectedPointIndex = curvePoints.findIndex(({ id }) => id === selectedPoint?.id);

    // find corresponding LUT for selected curve, using an empty LUT if doesn't exist yet
    const radiusLut = radiusLuts.get(selectedCurveId) ?? [];

    /**
     * function handles updating which point currently selected
     * @param newSelectedPoint new point to select
     */
    const handleUpdateSelected = (newSelectedPoint: SelectedPoint) => {
        onUpdateState(updateSelectedPoint(newSelectedPoint));
    }

    /**
     * if defiend, function handles adding new point either before or after selected point
     * @param isAfter whether new point added before or after given point
     */
    const handleAddPoint = selectedPointIndex !== -1
        ? (isAfter: boolean) => {
            onUpdateState(updateCurveFromAddPoint(RADIUS_POINT_TYPE,
                radiusPoints, curves, selectedPoint!.id, isAfter));
        }
        : undefined;

    /**
     * if defined, function handles deleted point currently selected
     */
    const handleDeletePoint = selectedPointIndex !== -1
        ? () => {
            onUpdateState(updateCurveFromDeletePoint(RADIUS_POINT_TYPE,
                radiusPoints, curves, selectedPoint!.id));
        }
        : undefined;

    // find IDs of neighboring points, if specific point selected
    const { beforeSelectedPoint, afterSelectedPoint } = selectedPointIndex !== -1
        ? {
            beforeSelectedPoint: selectedPointIndex-1 >= 0
                ? { id: curvePoints[selectedPointIndex-1]!.id, type: 'anchor' as const }
                : undefined,
            afterSelectedPoint: selectedPointIndex+1 < curvePoints.length
                ? { id: curvePoints[selectedPointIndex+1]!.id, type: 'anchor' as const }
                : undefined,
        }
        : { };

    return (
        <div className="data-controls-container">
            <DataPointCurveEditor
                dataPointType={RADIUS_POINT_TYPE}
                dataPoints={radiusPoints}
                curves={curves}
                curve={curvePoints}
                dataLut={radiusLut}
                selectedPoint={selectedPoint}
                onUpdateState={onUpdateState}
            />
            <Button className="traverse-before-button"  title="<"
                disabled={beforeSelectedPoint === undefined}
                onClick={() => { handleUpdateSelected(beforeSelectedPoint!); }}
            />
            <Button className="traverse-after-button"   title=">"
                disabled={afterSelectedPoint === undefined}
                onClick={() => { handleUpdateSelected(afterSelectedPoint!); }}
            />
            <Button className="add-point-before-button" title="+ Add Point Before"
                disabled={handleAddPoint === undefined}
                onClick={() => { handleAddPoint!(false); }}
            />
            <Button className="add-point-after-button" title="Add Point After +" 
                disabled={handleAddPoint === undefined}
                onClick={() => { handleAddPoint!(true); }}
            />
            <Button className="delete-point-button" title="- Delete Point"
                disabled={handleDeletePoint === undefined}
                onClick={() => { handleDeletePoint!(); }}
            />
        </div>
    );
}

export default DataControls;
