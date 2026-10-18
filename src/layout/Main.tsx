import { useMemo } from 'react';
import { getAfterControlPos, getBeforeControlPos } from '../scripts/controlPos';
import { getEntirePointLocation, updateCurveFromUpdatePoint } from '../scripts/curve';
import { POS_POINT_TYPE } from '../scripts/posPoint';
import BezierCurveEditor from '../templates/BezierCurveEditor';

import type { pos } from '../scripts/pos';
import type { PartialPoint, PointUpdaterFunctions, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';
import type { Curve } from '../scripts/curve';
import type { DraggablePoint } from '../templates/BezierCurveEditor';

/** the radius of the points representing positions on the editor */
export const POS_POINT_RADIUS = 10;

/** component defines main canvas, which draws the lasso and exposes touch controls */
const Main = ({
    resolution,
    posPoints,
    curves,
    selectedPoint,
    onUpdateState,
}: {
    /** the dimensions of the editable canvas, as an (x,y) position */
    resolution: pos,
    /** a record of all existing points */
    posPoints: Map<string, PosPoint>,
    /** a record of all existing curves */
    curves: Map<string, Curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: SelectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: PointUpdaterFunctions|undefined) => void,
}) => {
    // calculate positions of data in curve
    const draggablePoints = useMemo(() => (
        Array.from(curves.values()).flatMap((curve) =>
            curve.reduce<DraggablePoint[]>((acc, { id }) => {
                // get data at point, skipping if no associated data
                const posPoint = posPoints.get(id);
                if (posPoint === undefined) { return acc; }

                // see if this point selected
                const isSelected = id === selectedPoint?.id;

                // if selected, add control points to draggable points
                if (isSelected) {
                    const beforeControlPos = getBeforeControlPos(posPoint.anchorPos, posPoint.controlPos);
                    const afterControlPos  = getAfterControlPos( posPoint.anchorPos, posPoint.controlPos);
                    acc.push({
                        id,
                        pos: beforeControlPos,
                        type: 'beforeControl',
                        isSelected: selectedPoint.type === 'beforeControl',
                        anchorPos: posPoint.anchorPos,
                        oppositeControlPos: afterControlPos,
                    });
                    acc.push({
                        id,
                        pos: afterControlPos,
                        type: 'afterControl',
                        isSelected: selectedPoint.type === 'afterControl',
                        anchorPos: posPoint.anchorPos,
                        oppositeControlPos: beforeControlPos,
                    });
                }

                // add anchor point to draggable points
                acc.push({
                    id,
                    pos: posPoint.anchorPos,
                    type: 'anchor',
                    isSelected: isSelected && selectedPoint.type === 'anchor',
                    bounds: undefined,
                });

                return acc;
            },
            [])
        )
    ), [posPoints, curves, selectedPoint]);

    /**
     * function updates which point is currently selected
     * @param newSelectedPoint the newly selected point, or null if none selected
     */
    const handleUpdateSelected = (newSelectedPoint: SelectedPoint|null) => {
        // if deselected, deselect both point and curve
        if (newSelectedPoint === null) {
            onUpdateState({
                newSelectedPoint: null,
                newSelectedCurveId: null,
            });
        
        // if selected, also select curve point is on
        } else {
            const pointLocation = getEntirePointLocation(curves, newSelectedPoint.id);
            if (pointLocation === undefined) { return; }
            const { curveId } = pointLocation;
            onUpdateState({
                newSelectedPoint,
                newSelectedCurveId: curveId,
            });
        }
    }

    /**
     * function updates value of given point
     * @param pointId ID of point to update
     * @param changedPoint which values of point to update, unset keys are left unchanged
     */
    const handleUpdatePoint = (pointId: string, changedPoint: PartialPoint<PosPoint>) => {
        onUpdateState(updateCurveFromUpdatePoint(POS_POINT_TYPE,
            posPoints, curves, pointId, changedPoint));
    }

    /** location point position and absolute canvas position map one-to-one */
    const convertPosCanvasPx = (_canvasSize: pos, pos: pos): pos => pos;

    return (
        <main>
            <BezierCurveEditor
                draggablePoints={draggablePoints}
                pointRadius={POS_POINT_RADIUS}
                selectedPoint={selectedPoint}
                onUpdateSelected={handleUpdateSelected}
                onUpdatePoint={handleUpdatePoint}
                convertPosToCanvasPx={convertPosCanvasPx}
                convertCanvasPxToPos={convertPosCanvasPx}
                drawBg={() => { }}
            />
        </main>
    );
}

export default Main;
