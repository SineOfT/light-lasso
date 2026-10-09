import React, { useEffect, useRef } from 'react';
import '../styles/Sidebar.css';

/**
 * component defines sidebar that appears on one of 4 sides of window,
 * and is freely resizable
 */
const Sidebar = ({
    direction,
    zIndex,
    children
}: {
    /** the side of the window on which the sidebar is on */
    direction: 'top'|'bottom'|'left'|'right',
    /** the z-index of the sidebar, used to decide which sidebars appear on top of others */
    zIndex: number,
    children?: React.ReactNode,
}) => {
    // a DOM ref to the sidebar container
    const sidebarContainerRef = useRef<HTMLElement|null>(null);
    // a DOM ref to the handle the user can use to resize
    const barHandleRef = useRef<HTMLDivElement|null>(null);

    // get properties of direction
    const isVertical = direction === 'left' || direction === 'right';
    const isInverse = direction === 'right' || direction === 'bottom';

    // effect updates sidebar position when dragged
    useEffect(() => {
        // get DOM elements from DOM refs
        const sidebarContainer = sidebarContainerRef.current;
        const barHandle = barHandleRef.current;
        if (sidebarContainer === null || barHandle === null) { return; }

        // store the offset at which a drag action is started
        let dragOffset: number|null = null;

        /**
         * function handles beginning a drag action by storing the initial values
         * @param e event provided by the event listener
         */
        const handleDragStart = (e: MouseEvent) => {
            // get direction based on whether on smaller side or larger side
            const direction = isInverse ? -1 : 1;
            // set drag offset based on initial size of scrollbar and mouse position
            dragOffset = isVertical
                ? sidebarContainer.offsetWidth  - e.clientX * direction
                : sidebarContainer.offsetHeight - e.clientY * direction;
        }

        /**
         * function handles ending a drag action by removing the stored values
         */
        const handleDragEnd = () => {
            dragOffset = null;
        }

        /**
         * function handles an ongoing drag action by updating the size of the sidebar
         * @param e event provided by the event listener
         */
        const handleDrag = (e: MouseEvent) => {
            // if not dragging, skip
            if (dragOffset === null) { return; }
            // get direction based on whether on smaller side or larger side
            const direction = isInverse ? -1 : 1;
            // set size of sidebar based on how far mouse position moved from initial
            const newSize = dragOffset + (isVertical ? e.clientX : e.clientY) * direction;
            if (isVertical) {
                sidebarContainer.style.width = `${newSize}px`;
            } else {
                sidebarContainer.style.height = `${newSize}px`;
            }
        }

        // add event listeners to handle dragging sidebars
        barHandle.addEventListener('mousedown', handleDragStart);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('mousemove', handleDrag);

        // return function which removes event listeners
        return () => {
            barHandle.removeEventListener('mousedown', handleDragStart);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('mousemove', handleDrag);
        }

    }, [sidebarContainerRef, barHandleRef]);

    // class of resize base based on direction of sidebar
    const sidebarClass = `resizable-sidebar sidebar-${direction}`;

    return (
        <aside className={sidebarClass} style={{ zIndex }}>
            <div className="resize-bar">
                <div className="bar-handle" ref={barHandleRef}></div>
            </div>
            <section ref={sidebarContainerRef} style={isVertical
                ? { width: 0 }
                : { height: 0 }
            }>
                {children}
            </section>
        </aside>
    );
}

export default Sidebar;
