import { useState, useEffect, useRef, useMemo } from 'react'
import { posAdd, posSub, posDiv, posWithin, posWithLength, posDistance } from '../scripts/pos'
import { clampPosToBounds } from '../scripts/bounds'

import type { MouseEvent } from 'react'
import type { pos } from '../scripts/pos'
import type { PosBounds } from '../scripts/bounds'
import type { PartialPoint, PointHandleType, SelectedPoint } from '../scripts/point'
import type { PosPoint } from '../scripts/posPoint'

/** type defines data point that can be dragged on curve editor */
export type DraggablePoint = {
    /** ID of the point */
    id: string,
    /** position of point */
    pos: pos,
    /** whether or not this point is currently selected */
    isSelected: boolean,
} & ({
    /** type point is in an anchor position */
    type: Extract<PointHandleType, 'anchor'>,
    /** the bounds within which the anchor position is allowed to move */
    bounds: PosBounds,
} | {
    /** this point is either in a before control position, or after control position */
    type: Extract<PointHandleType, 'beforeControl'|'afterControl'>,
    /** position of the relative anchor */
    anchorPos: pos,
    /** control position opposite to the control position this point represents */
    oppositeControlPos: pos,
})

/** color of the draggable points in the curve editor */
export const DRAGGABLE_POINT_COLOR = '#DDD';
/** color of the draggable point in the curve editor that is selected */
export const SELECTED_POINT_COLOR = '#FA6';
/** color of curve in curve editor */
export const CURVE_COLOR = '#EEE';
/** color of any background indicators in the curve editor */
export const BG_INDICATOR_COLOR = '#FFF1';

