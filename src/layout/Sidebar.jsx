import { useEffect, useRef } from 'react';
import './Sidebar.css';

function Sidebar({ id, direction, children }) {
    const sidebarContainerRef = useRef(null);
    const barHandleRef = useRef(null);

    const isVertical = direction === 'left' || direction === 'right';
    const isInverse = direction === 'right' || direction === 'bottom';

    useEffect(() => {
        let resizeStart = null;

        const handleDragStart = (e) => {
            resizeStart = {
                size: isVertical
                    ? sidebarContainerRef.current.offsetWidth
                    : sidebarContainerRef.current.offsetHeight,
                offset: isVertical
                    ? e.clientX
                    : e.clientY,
            };
        }
        const handleDragEnd = () => {
            resizeStart = null;
        }
        const handleDrag = (e) => {
            if (!resizeStart) { return; }
            const offset = (isVertical ? e.clientX : e.clientY) - resizeStart.offset;
            const newSize = resizeStart.size + offset * (isInverse ? -1 : 1);
            if (isVertical) {
                sidebarContainerRef.current.style.width = `${newSize}px`;
            } else {
                sidebarContainerRef.current.style.height = `${newSize}px`;
            }
        }

        const barHandle = barHandleRef.current;
        barHandle.addEventListener('mousedown', handleDragStart);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('mousemove', handleDrag);

        return () => {
            barHandle.removeEventListener('mousedown', handleDragStart);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('mousemove', handleDrag);
        }
    }, []);

    const resizeBarClass = `resize-bar bar-${direction}`;

    return (
        <aside id={id} className="resizable-sidebar">
            <div className={resizeBarClass}>
                <div className="bar-handle" ref={barHandleRef}></div>
            </div>
            <section ref={sidebarContainerRef} style={{ width: 0 }}>
                {children}
            </section>
        </aside>
    );
}

export default Sidebar;
