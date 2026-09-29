import { useState, useEffect } from 'react';
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
                selectedPointId={selectedPointId}
                onUpdatePoint={handleUpdatePoint}
            />
        </Sidebar>
        <Sidebar id="global-controls-sidebar" direction="bottom"></Sidebar>
    </>);
}

export default App;
