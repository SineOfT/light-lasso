import { useState, useEffect, useRef, useMemo } from 'react';
import { EMPTY_POS, posAdd, posSub, posDiv, posWithin, posWithLength, posDistance } from '../scripts/pos';
import { clampPosToBounds } from '../scripts/bounds';

import type { MouseEvent } from 'react';
import type { pos } from '../scripts/pos';
import type { PosBounds } from '../scripts/bounds';
import type { PartialPoint, PointHandleType, SelectedPoint } from '../scripts/point';
import type { PosPoint } from '../scripts/posPoint';

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

/** type defines record when dragging begins, holding initial state to calculate new position */
interface DragStart {
    /** initial position of value to drag */
    initial: pos,
    /** initial position where mouse pressed down to start drag */
    mouse: pos,
}

/** color of the background of the canvas, focusing only on the main area */
export const BG_COLOR = '#0003';
/** color of any background indicators in the curve editor */
export const BG_INDICATOR_COLOR = '#FFF1';
/** color of the draggable points in the curve editor */
export const DRAGGABLE_POINT_COLOR = '#DDD';
/** color of the draggable point in the curve editor that is selected */
export const SELECTED_POINT_COLOR = '#FA6';
/** color of curve in curve editor */
export const CURVE_COLOR = '#EEE';

