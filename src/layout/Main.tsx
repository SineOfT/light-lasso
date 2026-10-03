import { useState, useEffect, useRef } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { getInvPos, posAdd, posSub, posWithin } from '../scripts/pos';
import { isPointControl, getPointLocationOnCurve, getPointOnCurve } from '../scripts/curves';

import type { MouseEvent } from 'react';
import type { pos } from '../scripts/pos';
import type { curve } from '../scripts/curves';
import type { lut } from '../scripts/lut';

/**
 * component defines main canvas, which draws the lasso and exposes touch controls
 */
const Main = ({
    resolution,
    points,
    curves,
    luts,
    selectedPointId,
    onUpdatePoint,
    onUpdateSelected,
}: {
    /** the dimensions of the editable canvas, as an (x,y) position */
    resolution: pos,
    /** a record of all existing points */
    points: Record<string, pos>,
    /** a record of all existing curves */
    curves: Record<string, curve>,
    /** a record of all existing LUTs */
    luts: Record<string, lut>,
    /** the ID of the currently selected point, or null if none selected */
    selectedPointId: string|null,
    /** function updates the given point to the given position */
    onUpdatePoint: (pointId: string, newPoint: pos) => void,
    /** function updates the current selected point */
    onUpdateSelected: (pointId: string|null) => void,
}) => {
    // the ID of the control point currently being dragged
    const [dragControlPointId, setDragControlPointId] = useState<string|null>(null);
    // the ID of the anchor point currently being dragged
    const [dragAnchorPointId, setDragAnchorPointId] = useState<string|null>(null);
    // the offset at which the dragged point was initially located
    const [dragOffset, setDragOffset] = useState<pos|null>(null);
    // whether the point being dragged is the anchor point, control point, or inverse of control point
    const [dragPointType, setDragPointType] = useState<'anchor'|'control'|'invControl'>('anchor');
    // a DOM ref to the canvas which the lasso is drawn on
    const canvasRef = useRef<HTMLCanvasElement|null>(null);
    // a ref to the ID of the animation loop, used to stop the animation loop
    const drawLoopIdRef = useRef<number|null>(null);

    // effect updates canvas dimensions when resolution changes
    useEffect(() => {
        if (canvasRef.current == null) { return; }
        const canvas = canvasRef.current;
        canvas.width = resolution.x;
        canvas.height = resolution.y;
    }, [resolution]);

    // effect draws canvas every frame
    useEffect(() => {
        // get canvas and context from DOM ref
        if (canvasRef.current == null) { return; }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx == null) { return; }

        // define draw loop
        const drawLoop = () => {
            draw(canvas, ctx);
            if (drawLoopIdRef.current != null) {
                drawLoopIdRef.current = window.requestAnimationFrame(drawLoop);
            }
        }

        // commence draw loop
        drawLoopIdRef.current = window.requestAnimationFrame(drawLoop);

        // return cleanup function that terminates draw loop
        return () => {
            if (drawLoopIdRef.current != null) {
                window.cancelAnimationFrame(drawLoopIdRef.current);
                drawLoopIdRef.current = null;
            }
        }

    }, [points, curves, selectedPointId]);

    // effect stops drag when mouse lifted
    useEffect(() => {
        // if not dragging, don't add event listener
        if (dragOffset == null) { return; }

        // stop when mouse lifted
        window.addEventListener("mouseup", handleDragEnd);

        // return cleanup function that removes event listener
        return () => {
            window.removeEventListener("mouseup", handleDragEnd);
        }

    }, [dragOffset]);

    /**
     * function draws the points and curves on the canvas, clearing previous
     */
    const draw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
        // determine which points need to be drawn based on selection
        // filter out control points
        const drawnPoints = Object.entries(points)
            .filter((_, i) => !isPointControl(i))
            .map(([pointId, point]) => ({ point, selected: pointId === selectedPointId }));
        // draw line between control point and inverse control point
        const controlLines = [];
        // if point selected, change color and include control points
        if (selectedPointId != null) {
            const pointLocation = getPointLocationOnCurve(curves, selectedPointId);
            if (pointLocation != undefined) {
                const { curve, controlPointIndex, anchorPointIndex } = pointLocation;
                const controlPoint = getPointOnCurve(points, curve, controlPointIndex);
                const anchorPoint = getPointOnCurve(points, curve, anchorPointIndex);
                const invControlPoint = getInvPos(controlPoint, anchorPoint);
                if (anchorPointIndex > 1) { // if first anchor, no control point before
                    drawnPoints.push({ point: controlPoint, selected: false });
                    controlLines.push({ anchorPoint, controlPoint });
                }
                if (anchorPointIndex < curve.length-1) { // if last anchor, no control point after
                    drawnPoints.push({ point: invControlPoint, selected: false });
                    controlLines.push({ anchorPoint, controlPoint: invControlPoint });
                }
            }
        }

        // clear previous drawing
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw each curve
        ctx.fillStyle = '#AAA';
        Object.values(luts).forEach((lut) => {
            lut.forEach((section) => {
                section.forEach((pos) => {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2, false);
                    ctx.fill();
                });
            });
        });

        // draw each line between control points
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#DDD';
        controlLines.forEach(({ anchorPoint, controlPoint }) => {
            ctx.beginPath();
            ctx.moveTo(anchorPoint.x, anchorPoint.y);
            ctx.lineTo(controlPoint.x, controlPoint.y);
            ctx.stroke();
        });

        // draw each point
        drawnPoints.forEach(({ point, selected }) => {
            ctx.fillStyle = selected ? '#F00' : '#DDD';
            ctx.beginPath();
            ctx.arc(point.x, point.y, SELECTABLE_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();
        });
    }

    /**
     * function handles beginning dragging a point by recording starting position offset
     * @param e event provided by the event listener
     */
    const handleDragStart = (e: MouseEvent<HTMLCanvasElement>) => {
        // find points that can be dragged
        const draggablePoints = Object.values(curves).flatMap((curve) =>
            curve.flatMap((pointId, pointIndex) => {
                if (isPointControl(pointIndex)) {
                    const controlPoint = getPointOnCurve(points, curve, pointIndex);
                    const anchorPoint = getPointOnCurve(points, curve, pointIndex+1);
                    const invControlPoint = getInvPos(controlPoint, anchorPoint);
                    return [
                        { pointId, point: controlPoint, isInverse: false },
                        { pointId, point: invControlPoint, isInverse: true }
                    ];
                } else {
                    const point = getPointOnCurve(points, curve, pointIndex);
                    return [{ pointId, point, isInverse: false }];
                }
            })
        );

        // find points within mouse position
        const mousePos = { x: e.clientX, y: e.clientY };
        const clickedPoints = draggablePoints.filter(({ point }) => posWithin(point, mousePos, SELECTABLE_RADIUS));
        
        // if no point clicked, deselect current
        if (clickedPoints.length === 0) {
            onUpdateSelected(null);
            return;
        }

        // determine location of first clicked point, using current selected point if is one of clicked
        const { pointId: clickedPointId, point: clickedPoint, isInverse } = 
            clickedPoints.find(({ pointId }) => pointId === selectedPointId) ?? clickedPoints[0]!;
        const pointLocation = getPointLocationOnCurve(curves, clickedPointId);
        if (pointLocation == undefined) { return; }
        const { curve, isControlPoint, controlPointIndex, anchorPointIndex } = pointLocation;
        const controlPointId = curve[controlPointIndex]!;
        const anchorPointId = curve[anchorPointIndex]!;

        // set point type
        if (!isControlPoint) {
            setDragPointType('anchor');
            onUpdateSelected(clickedPointId); // if point is not control point, select
        } else if (isInverse) {
            setDragPointType('invControl');
        } else {
            setDragPointType('control');
        }

        // calculate initial drag offset to begin drag
        setDragControlPointId(controlPointId);
        setDragAnchorPointId(anchorPointId);
        setDragOffset(posSub(clickedPoint, mousePos));
    }

    /**
     * function handles ending dragging a point by removing the recorded drag offset
     */
    const handleDragEnd = () => {
        setDragControlPointId(null);
        setDragAnchorPointId(null);
        setDragOffset(null);
    }

    /**
     * function handles updating a drag by determining how far the mouse moved from the starting position
     * @param e event provided by the event listener
     */
    const handleDrag = (e: MouseEvent<HTMLCanvasElement>) => {
        // if drag not ongoing, skip
        if (dragOffset == null || dragControlPointId == null || dragAnchorPointId == null) { return; }

        // calculate new position of point
        const mousePos = { x: e.clientX, y: e.clientY };
        const pos = posAdd(mousePos, dragOffset);
        

        // if control point, set position
        if (dragPointType === 'control') {
            onUpdatePoint(dragControlPointId, pos);

        // if inverse control point, set inverse position
        } else if (dragPointType === 'invControl') {
            const dragAnchorPoint = points[dragAnchorPointId];
            if (dragAnchorPoint == undefined) { return; }
            const invPos = getInvPos(pos, dragAnchorPoint);
            onUpdatePoint(dragControlPointId, invPos);            

        // if anchor point, set position & update control position to remain relative
        } else {
            const dragControlPoint = points[dragControlPointId];
            const dragAnchorPoint = points[dragAnchorPointId];
            if (dragControlPoint == undefined || dragAnchorPoint == undefined) { return; }
            const controlPos = posAdd(posSub(pos, dragAnchorPoint), dragControlPoint);
            
            onUpdatePoint(dragAnchorPointId, pos);
            onUpdatePoint(dragControlPointId, controlPos);
        }
        
        // update dragging point to new position
        // if point not control point, keep offset from control point to anchor point
    }

    return (
        <main>
            <canvas ref={canvasRef}
                onMouseDown={handleDragStart}
                onMouseMove={handleDrag}
            ></canvas>
        </main>
    )
}

export default Main;
