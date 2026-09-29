import { useState, useEffect, useRef } from 'react';
import { SELECTABLE_RADIUS } from '../scripts/constants';
import { posAdd, posSub, posWithin } from '../scripts/util';

function Main({
    resolution, points, curves, luts, selectedPointId,
    onUpdatePoint, onUpdateSelected
}) {

    const [dragOffset, setDragOffset] = useState(null);
    const canvasRef = useRef(null);
    const drawLoopIdRef = useRef(null);

    useEffect(() => {
        canvasRef.current.width = resolution.x;
        canvasRef.current.height = resolution.y;
    }, [resolution]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const draw = () => {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            Object.entries(points).forEach(([pointId, { pos, radius, t }]) => {
                const selected = pointId === selectedPointId;

                ctx.fillStyle = '#EEE';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2, false);
                ctx.fill();

                ctx.fillStyle = selected ? '#F00' : '#DDD';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, SELECTABLE_RADIUS, 0, Math.PI * 2, false);
                ctx.fill();
            });

            ctx.fillStyle = '#AAA';
            Object.values(luts).forEach((lut) => {
                lut.forEach((pos) => {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2, false);
                    ctx.fill();
                });
            });

            if (drawLoopIdRef.current != null) {
                drawLoopIdRef.current = window.requestAnimationFrame(draw);
            }
        }

        drawLoopIdRef.current = window.requestAnimationFrame(draw);

        return () => {
            window.cancelAnimationFrame(drawLoopIdRef.current);
            drawLoopIdRef.current = null;
        }

    }, [points, curves, selectedPointId]);

    useEffect(() => {
        if (dragOffset == null) { return; }
        window.addEventListener("mouseup", handleDragEnd);

        return () => {
            window.removeEventListener("mouseup", handleDragEnd);
        }

    }, [dragOffset]);

    const handleDragStart = (e) => {
        const mousePos = { x: e.clientX, y: e.clientY };
        const clickedPoint = Object.entries(points).find(([_, { pos }]) => posWithin(pos, mousePos, SELECTABLE_RADIUS));
        if (clickedPoint) {
            const [selectedPointId, selectedPoint] = clickedPoint;
            onUpdateSelected(selectedPointId);
            setDragOffset(posSub(selectedPoint.pos, mousePos));
        } else {
            onUpdateSelected(null);
        }
    }

    const handleDragEnd = () => {
        setDragOffset(null);
    }

    const handleDrag = (e) => {
        if (dragOffset == null || selectedPointId == null) { return; }
        const mousePos = { x: e.clientX, y: e.clientY };
        const pos = posAdd(mousePos, dragOffset);
        onUpdatePoint(selectedPointId, { pos });
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