import { useState, useEffect, useRef, useMemo } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { getInvPos, posAdd, posSub, posWithin } from '../scripts/pos';
import { getPoint, updatePointsFromUpdate, updateSelectedPoint } from '../scripts/point';

import type { MouseEvent } from 'react';
import type { pos } from '../scripts/pos';
import type { point, pointType, selectedPoint } from '../scripts/point';
import type { curve } from '../scripts/curve';
import type { stateUpdaterFunctions } from '../App';

/**
 * interface defines data stored about point that can be dragged on screen
 */
interface draggablePoint {
    /** ID of the point */
    id: string,
    /** position of the point */
    pos: pos,
    /** position of the point this point is controlling, if set */
    controlForPoint?: pos,
    /** which type of point this position represents */
    pointType: pointType,
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
    selectedPoint,
    onUpdateState,
}: {
    /** the dimensions of the editable canvas, as an (x,y) position */
    resolution: pos,
    /** a record of all existing points */
    points: Map<string, point>,
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: selectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: stateUpdaterFunctions|undefined) => void,
}) => {
    // the offset at which the dragged point was initially located
    const [dragOffset, setDragOffset] = useState<pos|null>(null);
    // a DOM ref to the canvas which the lasso is drawn on
    const canvasRef = useRef<HTMLCanvasElement|null>(null);
    // a ref to the ID of the animation loop, used to stop the animation loop
    const drawLoopIdRef = useRef<number|null>(null);

    // holds all points that can be dragged
    const draggablePoints = useMemo(() =>
        Array.from(curves.values()).flatMap((curve) =>
            curve.flatMap((pointId, pointIndex) => {
                // check whether this point selected
                const isSelected = pointId === selectedPoint?.id;
                
                // find positions of point
                const { controlPos, anchorPos } = getPoint(points, pointId);

                // create list to hold all draggable points at this location
                const currDraggablePoints: draggablePoint[] = [];
                
                // if point selected, add control positions to list of draggable points
                if (isSelected) {
                    const invControlPos = getInvPos(controlPos, anchorPos);
                    // if first point, no control point
                    if (pointIndex > 0) {
                        currDraggablePoints.push({
                            id: pointId,
                            pos: controlPos,
                            controlForPoint: anchorPos,
                            pointType: 'control',
                            isSelected: selectedPoint.type === 'control',
                        });
                    }
                    // if last point, no inverse control point
                    if (pointIndex < curve.length-1) {
                        currDraggablePoints.push({
                            id: pointId,
                            pos: invControlPos,
                            controlForPoint: anchorPos,
                            pointType: 'invControl',
                            isSelected: selectedPoint.type === 'invControl',
                        });
                    }
                }

                // add anchor point to draggable points list
                currDraggablePoints.push({
                    id: pointId,
                    pos: anchorPos,
                    pointType: 'anchor',
                    isSelected: isSelected && selectedPoint.type === 'anchor',
                });

                // add draggable points to accumulating list
                return currDraggablePoints;
            })
        )
    , [curves, points, selectedPoint]);

    // effect updates canvas dimensions when resolution changes
    useEffect(() => {
        if (canvasRef.current === null) { return; }
        const canvas = canvasRef.current;
        canvas.width = resolution.x;
        canvas.height = resolution.y;
    }, [resolution]);

    // effect draws canvas every frame
    useEffect(() => {
        // get canvas and context from DOM ref
        if (canvasRef.current === null) { return; }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx === null) { return; }

        // define draw loop
        const drawLoop = () => {
            draw(canvas, ctx, draggablePoints);
            if (drawLoopIdRef.current !== null) {
                drawLoopIdRef.current = window.requestAnimationFrame(drawLoop);
            }
        }

        // commence draw loop
        drawLoopIdRef.current = window.requestAnimationFrame(drawLoop);

        // return cleanup function that terminates draw loop
        return () => {
            if (drawLoopIdRef.current !== null) {
                window.cancelAnimationFrame(drawLoopIdRef.current);
                drawLoopIdRef.current = null;
            }
        }

    }, [draggablePoints]);

    // effect stops drag when mouse lifted
    useEffect(() => {
        // if not dragging, don't add event listener
        if (dragOffset === null) { return; }

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

        // draw each point
        draggablePoints.forEach(({ pos, controlForPoint, isSelected }) => {
            ctx.fillStyle = isSelected ? '#F00' : '#DDD';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, SELECTABLE_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();

            // if control point, draw line to anchor
            if (controlForPoint !== undefined) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#DDD';
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
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
        const clickedPoints = draggablePoints.filter(({ pos }) => posWithin(pos, mousePos, SELECTABLE_RADIUS));
        
        // get clicked point, if no point clicked deselect current
        if (clickedPoints.length === 0) {
            onUpdateState(updateSelectedPoint(null));
            return;
        }
        const { id: clickedPointId, pos: clickedPos, pointType } = clickedPoints[0]!;

        // select point
        onUpdateState(updateSelectedPoint({ id: clickedPointId, type: pointType }));
        
        // calculate initial drag offset to begin drag
        setDragOffset(posSub(clickedPos, mousePos));
    }

    /**
     * function handles ending dragging a point by removing the recorded drag offset
     */
    const handleDragEnd = () => {
        setDragOffset(null);
    }

    /**
     * function handles updating a drag by determining how far the mouse moved from the starting position
     * @param e event provided by the event listener
     */
    const handleDrag = (e: MouseEvent<HTMLCanvasElement>) => {
        // if drag not ongoing, skip
        if (dragOffset === null || selectedPoint === null) { return; }

        // calculate new position of point
        const mousePos = { x: e.clientX, y: e.clientY };
        const newPos = posAdd(mousePos, dragOffset);
        
        // get control and anchor positions of  selected point
        const { controlPos, anchorPos } = getPoint(points, selectedPoint.id);

        // get changes made to point
        const changedPoint =
            // if control point, set control to position
            selectedPoint.type === 'control'
                ? { controlPos: newPos}

            // if inverse control point, set control to inverse position
          : selectedPoint.type === 'invControl'
                ? { controlPos: getInvPos(newPos, anchorPos) }

            // if anchor point, set anchor to position & set control position to remain relative
          : selectedPoint.type === 'anchor'
                ? {
                    anchorPos: newPos,
                    controlPos: posAdd(posSub(newPos, anchorPos), controlPos),
                }
          : selectedPoint.type satisfies never;

        // apply update to updated point
        onUpdateState(updatePointsFromUpdate(points, selectedPoint.id, changedPoint));
    }

    return (
        <main>
            <canvas ref={canvasRef}
                onMouseDown={handleDragStart}
                onMouseMove={handleDrag}
            ></canvas>
        </main>
    );
}

export default Main;