/** component defines a Bezier curve editor, where points can be dragged to modify shape */
const BezierCurveEditor = ({
    draggablePoints,
    pointRadius,
    selectedPoint,
    onUpdateSelected,
    onUpdatePoint,
    convertPosToCanvasPx,
    convertCanvasPxToPos,
    drawBg,
}: {
    /** list of all draggable points in editor */
    draggablePoints: DraggablePoint[],
    /** radius, in canvas pixels, of each draggable point */
    pointRadius: number,
    /** which point currently selected, or null if none */
    selectedPoint: SelectedPoint|null,
    /** function updates which point currently selected */
    onUpdateSelected: (selectedPoint: SelectedPoint|null) => void,
    /** function updates value of given point, based on position moved in editor */
    onUpdatePoint: (pointId: string, changedPos: PartialPoint<PosPoint>) => void,
    /** function converts position of each point into canvas pixel coordinates */
    convertPosToCanvasPx: (canvas: HTMLCanvasElement, pos: pos) => pos,
    /** function converts position of each point from canvas pixel coordinates to position */
    convertCanvasPxToPos: (canvas: HTMLCanvasElement, px: pos) => pos,
    /** function draws the background on each canvas, before the points are drawn */
    drawBg: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void,
}) => {
    // the offset at which the dragged point was initially located
    const [dragOffset, setDragOffset] = useState<pos|null>(null);
    // a DOM ref to the canvas which the lasso is drawn on
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // a ref to the ID of the animation loop, used to stop the animation loop
    const drawLoopIdRef = useRef<number|null>(null);

    // which point is currently being dragged, if any
    const draggingPoint = useMemo(() => (selectedPoint !== null
        ? draggablePoints.find(
            ({ id, type }) => id === selectedPoint.id && type === selectedPoint.type
        ) ?? null
        : null
    ), [draggablePoints, selectedPoint]);

    // effect updates size of canvas to match CSS dimensions, so pixels one-to-one with screen
    useEffect(() => {
        // ensure that canvas ready to modify
        if (canvasRef.current === null) { return; }

        // add resize observer to update dimensions when size changes
        const canvasResizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                // get canvas element and size
                const canvas = entry.target as HTMLCanvasElement;
                const borderBoxSize = entry.borderBoxSize[0]!;

                // only set width and height if changed
                if (canvas.width !== borderBoxSize.inlineSize) {
                    canvas.width = borderBoxSize.inlineSize;
                }
                if (canvas.height !== borderBoxSize.blockSize) {
                    canvas.height = borderBoxSize.blockSize;
                }

                // redraw, since changing dimensions clears canvas content
                const ctx = canvas.getContext('2d');
                if (ctx === null) {
                    console.warn('Failed to draw on canvas, ensure that HTML canvas is enabled');
                    return;
                }
                draw(canvas, ctx, draggablePoints, pointRadius);
            });
        });

        // observe canvas
        canvasResizeObserver.observe(canvasRef.current);

        // return cleanup function that removes observer
        return () => {
            canvasResizeObserver.disconnect();
        }
    }, [draggablePoints, pointRadius, canvasRef]);

    // effect draws canvas every frame
    useEffect(() => {
        // get canvas and context from DOM ref
        if (canvasRef.current === null) { return; }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx === null) {
            console.warn('Failed to draw on canvas, ensure that HTML canvas is enabled');
            return;
        }

        // define draw loop
        const drawLoop = () => {
            draw(canvas, ctx, draggablePoints, pointRadius);
            drawLoopIdRef.current = window.requestAnimationFrame(drawLoop);
        }

        // commence draw loop immediately
        drawLoop();

        // return cleanup function that terminates draw loop
        return () => {
            if (drawLoopIdRef.current !== null) {
                window.cancelAnimationFrame(drawLoopIdRef.current);
                drawLoopIdRef.current = null;
            }
        }

    }, [draggablePoints, pointRadius, canvasRef]);

    // effect stops drag when mouse lifted
    useEffect(() => {
        // stop when mouse lifted
        window.addEventListener("mouseup", handleDragEnd);

        // return cleanup function that removes event listener
        return () => {
            window.removeEventListener("mouseup", handleDragEnd);
        }
    }, []);

    /**
     * function draws points and background on canvas
     * @param canvas HTML canvas element in DOM
     * @param ctx context of the canvas used to draw on
     * @param draggablePoints a list of all points that can be dragged on editor
     * @param pointRadius the radius of each point, in canvas pixel units 
     */
    const draw = (
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        draggablePoints: DraggablePoint[],
        pointRadius: number,
    ) => {
        // clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // draw background
        drawBg(canvas, ctx);

        // draw points
        ctx.strokeStyle = DRAGGABLE_POINT_COLOR;
        ctx.lineWidth = pointRadius * 0.2;
        draggablePoints.forEach((draggablePoint) => {
            const { pos, isSelected, type } = draggablePoint;
            const posPx = convertPosToCanvasPx(canvas, pos);
            ctx.fillStyle = isSelected ? SELECTED_POINT_COLOR : DRAGGABLE_POINT_COLOR;

            // if is control point, draw line to anchor position
            if (type === 'beforeControl' || type === 'afterControl') {
                const anchorPosPx = convertPosToCanvasPx(canvas, draggablePoint.anchorPos);
                ctx.beginPath();
                ctx.moveTo(posPx.x, posPx.y);
                ctx.lineTo(anchorPosPx.x, anchorPosPx.y);
                ctx.stroke();
            }

            // draw point
            ctx.beginPath();
            ctx.arc(posPx.x, posPx.y, pointRadius, 0, Math.PI*2, true);
            ctx.fill();
        });
    }

    /**
     * function handles beginning dragging a point by recording starting position offset
     * @param e event provided by the event listener
     */
    const handleDragStart = (e: MouseEvent<HTMLCanvasElement>) => {
        // ensure that canvas exists
        if (canvasRef.current === null) { return; } 

        // find points within mouse position
        const mousePosPx = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const clickedPoints = draggablePoints.filter(({ pos }) => posWithin(
            convertPosToCanvasPx(canvasRef.current!, pos),
            mousePosPx,
            pointRadius,
        ));
        
        // get clicked point, if no point clicked deselect current
        if (clickedPoints.length === 0) {
            onUpdateSelected(null);
            return;
        }
        const { id, pos, type } = clickedPoints[0]!;

        // select point
        onUpdateSelected({ id, type });
        
        // calculate initial drag offset to begin drag
        const mousePos = convertCanvasPxToPos(canvasRef.current, mousePosPx);
        setDragOffset(posSub(pos, mousePos));
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
        if (dragOffset === null || draggingPoint === null) { return; }
        // ensure that canvas exists
        if (canvasRef.current === null) { return; } 

        // calculate new position of point
        const mousePosPx = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const mousePos = convertCanvasPxToPos(canvasRef.current, mousePosPx);
        const newPos = posAdd(mousePos, dragOffset);
        
        // determine which positions in point need to be changed
        const changedPos: PartialPoint<PosPoint> = (() => {
            // if anchor dragged, change anchor position
            if (draggingPoint.type === 'anchor') {
                const newPosClamped = clampPosToBounds(newPos, draggingPoint.bounds);
                return { anchorPos: newPosClamped };
            }

            // if control dragged, find position of opposing control point
            const newPosPx = convertPosToCanvasPx(canvasRef.current, newPos);
            const anchorPosPx = convertPosToCanvasPx(canvasRef.current, draggingPoint.anchorPos);
            const oppositeControlPosPx =
                convertPosToCanvasPx(canvasRef.current, draggingPoint.oppositeControlPos);
            const oppositeControlLengthPx = posDistance(oppositeControlPosPx, anchorPosPx);
            const newOppositeControlPosPx = posAdd(
                anchorPosPx,
                posWithLength(posSub(anchorPosPx, newPosPx), oppositeControlLengthPx));
            const newOppositeControlPos = convertCanvasPxToPos(canvasRef.current, newOppositeControlPosPx);

            // calculate offset between current anchor and new position
            const controlLength         = posDistance(newPos,                draggingPoint.anchorPos);
            const oppositeControlLength = posDistance(newOppositeControlPos, draggingPoint.anchorPos);
            /*
             * use opposite control position to calculate direction, since canvas px to pos conversion
             * does not need to be linear, and only controlling dragging control position leads to
             * the error between directions reccursively error the length of the opposite control position
             */
            const direction =
                posDiv(posSub(newOppositeControlPos, draggingPoint.anchorPos), oppositeControlLength);

            // if before control position dragged, change before control position
            if (draggingPoint.type === 'beforeControl') {
                return { controlPos: {
                    direction,
                    beforeLength: controlLength,
                    afterLength: oppositeControlLength,
                } };
            }

            // if after control position dragged, change after control position
            if (draggingPoint.type === 'afterControl') {
                const direction =
                    posDiv(posSub(draggingPoint.anchorPos, newOppositeControlPos), oppositeControlLength);
                return { controlPos: {
                    direction,
                    beforeLength: oppositeControlLength,
                    afterLength: controlLength,
                } };
            }

            return draggingPoint.type satisfies never;
        })();

        // apply update to changed positions
        onUpdatePoint(draggingPoint.id, changedPos);
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
            }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDrag}
        ></canvas>
    );
}

export default BezierCurveEditor;
