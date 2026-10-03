import { useState, useEffect } from 'react';
import { getCurveFromAddPoint } from './scripts/curves';
import { generateBezierLut, getLutFromUpdatePoint, getLutFromAddPoint } from './scripts/lut';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
import LocalControls from './layout/LocalControls';
import './styles/App.css'

import type { pos } from './scripts/pos';
import type { curve } from './scripts/curves';
import type { lut } from './scripts/lut';

const App = () => {
    // the dimensions of the editable canvas, as an (x,y) position
    const [resolution, setResolution] = useState({ x: 0, y: 0 });
    // a record of all existing points
    const [points, setPoints] = useState<Record<string, pos>>({ });
    // a record of all existing curves
    const [curves, setCurves] = useState<Record<string, curve>>({ });
    // a record of all existing LUTs
    const [luts, setLuts] = useState<Record<string, lut>>({ });
    // the ID of the point that is currently selected
    const [selectedPointId, setSelectedPointId] = useState<string|null>(null);

    // effect updates states to temporary mock starting data
    useEffect(() => {
        setResolution({ x: 1024, y: 1024 });
        setPoints({
            0: {x: 0, y: 0 },
            1: { x: 50, y: 50 },
            2: { x: 500, y: 500 },
            3: { x: 600, y: 300 },
        });

        setCurves({
            1: ['0', '1', '2', '3'],
        });
        setLuts({
            1: [
                generateBezierLut(
                    { x: 0, y: 0 },
                    { x: 50, y: 50 },
                    { x: 500, y: 500 },
                    { x: 600, y: 300 }
                )
            ],
        });

    }, []);

    /**
     * function updates the point with the given ID to reflect the new values provided
     * 
     * @param pointId the ID of the point to change
     * @param newPoint the new point
     */
    const handleUpdatePoint = (pointId: string, newPoint: pos) => {
        // if ID is not valid point, terminate
        if (!Object.hasOwn(points, pointId)) { return; }

        // update point in state
        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[pointId] = newPoint;
            return newPoints;
        });

        // update LUT affected by point
        handleUpdateLutFromUpdatePoint(pointId, newPoint);
    }

    /**
     * function handles adding a point to a given curve at a given position on the curve
     * 
     * the position, radius, and timing are determined based on what existing points
     * this point is placed between
     * 
     * @param curveId the ID of the curve to add the point to
     * @param pointIndex the index on the curve at which to add the point
     */
    const handleAddPoint = (curveId: string, pointIndex: number) => {
        // calculate new curves from add
        const curveFromAddPointData = getCurveFromAddPoint(points, curves, curveId, pointIndex);
        if (curveFromAddPointData == undefined) { return; }
        const { newControlPointId, newControlPoint, newPointId, newPoint } = curveFromAddPointData;

        // set points and curves in states
        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[newControlPointId] = newControlPoint;
            newPoints[newPointId] = newPoint;
            return newPoints;
        });
        setCurves((prevCurves) => {
            const newCurves = { ...prevCurves };
            newCurves[curveId]?.splice(pointIndex, 0, newControlPointId, newPointId);
            return newCurves;
        });
        
        // update LUT where affected by new point
        handleUpdateLutFromAddPoint(curveId, pointIndex, newControlPoint, newPoint);
    }

    /**
     * function updates the LUT where a point has been updated to a new position
     * 
     * @param pointId the ID of the updated point
     * @param newPoint the new position of the updated point
     */
    const handleUpdateLutFromUpdatePoint = (pointId: string, newPoint: pos) => {        
        // calculate new LUTs from update
        const lutFromUpdatePointData = getLutFromUpdatePoint(points, curves, pointId, newPoint);
        if (lutFromUpdatePointData == undefined) { return; }
        const {
            curveId,
            sectionBeforeIndex, sectionBeforeLut,
            sectionAfterIndex,  sectionAfterLut,
        } = lutFromUpdatePointData;

        // set these new LUTs in the state
        setLuts((prevLuts) => {
            const newLuts = { ...prevLuts };
            const newLut = newLuts[curveId];
            if (newLut == undefined) { return prevLuts; }
            if (sectionBeforeLut != null) { newLut[sectionBeforeIndex] = sectionBeforeLut; }
            if (sectionAfterLut  != null) { newLut[sectionAfterIndex]  = sectionAfterLut;  }
            return newLuts;
        });
    }

    /**
     * function updates the LUT where a point and respective control point has been added
     * 
     * @param curveId the ID of the curve in which the new point has been added
     * @param curvePointIndex the index at which the new point has been added
     * @param controlPointPos the position of the control point for the new point
     * @param pointPos the position of the new point
     */
    const handleUpdateLutFromAddPoint = (
        curveId: string, pointIndex: number, controlPoint: pos, point: pos
    ) => {
        // calculate new LUTs from add
        const lutFromAddPointData = getLutFromAddPoint(
            points, curves, curveId, pointIndex, controlPoint, point);
        if (lutFromAddPointData == undefined) { return; }
        const { sectionIndex, sectionLuts } = lutFromAddPointData;

        // set these new LUTs in the state
        setLuts((prevLuts) => {
            const newLuts = { ...prevLuts };
            newLuts[curveId]?.splice(sectionIndex, 1, ...sectionLuts); // replace one LUT with 2 new
            return newLuts;
        });
    }

    /**
     * function handles updating the currently selected point
     * 
     * if null is passed in, the currently selected point is deselected
     * 
     * @param pointId the ID of the point to set as the new selected point
     */
    const handleUpdateSelected = (pointId: string|null) => {
        setSelectedPointId(pointId);
    }

    return (<>
        <Main
            resolution={resolution}
            points={points}
            curves={curves}
            luts={luts}
            selectedPointId={selectedPointId}
            onUpdatePoint={handleUpdatePoint}
            onUpdateSelected={handleUpdateSelected}
        />
        <Sidebar direction="right" zIndex={1}>
            <LocalControls
                curves={curves}
                selectedPointId={selectedPointId}
                onAddPoint={handleAddPoint}
                onUpdateSelected={handleUpdateSelected}
            />
        </Sidebar>
        <Sidebar direction="bottom" zIndex={2}></Sidebar>
    </>);
}

export default App;
