import { useState, useEffect, useRef, useMemo } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { getInvPos, posAdd, posSub, posWithin } from '../scripts/pos';
import { getPoint, getPointLocation } from '../scripts/curve';

import type { MouseEvent } from 'react';
import type { pos } from '../scripts/pos';
import type { curve, selectedPointData } from '../scripts/curve';
import type { lut } from '../scripts/lut';

/**
 * interface defines data stored about point that can be dragged on screen
 */
interface draggablePoint {
    /** ID of the point */
    id: string,
    /** position of the point */
    point: pos,
    /** position of the point this point is controlling, if set */
    controlForPoint?: pos,
    /** whether or not this point is a psuedo-point that is an inverse of another point */
    isInverse: boolean,
    /** whether or not this point is currently selected */
    isSelected: boolean,
}

/**
 * component defines main canvas, which draws the lasso and exposes touch controls
 */
const Main = ({
    resolution,
    points,
    curves,
    luts,
    selectedPointData,
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
    /** the currently selected point, or null if none selected */
    selectedPointData: selectedPointData|null,
    /** function updates the given point to the given position */
    onUpdatePoint: (pointId: string, newPos: pos) => void,
    /** function updates the current selected point */
    onUpdateSelected: (pointId: selectedPointData|null) => void,
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

    // holds all points that can be dragged
    const draggablePoints = useMemo(() =>
        Object.values(curves).flatMap((curve) =>
            curve.flatMap(({ controlPointId, anchorPointId }, pointIndex) => {
                // check whether this point selected
                const selectedPointType = 
                    selectedPointData?.id === anchorPointId
                        ? 'anchor'
                  : selectedPointData?.id === controlPointId
                        ? selectedPointData.isInverse ? 'invControl' : 'control'
                  : null;
                
                // find anchor point
                const anchorPoint  = getPoint(points, anchorPointId);

                // create list to hold all draggable points at this location
                const currDraggablePoints: draggablePoint[] = [];
                
                // if some point in group selected, add control points to list of draggable points
                if (selectedPointType != null) {
                    const controlPoint = getPoint(points, controlPointId);
                    const invControlPoint = getInvPos(controlPoint, anchorPoint);
                    // if first point, no control point
                    if (pointIndex > 0) {
                        currDraggablePoints.push({
                            id: controlPointId,
                            point: controlPoint,
                            controlForPoint: anchorPoint,
                            isInverse: false,
                            isSelected: selectedPointType === 'control',
                        });
                    }
                    // if last point, no inverse control point
                    if (pointIndex < curve.length-1) {
                        currDraggablePoints.push({
                            id: controlPointId,
                            point: invControlPoint,
                            controlForPoint: anchorPoint,
                            isInverse: true,
                            isSelected: selectedPointType === 'invControl',
                        });
                    }
                }

                // add anchor point to draggable points list
                currDraggablePoints.push(
                    {
                        id: anchorPointId,
                        point: anchorPoint,
                        isInverse: false,
                        isSelected: selectedPointType === 'anchor',
                    },
                );

                // add draggable points to accumulating list
                return currDraggablePoints;
            })
        )
    , [curves, points, selectedPointData]);

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
            draw(canvas, ctx, draggablePoints);
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

    }, [draggablePoints]);

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
     * @param canvas reference to the HTML canvas in DOM
     * @param ctx 2D context for the canvas
     * @param draggablePoints list of all points that are currently draggable
     */
    const draw = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        draggablePoints: draggablePoint[]
    ) => {
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

        // draw each point
        draggablePoints.forEach(({ point, controlForPoint, isSelected }) => {
            ctx.fillStyle = isSelected ? '#F00' : '#DDD';
            ctx.beginPath();
            ctx.arc(point.x, point.y, SELECTABLE_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();

            // if control point, draw line to anchor
            if (controlForPoint != undefined) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#DDD';
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(controlForPoint.x, controlForPoint.y);
                ctx.stroke();
            }
        });
    }

    /**
     * function handles beginning dragging a point by recording starting position offset
     * @param e event provided by the event listener
     */
    const handleDragStart = (e: MouseEvent<HTMLCanvasElement>) => {
        // find points within mouse position
        const mousePos = { x: e.clientX, y: e.clientY };
        const clickedPoints = draggablePoints.filter(({ point }) => posWithin(point, mousePos, SELECTABLE_RADIUS));
        
        // if no point clicked, deselect current
        if (clickedPoints.length === 0) {
            onUpdateSelected(null);
            return;
        }

        // determine location of first clicked point
        const { id: clickedPointId, point: clickedPoint, isInverse } = clickedPoints[0]!;
        const pointLocation = getPointLocation(curves, clickedPointId);
        if (pointLocation == undefined) { return; }
        const { curve, isControlPoint, pointIndex } = pointLocation;
        const controlPointId = curve[pointIndex]!.controlPointId;
        const anchorPointId = curve[pointIndex]!.anchorPointId;

        // set point type
        if (!isControlPoint) {
            setDragPointType('anchor');
        } else if (isInverse) {
            setDragPointType('invControl');
        } else {
            setDragPointType('control');
        }
        onUpdateSelected({ id: clickedPointId, isInverse }); // select point

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
