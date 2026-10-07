import { useState, useEffect } from 'react';
import { addCurve, getCurveFromAddPoint, getCurveFromDeletePoint } from './scripts/curves';
import { generateBezierLut, getLutFromUpdatePoint, getLutFromAddPoint, getLutFromDeletePoint } from './scripts/lut';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
import LocalControls from './layout/LocalControls';
import './styles/App.css'

import type { pos } from './scripts/pos';
import type { curve, selectedPointData } from './scripts/curves';
import type { lut } from './scripts/lut';

const App = () => {
    // the dimensions of the editable canvas, as an (x,y) position
    const [resolution, setResolution] = useState<pos>({ x: 0, y: 0 });
    // a record of all existing points
    const [points, setPoints] = useState<Record<string, pos>>({ });
    // a record of all existing curves
    const [curves, setCurves] = useState<Record<string, curve>>({ });
    // a record of all existing LUTs
    const [luts, setLuts] = useState<Record<string, lut>>({ });
    // the point that is currently selected
    const [selectedPointData, setSelectedPointData] = useState<selectedPointData|null>(null);

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
            1: [
                {
                    controlPointId: '0',
                    anchorPointId: '1',
                },
                {
                    controlPointId: '2',
                    anchorPointId: '3',
                },
            ],
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
     * @param pointId the ID of the point to change
     * @param newPoint the new point
     */
    const handleUpdatePoint = (pointId: string, newPoint: pos) => {
        // if point doesn't exist, skip
        if (!Object.hasOwn(points, pointId)) { return; }

        // calculate new LUTs from update
        const updateLuts = getLutFromUpdatePoint(points, curves, luts, pointId, newPoint);
        if (updateLuts == undefined) { return; }

        // update based on updater functions
        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[pointId] = newPoint;
            return newPoints;
        });
        setLuts(updateLuts);
    }

    /**
     * function handles adding a point before or after an existing point
     * 
     * the position and control point is determined based on the neighboring point(s)
     * 
     * @param pointId ID of the point relative to where the new point will be added
     * @param isAfter whether the new point is added before or after the given point
     */
    const handleAddPoint = (pointId: string, isAfter: boolean) => {
        // calculate new curves from add
        const data = getCurveFromAddPoint(points, curves, pointId, isAfter);
        if (data == undefined) { return; }
        const { controlPoint, anchorPoint, updatePoints, updateCurves } = data;

        // calculate new LUTs from add
        const updateLuts = getLutFromAddPoint(
            points, curves, luts, pointId, isAfter, controlPoint, anchorPoint);
        if (updateLuts == undefined) { return; }

        // update based on updater functions
        setPoints(updatePoints);
        setCurves(updateCurves);
        setLuts(updateLuts);
    }

    /**
     * function handles deleting a point
     * @param pointId ID of the point to delete
     */
    const handleDeletePoint = (pointId: string) => {
        // calculate new curves from delete
        const data = getCurveFromDeletePoint(curves, pointId);
        if (data == undefined) { return; }
        const { updatePoints, updateCurves } = data;

        // calculate new LUTs from delete
        const updateLuts = getLutFromDeletePoint(points, curves, luts, pointId);
        if (updateLuts == undefined) { return; }

        // update based on updater functions
        setPoints(updatePoints);
        setCurves(updateCurves);        
        setLuts(updateLuts);
    }

    /**
     * function handles adding new curve, with one point centered on canvas
     */
    const handleAddCurve = () => {
        // calculate new curve from add
        const { curveId, updatePoints, updateCurves } = addCurve(curves, resolution);

        // update based on updater functions
        setPoints(updatePoints);
        setCurves(updateCurves);
        setLuts((prevLuts: Record<string, lut>) => {
            const newLuts = { ...prevLuts } as Record<string, lut>;
            newLuts[curveId] = []; // only 1 point, so 0 sections
            return newLuts;
        });
    }

    /**
     * function handles deleting given curve
     * @param curveId ID of curve to delete
     */
    const handleDeleteCurve = (curveId: string) => {
        // find IDs of all points in curve
        const curve = curves[curveId];
        if (curve == undefined) { return; }

        // update states
        setPoints((prevPoints: Record<string, pos>) => {
            const newPoints = { ...prevPoints } as Record<string, pos>;
            for (const pointId of curve) {
                delete newPoints[pointId.controlPointId];
                delete newPoints[pointId.anchorPointId];
            }
            return newPoints;
        });
        setCurves((prevCurves: Record<string, curve>) => {
            const newCurves = { ...prevCurves } as Record<string, curve>;
            delete newCurves[curveId];
            return newCurves;
        });
        setLuts((prevLuts: Record<string, lut>) => {
            const newLuts = { ...prevLuts } as Record<string, lut>;
            delete newLuts[curveId];
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
    const handleUpdateSelected = (selectedPointData: selectedPointData|null) => {
        setSelectedPointData(selectedPointData);
    }

    return (<>
        <Main
            resolution={resolution}
            points={points}
            curves={curves}
            luts={luts}
            selectedPointData={selectedPointData}
            onUpdatePoint={handleUpdatePoint}
            onUpdateSelected={handleUpdateSelected}
        />
        <Sidebar direction="right" zIndex={1}>
            <LocalControls
                points={points}
                curves={curves}
                selectedPointData={selectedPointData}
                onUpdatePoint={handleUpdatePoint}
                onAddPoint={handleAddPoint}
                onDeletePoint={handleDeletePoint}
                onAddCurve={handleAddCurve}
                onDeleteCurve={handleDeleteCurve}
                onUpdateSelected={handleUpdateSelected}
            />
        </Sidebar>
        <Sidebar direction="bottom" zIndex={2}></Sidebar>
    </>);
}

export default App;
