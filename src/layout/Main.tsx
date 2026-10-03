import { useState, useEffect, useRef } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { posAdd, posSub, posWithin } from '../scripts/pos';

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
    // the offset at which the dragged point was initially located
    const [dragOffset, setDragOffset] = useState<pos|null>(null);
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
        // clear previous drawing
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw each point
        Object.entries(points).forEach(([pointId, point]) => {
            const selected = pointId === selectedPointId;

            ctx.fillStyle = selected ? '#F00' : '#DDD';
            ctx.beginPath();
            ctx.arc(point.x, point.y, SELECTABLE_RADIUS, 0, Math.PI * 2, false);
            ctx.fill();
        });

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
    }

    /**
     * function handles beginning dragging a point by recording starting position offset
     * @param e event provided by the event listener
     */
    const handleDragStart = (e: MouseEvent<HTMLCanvasElement>) => {
        // find point within mouse position
        const mousePos = { x: e.clientX, y: e.clientY };
        const clickedPoint = Object.entries(points).find(([_, point]) => posWithin(point, mousePos, SELECTABLE_RADIUS));
        
        // if point clicked, begin dragging point
        if (clickedPoint) {
            const [selectedPointId, selectedPoint] = clickedPoint;
            onUpdateSelected(selectedPointId);
            setDragOffset(posSub(selectedPoint, mousePos));
        // if point not clicked, deselect all
        } else {
            onUpdateSelected(null);
        }
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
        if (dragOffset == null || selectedPointId == null) { return; }

        // update dragging point to new position
        const mousePos = { x: e.clientX, y: e.clientY };
        const pos = posAdd(mousePos, dragOffset);
        onUpdatePoint(selectedPointId, pos);
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