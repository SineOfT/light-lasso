import { getBeforeControlPos, calculateNewControlPos, getAfterControlPos } from '../scripts/controlPos';
import { updateSelectedPoint } from '../scripts/point';
import { RADIUS_POINT_TYPE } from '../scripts/dataPoint';
import { getCurvePoints, updateCurveFromAddPoint, updateCurveFromDeletePoint, updateCurveFromUpdatePoint } from '../scripts/curve';
import NumberInput from '../templates/NumberInput';
import DataPointCurveEditor from '../templates/DataPointCurveEditor';

import type { PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
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

    // get selected point on curve points, if it exists
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

    // find values and functions for number inputs that update position of selected data point on curve 
    const {
        selectedPointValue, handleUpdateValue,
        selectedPointT, handleUpdateT,
    } = selectedPointIndex !== -1
        ? (() => {
            // find selected point
            const selectedDataPoint = curvePoints[selectedPointIndex]!;

            // if anchor selected, update value directly
            if (selectedPoint!.type === 'anchor') {
                return {
                    selectedPointValue: selectedDataPoint.point.value,
                    handleUpdateValue: (newValue: number) => {
                        onUpdateState(updateCurveFromUpdatePoint(RADIUS_POINT_TYPE,
                            radiusPoints, curves, selectedDataPoint.id, { value: newValue }));
                    },
                    selectedPointT: selectedDataPoint.t ?? undefined,
                    handleUpdateT: selectedDataPoint.t !== null
                        ? (newT: number) => {
                            onUpdateState(updateCurveFromUpdatePoint(RADIUS_POINT_TYPE,
                                radiusPoints, curves, selectedDataPoint.id, { }, newT));
                        }
                        : undefined,
                }
            }

            // if control selected, find control position and update by calculating required change 
            if (selectedPoint!.type === 'beforeControl' || selectedPoint!.type === 'afterControl') {
                const isAfter = selectedPoint!.type === 'afterControl';
                const anchorPos = { x: selectedDataPoint.t ?? 0, y: selectedDataPoint.point.value };
                const controlPos = isAfter
                    ? getAfterControlPos( anchorPos, selectedDataPoint.point.controlPos)
                    : getBeforeControlPos(anchorPos, selectedDataPoint.point.controlPos);

                return {
                    selectedPointValue: controlPos.y,
                    handleUpdateValue: (newValue: number) => {
                        const newControlPos = calculateNewControlPos(
                            anchorPos, selectedDataPoint.point.controlPos, { y: newValue }, isAfter);
                        onUpdateState(updateCurveFromUpdatePoint(RADIUS_POINT_TYPE,
                                radiusPoints, curves, selectedDataPoint.id, { controlPos: newControlPos }));
                    },
                    selectedPointT: controlPos.x,
                    handleUpdateT: (newT: number) => {
                        const newControlPos = calculateNewControlPos(
                            anchorPos, selectedDataPoint.point.controlPos, { x: newT }, isAfter);
                        onUpdateState(updateCurveFromUpdatePoint(RADIUS_POINT_TYPE,
                                radiusPoints, curves, selectedDataPoint.id, { controlPos: newControlPos }));
                    },
                }
            }

            return selectedPoint!.type satisfies never;
        })()
        : { };

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
            <div className="data-point-pos-input flex-row flex-end">
                <NumberInput id="data-point-t" title="T" disabled={selectedPointT === undefined}
                    value={selectedPointT ?? 0}
                    onUpdateValue={(newT) => { handleUpdateT!(newT); }}
                />
                <NumberInput id="data-point-value" title="Value" disabled={selectedPointValue === undefined}
                    value={selectedPointValue ?? 0}
                    onUpdateValue={(newValue) => { handleUpdateValue!(newValue); }}
                />
            </div>
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