/** width of the outline placed around editable section of editor */
const BG_OUTLINE_WIDTH = 10;

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
    convertPosToCanvasPx: (canvasSize: pos, pos: pos) => pos,
    /** function converts position of each point from canvas pixel coordinates to position */
    convertCanvasPxToPos: (canvasSize: pos, px: pos) => pos,
    /** function draws the background on each canvas, before the points are drawn */
    drawBg: (canvasSize: pos, ctx: CanvasRenderingContext2D) => void,
}) => {
    // current dimensions of canvas used to draw the editor
    const [canvasSize, setCanvasSize] = useState<pos>(EMPTY_POS);
    // current position of the canvas, offset from the center position
    const [canvasOriginPx, setCanvasOriginPx] = useState<pos>(EMPTY_POS);
    // the position in canvas pixels where a drag was started
    const [dragStartPx, setDragStartPx] = useState<DragStart|null>(null);
    // a DOM ref to the canvas which the lasso is drawn on
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
                if (canvas.width === borderBoxSize.inlineSize
                 && canvas.height === borderBoxSize.blockSize) {
                    return; 
                }
                
                // update dimensions of canvas in state
                setCanvasSize({ x: borderBoxSize.inlineSize, y: borderBoxSize.blockSize });
            });
        });

        // observe canvas
        canvasResizeObserver.observe(canvasRef.current);

        // return cleanup function that removes observer
        return () => {
            canvasResizeObserver.disconnect();
        }
    }, [canvasRef]);

    // effect draws canvas when value updated
    useEffect(() => {
        // get canvas and context from DOM
        const canvas = canvasRef.current;
        if (canvas === null) { return; }
        const ctx = canvas.getContext('2d');
        if (ctx === null) {
            console.warn('Failed to draw on canvas, ensure that HTML canvas is enabled');
            return;
        }

        // update size of canvas
        canvas.width  = canvasSize.x;
        canvas.height = canvasSize.y;

        // draw editor
        draw(ctx, canvasSize, canvasOriginPx, draggablePoints, pointRadius);

    }, [canvasRef, canvasSize, canvasOriginPx, draggablePoints, pointRadius]);

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
        ctx: CanvasRenderingContext2D,
        canvasSize: pos,
        canvasOriginPx: pos,
        draggablePoints: DraggablePoint[],
        pointRadius: number,
    ) => {
        // clear canvas
        ctx.clearRect(0, 0, canvasSize.x, canvasSize.y);

        // save default state of context
        ctx.save();

        // translate to canvas origin
        ctx.translate(canvasOriginPx.x, canvasOriginPx.y);

        // draw background rectangle and outline
        ctx.fillStyle = BG_COLOR;
        ctx.lineWidth = BG_OUTLINE_WIDTH;
        ctx.strokeStyle = BG_INDICATOR_COLOR;
        ctx.fillRect(  0, 0, canvasSize.x, canvasSize.y);
        ctx.strokeRect(0, 0, canvasSize.x, canvasSize.y);

        // draw background
        drawBg(canvasSize, ctx);

        // draw points
        ctx.strokeStyle = DRAGGABLE_POINT_COLOR;
        ctx.lineWidth = pointRadius * 0.2;
        draggablePoints.forEach((draggablePoint) => {
            const { pos, isSelected, type } = draggablePoint;
            const posPx = convertPosToCanvasPx(canvasSize, pos);
            ctx.fillStyle = isSelected ? SELECTED_POINT_COLOR : DRAGGABLE_POINT_COLOR;

            // if is control point, draw line to anchor position
            if (type === 'beforeControl' || type === 'afterControl') {
                const anchorPosPx = convertPosToCanvasPx(canvasSize, draggablePoint.anchorPos);
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

        // restore context back to default
        ctx.restore();
    }

    /**
     * function handles beginning dragging a point by recording starting position offset
     * @param e event provided by the event listener
     */
    const handleDragStart = (e: MouseEvent<HTMLCanvasElement>) => {
        // find points within mouse position
        const mousePx = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        const mouseCanvasPx = posSub(mousePx, canvasOriginPx); // translate based on canvas origin
        const clickedPoints = draggablePoints.filter(({ pos }) => posWithin(
            convertPosToCanvasPx(canvasSize, pos),
            mouseCanvasPx,
            pointRadius,
        ));
        
        // if no point clicked, deselect current and start dragging canvas origin
        if (clickedPoints.length === 0) {
            onUpdateSelected(null);
            setDragStartPx({ initial: canvasOriginPx, mouse: mousePx });

        // otherwise, select clicked point and start dragging point
        } else {
            const { id, pos, type } = clickedPoints[0]!;
            const posPx = convertPosToCanvasPx(canvasSize, pos);
            onUpdateSelected({ id, type });
            setDragStartPx({ initial: posPx, mouse: mousePx });
        }
    }

    /**
     * function handles ending dragging a point by removing the drag start position
     */
    const handleDragEnd = () => {
        setDragStartPx(null);
    }

    /**
     * function handles updating a drag by determining how far the mouse moved from the starting position
     * @param e event provided by the event listener
     */
    const handleDrag = (e: MouseEvent<HTMLCanvasElement>) => {
        // if drag not ongoing, skip
        if (dragStartPx === null) { return; }

        // get current position of mouse
        const mousePx = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };

        // drag either point or canvas based on whether point is currently selected
        if (draggingPoint !== null) {
            handleDragPoint(draggingPoint, dragStartPx, mousePx);
        } else {
            handleDragCanvas(dragStartPx, mousePx);
        }
    }

    /**
     * function handles dragging a selected point to the current mouse position
     * @param draggingPoint the point currently being dragged
     * @param dragStartPx the starting position of the drag, in canvas pixels
     * @param mousePx the current position of the mouse on the canvas, in canvas pixels
     */
    const handleDragPoint = (draggingPoint: DraggablePoint, dragStartPx: DragStart, mousePx: pos) => {
        // calculate new position of point
        const startMousePos = convertCanvasPxToPos(canvasSize, dragStartPx.mouse);
        const currMousePos  = convertCanvasPxToPos(canvasSize, mousePx);
        const initialPos    = convertCanvasPxToPos(canvasSize, dragStartPx.initial);
        const newPos = posAdd(initialPos, posSub(currMousePos, startMousePos));
        
        // determine which positions in point need to be changed
        const changedPos: PartialPoint<PosPoint> = (() => {
            // if anchor dragged, change anchor position
            if (draggingPoint.type === 'anchor') {
                const newPosClamped = clampPosToBounds(newPos, draggingPoint.bounds);
                return { anchorPos: newPosClamped };
            }

            // if control dragged, find position of opposing control point
            const newPosPx = convertPosToCanvasPx(canvasSize, newPos);
            const anchorPosPx = convertPosToCanvasPx(canvasSize, draggingPoint.anchorPos);
            const oppositeControlPosPx =
                convertPosToCanvasPx(canvasSize, draggingPoint.oppositeControlPos);
            const oppositeControlLengthPx = posDistance(oppositeControlPosPx, anchorPosPx);
            const newOppositeControlPosPx = posAdd(
                anchorPosPx,
                posWithLength(posSub(anchorPosPx, newPosPx), oppositeControlLengthPx));
            const newOppositeControlPos = convertCanvasPxToPos(canvasSize, newOppositeControlPosPx);

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

    /**
     * function handles dragging the origin of the canvas to the current mouse position
     * @param dragStartPx the starting position of the drag, in canvas pixels
     * @param mousePx the current position of the mouse on the canvas, in canvas pixels
     */
    const handleDragCanvas = (dragStartPx: DragStart, mousePx: pos) => {
        // calculate new position of canvas, as inverse of mouse movement
        const newPx = posAdd(dragStartPx.initial, posSub(mousePx, dragStartPx.mouse));
        
        // set new position
        setCanvasOriginPx(newPx);
    }

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
            }}
            className="curve-editor"
            onMouseDown={handleDragStart}
            onMouseMove={handleDrag}
        ></canvas>
    );
}

export default BezierCurveEditor;
