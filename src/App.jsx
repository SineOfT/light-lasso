import { useState, useEffect } from 'react';
import { posAvg, numAvg, generateId } from './scripts/util';
import { generateLut } from './scripts/lut';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
import LocalControls from './layout/LocalControls';
import './App.css'

function App() {
    const [resolution, setResolution] = useState({ x: 0, y: 0 });
    const [points, setPoints] = useState({ });
    const [curves, setCurves] = useState({ });
    const [luts, setLuts] = useState({ });
    const [selectedPointId, setSelectedPointId] = useState(null);

    useEffect(() => {
        setResolution({ x: 1024, y: 1024 });
        setPoints({
            1: {
                pos: { x: 50, y: 50 },
                radius: 10,
                t: 10
            },
            2: {
                pos: { x: 500, y: 500 },
                radius: 50,
                t: 50
            },
            3: {
                pos: { x: 600, y: 300 },
                radius: 30,
                t: 70
            },
        });

        setCurves({
            1: ['1', '2', '3'],
        });
        setLuts({
            1: generateLut([
                {
                    pos: { x: 50, y: 50 },
                    radius: 10,
                    t: 10
                },
                {
                    pos: { x: 500, y: 500 },
                    radius: 50,
                    t: 50
                },
                {
                    pos: { x: 600, y: 300 },
                    radius: 30,
                    t: 70
                },
            ])
        });

    }, []);

    const handleUpdatePoint = (pointId, changedValues) => {
        const prevPoint = points[pointId];
        if (prevPoint == null) { return; }
        const newPoint = { ...prevPoint, ...changedValues };
        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[pointId] = newPoint;
            return newPoints;
        });

        if (Object.hasOwn(changedValues, 'pos')) {
            handleUpdateLutFromUpdatePoint(pointId, newPoint);
        }
    }

    const handleUpdateSelected = (pointId) => {
        setSelectedPointId(pointId);
    }

    const handleAddPoint = (curveId, pointIndex) => {
        if (!Object.hasOwn(curves, curveId)) { return; }
        const prevCurve = curves[curveId];
        if (prevCurve.length < pointIndex) { return; }
        const prevCurvePoints = prevCurve.map((curvePointId) => points[curvePointId]);

        const surroundingPointIds = pointIndex === 0
            ? [prevCurve[0]]
        : pointIndex === prevCurve.length
            ? [prevCurve[prevCurve.length-1]]
            : [prevCurve[pointIndex-1], prevCurve[pointIndex]];
        const surroundingPoints = surroundingPointIds.map(p => points[p]);
        const pos = posAvg(...surroundingPoints.map(p => p.pos));
        const t = numAvg(...surroundingPoints.map(p => p.t));
        const point = { pos, t, radius: 0 };
        const id = generateId(Object.keys(points));

        const newCurve = [...prevCurve].toSpliced(pointIndex, 0, id);
        const newCurvePoints = [...prevCurvePoints].toSpliced(pointIndex, 0, point);

        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[id] = point;
            return newPoints;
        });
        setCurves((prevCurves) => {
            const newCurves = { ...prevCurves };
            newCurves[curveId] = newCurve;
            return newCurves;
        });
        setSelectedPointId(id);
        setLuts((prevLuts) => {
            const newLuts = { ...prevLuts };
            newLuts[curveId] = generateLut(newCurvePoints);
            return newLuts;
        });
    }

    const handleUpdateCurve = (curveId, curvePointIds) => {
        if (!Object.hasOwn(curves, curveId)) { return; }
        const curvePoints = curvePointIds.map((pointId) => points[pointId]); //TODO
        setCurves((prevCurves) => {
            const newCurves = { ...prevCurves };
            newCurves[curveId] = curvePointIds;
            return newCurves;
        });
        setLuts((prevLuts) => {
            const newLuts = { ...prevLuts };
            newLuts[curveId] = generateLut(curvePoints);
            return newLuts;
        });
    }

    const handleUpdateLutFromUpdatePoint = (pointId, newPoint) => {
        const curveObj = Object.entries(curves).find(([_, curve]) => curve.includes(pointId));
        if (curveObj == null) { return }
        const [curveId, curve] = curveObj;
        const curvePoints = curve.map((curvePointId) => curvePointId === pointId
            ? newPoint
            : points[curvePointId]
        );
        setLuts((prevLuts) => {
            const newLuts = { ...prevLuts };
            newLuts[curveId] = generateLut(curvePoints);
            return newLuts;
        });
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
        <Sidebar id="local-controls-sidebar" direction="right">
            <LocalControls
                points={points}
                curves={curves}
                selectedPointId={selectedPointId}
                onUpdatePoint={handleUpdatePoint}
                onUpdateSelected={handleUpdateSelected}
                onAddPoint={handleAddPoint}
            />
        </Sidebar>
        <Sidebar id="global-controls-sidebar" direction="bottom"></Sidebar>
    </>);
}

export default App;
