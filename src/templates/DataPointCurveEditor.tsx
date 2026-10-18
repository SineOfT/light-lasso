import { useMemo } from 'react';
import { convertExponentialTToValue, convertExponentialValueToT } from '../scripts/util';
import { updateSelectedPoint } from '../scripts/point';
import { updateCurveFromUpdatePoint } from '../scripts/curve';
import { getAfterControlPos, getBeforeControlPos } from '../scripts/controlPos';
import BezierCurveEditor, { BG_INDICATOR_COLOR, CURVE_COLOR } from './BezierCurveEditor';

import type { pos } from '../scripts/pos';
import type { PartialPoint, PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { DataPoint, DataPointType } from '../scripts/dataPoint';
import type { Curve } from '../scripts/curve';
import type { DraggablePoint } from './BezierCurveEditor';
import type { LutPoint } from '../scripts/lut';

/** the radius of the data point on the curve editor */
const DATA_POINT_RADIUS = 10;

/** component defines curve editor for data points along curve */
const DataPointCurveEditor = ({
    dataPointType,
    dataPoints,
    curves,
    curve,
    dataLut,
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
    /** LUT for the selected data curve */
    dataLut: LutPoint<number>[],
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
                    x: t === null // if positioned, no flexibility; otherwise, betewen bounds of t
                        ? { min: acc.positionedDataCount, max: acc.positionedDataCount }
                        : {
                            min: acc.positionedDataCount +      Number.EPSILON,
                            max: acc.positionedDataCount + (1 - Number.EPSILON),
                        },
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

    /**
     * function draws positioned point indicators and curve onto background of editor
     * @param canvas a reference to the canvas to draw on
     * @param ctx the drawing context to use to draw on
     */
    const drawBg = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
        // save context settings so don't affect later drawings
        ctx.save();

        // draw vertical indicators behind each data point that is positioned
        ctx.lineWidth = DATA_POINT_RADIUS * 2; // full width of point
        ctx.strokeStyle = BG_INDICATOR_COLOR;

        for (const draggablePoint of draggablePoints) {
            // only care about anchor points
            if (draggablePoint.type !== 'anchor') { continue; }

            // if constricted to certain x position, is positioned so add indicator line
            const { bounds } = draggablePoint;
            if (bounds?.x?.min !== undefined && bounds?.x?.min === bounds?.x?.max) {
                const xPx = convertPosToCanvasPx(canvas, { x: bounds.x.min, y: 0 }).x; // don't care about y
                ctx.beginPath();
                ctx.moveTo(xPx, 0);
                ctx.lineTo(xPx, canvas.height);
                ctx.stroke();
            }
        }

        // draw line based on values in LUT
        ctx.lineWidth = DATA_POINT_RADIUS / 3; // pass through center third of each point
        ctx.strokeStyle = CURVE_COLOR;
        ctx.beginPath();
        for (const { value, t } of dataLut) {
            const lutPos = { x: t, y: value };
            const lutPosPx = convertPosToCanvasPx(canvas, lutPos);
            ctx.lineTo(lutPosPx.x, lutPosPx.y);
        }
        ctx.stroke();

        // restore back to initial context settings
        ctx.restore();
    }

    return (
        <BezierCurveEditor
            draggablePoints={draggablePoints}
            pointRadius={DATA_POINT_RADIUS}
            selectedPoint={selectedPoint}
            onUpdateSelected={handleUpdateSelected}
            onUpdatePoint={handleUpdatePoint}
            convertPosToCanvasPx={convertPosToCanvasPx}
            convertCanvasPxToPos={convertCanvasPxToPos}
            drawBg={drawBg}
        />
    );
}

export default DataPointCurveEditor;
