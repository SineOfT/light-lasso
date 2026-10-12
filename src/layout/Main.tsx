import { useState, useEffect, useRef, useMemo } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { posAdd, posSub, posMul, posDiv, posLength, posWithin, posRound } from '../scripts/pos';
import { getAfterControlPos, getBeforeControlPos } from '../scripts/controlPos';
import { updatePointFromUpdate, updateSelectedPoint } from '../scripts/point';
import { POS_POINT_TYPE } from '../scripts/posPoint';

import type { MouseEvent } from 'react';
import type { pos } from '../scripts/pos';
import type { pointUpdaterFunctions, pointHandleType, selectedPoint } from '../scripts/point';
import type { posPoint } from '../scripts/posPoint';
import type { curve } from '../scripts/curve';

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
    pointType: pointHandleType,
    /** whether or not this point is currently selected */
    isSelected: boolean,
}

/**
 * component defines main canvas, which draws the lasso and exposes touch controls
 */
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
    posPoints: Map<string, posPoint>,
    /** a record of all existing curves */
    curves: Map<string, curve>,
    /** the currently selected point, or null if none selected */
    selectedPoint: selectedPoint|null,
    /** function updates states based on updater function */
    onUpdateState: (data: pointUpdaterFunctions|undefined) => void,
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
            curve.flatMap(({ id, t }, pointIndex) => {
                // check whether this point selected
                const isSelected = id === selectedPoint?.id;
                
                // find positions of point
                const posPoint = posPoints.get(id);
                if (posPoint === undefined) { return []; } // if not point, skip
                const { anchorPos, controlPos } = posPoint;

                // create list to hold all draggable points at this location
                const currDraggablePoints: draggablePoint[] = [];
                
                // if point selected, add control positions to list of draggable points
                if (isSelected) {
                    // if first point, no control point
                    if (pointIndex > 0) {
                        currDraggablePoints.push({
                            id,
                            pos: getBeforeControlPos(anchorPos, controlPos),
                            controlForPoint: anchorPos,
                            pointType: 'beforeControl',
                            isSelected: selectedPoint.type === 'beforeControl',
                        });
                    }
                    // if last point, no inverse control point
                    if (pointIndex < curve.length-1) {
                        currDraggablePoints.push({
                            id,
                            pos: getAfterControlPos(anchorPos, controlPos),
                            controlForPoint: anchorPos,
                            pointType: 'afterControl',
                            isSelected: selectedPoint.type === 'afterControl',
                        });
                    }
                }

                // add anchor point to draggable points list
                currDraggablePoints.push({
                    id,
                    pos: anchorPos,
                    pointType: 'anchor',
                    isSelected: isSelected && selectedPoint.type === 'anchor',
                });

                // add draggable points to accumulating list
                return currDraggablePoints;
            })
        )
    , [curves, posPoints, selectedPoint]);

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
        
        // get control and anchor positions of selected point, skpping if not a position
        const posPoint = posPoints.get(selectedPoint.id);
        if (posPoint === undefined) { return; }
        const { anchorPos, controlPos } = posPoint;

        // calculate new position of point
        const mousePos = { x: e.clientX, y: e.clientY };
        const newPos = posRound(posAdd(mousePos, dragOffset));

        // determine which positions in point need to be changed
        const changedPos: Partial<posPoint> = (() => {
            // if anchor dragged, change anchor position
            if (selectedPoint.type === 'anchor') {
                return { anchorPos: newPos };
            }

            // if control dragged, calculate offset between current anchor and new position
            const newControlPos = posSub(newPos, anchorPos);
            const length = posLength(newControlPos);
            const direction = posDiv(newControlPos, length);

            // if before control position dragged, change before control position
            if (selectedPoint.type === 'beforeControl') {
                return { controlPos: {
                    direction: posMul(direction, -1), // inverse direction
                    beforeLength: length,
                    afterLength: controlPos.afterLength
                } };
            }

            // if after control position dragged, change after control position
            if (selectedPoint.type === 'afterControl') {
                return { controlPos: {
                    direction,
                    beforeLength: controlPos.beforeLength,
                    afterLength: length
                } };
            }

            return selectedPoint.type satisfies never;
        })();

        // apply update to changed positions
        onUpdateState(updatePointFromUpdate(POS_POINT_TYPE,
            posPoints, selectedPoint.id, changedPos));
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
