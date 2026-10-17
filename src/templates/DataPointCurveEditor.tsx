import { useMemo } from 'react';
import { convertExponentialTToValue, convertExponentialValueToT } from '../scripts/util';
import { updateSelectedPoint } from '../scripts/point';
import { updateCurveFromUpdatePoint } from '../scripts/curve';
import { getAfterControlPos, getBeforeControlPos } from '../scripts/controlPos';
import BezierCurveEditor from './BezierCurveEditor';

import type { pos } from '../scripts/pos';
import type { PartialPoint, PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { DataPoint, DataPointType } from '../scripts/dataPoint';
import type { Curve } from '../scripts/curve';
import type { DraggablePoint } from './BezierCurveEditor';

/** the radius of the data point on the curve editor */
const DATA_POINT_RADIUS = 10;

/** component defines curve editor for data points along curve */
const DataPointCurveEditor = ({
    dataPointType,
    dataPoints,
    curves,
    curve,
    selectedPoint,
    onUpdateState,
}: {
    /** the type of data point to edit */
    dataPointType: DataPointType,
    /** a record of all data associated with existing points */
    dataPoints: Map<string, DataPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the curve on which to edit the data for */
    curve: Curve,
    /** point currently selected, or null if none selected */
    selectedPoint: SelectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // calculate positions of data in curve
    const { draggablePoints, positionedDataCount } = useMemo(() => (
        curve.reduce<{
            draggablePoints: DraggablePoint[],
            positionedDataCount: number,
        }>((acc, { id, t }) => {
            // get data at point, skipping if no associated data
            const dataPoint = dataPoints.get(id);
            if (dataPoint === undefined) { return acc; }
            
            // if this point positioned, increment counter
            if (t === null) {
                acc.positionedDataCount++;
            }

            // see if this point selected
            const isSelected = id === selectedPoint?.id;

            // find position of anchor point
            const anchorPos = {
                x: acc.positionedDataCount + (t ?? 0),
                y: dataPoint.value,
            };

            // if selected, add control points to draggable points
            if (isSelected) {
                const beforeControlPos = getBeforeControlPos(anchorPos, dataPoint.controlPos);
                const afterControlPos  = getAfterControlPos( anchorPos, dataPoint.controlPos);
                acc.draggablePoints.push({
                    id,
                    pos: beforeControlPos,
                    type: 'beforeControl',
                    isSelected: selectedPoint.type === 'beforeControl',
                    anchorPos,
                    oppositeControlPos: afterControlPos,
                });
                acc.draggablePoints.push({
                    id,
                    pos: afterControlPos,
                    type: 'afterControl',
                    isSelected: selectedPoint.type === 'afterControl',
                    anchorPos,
                    oppositeControlPos: beforeControlPos,
                });
            }

            // add anchor point to draggable points
            acc.draggablePoints.push({
                id,
                pos: anchorPos,
                type: 'anchor',
                isSelected: isSelected && selectedPoint.type === 'anchor',
                bounds: {
                    x: t === undefined // if positioned, no flexibility; otherwise, betewen bounds of t
                        ? { min: acc.positionedDataCount, max: acc.positionedDataCount }
                        : { min: acc.positionedDataCount, max: acc.positionedDataCount+1 },
                    y: { min: 0, max: dataPointType.upperValue }, // keep value within bounds
                },
            });

            return acc;
        },
        {
            draggablePoints: [],
            positionedDataCount: 0,
        })
    ), [dataPoints, curve, selectedPoint]);

    /**
     * function updates which point is currently selected
     * @param newSelectedPoint the newly selected point, or null if none selected
     */
    const handleUpdateSelected = (newSelectedPoint: SelectedPoint|null) => {
        onUpdateState(updateSelectedPoint(newSelectedPoint));
    }

    /**
     * function updates value of given point
     * @param pointId ID of point to update
     * @param changedPoint which values of point to update, unset keys are left unchanged
     */
    const handleUpdatePoint = (pointId: string, changedPoint: PartialPoint<PosPoint>) => {
        const changedDataPoint: PartialPoint<DataPoint> = { };
        if (changedPoint.controlPos !== undefined) {
            changedDataPoint.controlPos = changedPoint.controlPos;
        }
        if (changedPoint.anchorPos !== undefined) {
            changedDataPoint.value = changedPoint.anchorPos.y;
        }
        const newT = changedPoint.anchorPos !== undefined
            ? changedPoint.anchorPos.x % 1
            : undefined;
        onUpdateState(updateCurveFromUpdatePoint(dataPointType,
            dataPoints, curves, pointId, changedDataPoint, newT));
    }

    /** function maps a local data point position into an absolute position on a canvas */
    const convertPosToCanvasPx = (canvas: HTMLCanvasElement, pos: pos): pos => ({
        x: pos.x / (positionedDataCount+1) * canvas.width,
        y: (1 - convertExponentialValueToT(pos.y, dataPointType.upperValue)) * canvas.height,
    })

    /** function maps an absolute position on a canvas into a local data point position */
    const convertCanvasPxToPos = (canvas: HTMLCanvasElement, px: pos): pos => ({
        x: px.x / canvas.width * (positionedDataCount+1),
        y: convertExponentialTToValue(1 - (px.y / canvas.height), dataPointType.upperValue),
    })

    return (
        <BezierCurveEditor
            draggablePoints={draggablePoints}
            pointRadius={DATA_POINT_RADIUS}
            selectedPoint={selectedPoint}
            onUpdateSelected={handleUpdateSelected}
            onUpdatePoint={handleUpdatePoint}
            convertPosToCanvasPx={convertPosToCanvasPx}
            convertCanvasPxToPos={convertCanvasPxToPos}
            drawBg={() => { }}
        />
    );
}

export default DataPointCurveEditor;
