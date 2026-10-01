import { useState, useEffect } from 'react';
import { posAvg, numAvg, posEquals, generateId } from './scripts/util';
import { generateBezierLut, generateLut } from './scripts/lut';
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
            0: {
                pos: { x: 0, y: 0 },
                radius: 0,
                t: 0
            },
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
            1: ['0', '1', '2', '3'],
        });
        setLuts({
            1: {
                pointsPos: [
                    { x: 0, y: 0 },
                    { x: 50, y: 50 },
                    { x: 500, y: 500 },
                    { x: 600, y: 300 },
                ],
                lut: [
                    generateBezierLut(
                        { x: 0, y: 0 },
                        { x: 50, y: 50 },
                        { x: 500, y: 500 },
                        { x: 600, y: 300 },
                    ),
                ],
            },
        });

    }, []);

    useEffect(() => {
        let isChanged = false;
        const newLuts = { ...luts };

        Object.entries(newLuts).forEach(([curveId, { pointsPos, lut }]) => {
            // get positions of points in correct curve
            const curvePointsPos = curves[curveId]?.map((curvePointId) => points[curvePointId]?.pos);
            if (curvePointsPos == null) { return; }

            // iterate over each section on the correct curve
            let lutPointsI   = 0;
            for (let curvePointsI = 0; curvePointsI < curvePointsPos.length - 3; curvePointsI += 2) {
                // get the points in the current section
                const curveControlPoint1 = curvePointsPos[curvePointsI];
                const curvePoint1        = curvePointsPos[curvePointsI+1];
                const curveControlPoint2 = curvePointsPos[curvePointsI+2];
                const curvePoint2        = curvePointsPos[curvePOintsI+3];

                // if the points are the same, there is nothing to change
                if (lutPointsI + 4 <= pointPos.length) {
                    const lutControlPoint1 = pointsPos[lutPointsI];
                    const lutPoint1        = pointsPos[lutPointsI+1];
                    const lutControlPoint2 = pointsPos[lutPointsI+2];
                    const lutPoint2        = pointsPos[lutPointsI+3];
                    
                    if (posEquals(lutControlPoint1, curveControlPoint1)
                     && posEquals(lutPoint1,        curvePoint1)
                     && posEquals(lutControlPoint2, curveControlPoint2)
                     && posEquals(lutPoint2,        curvePoint2)
                    ) {
                        continue;
                    }
                }

                /*
                * if the points in the correct curve are the same as the LUT points in the next section,
                * it means the current section has been deleted, so move the next LUT to this section
                */
                if (lutPointsI + 6 <= pointsPos.length) {
                    const lutControlPoint1 = pointsPos[lutPointsI+2];
                    const lutPoint1        = pointsPos[lutPointsI+3];
                    const lutControlPoint2 = pointsPos[lutPointsI+4];
                    const lutPoint2        = pointsPos[lutPointsI+5];

                    if (posEquals(lutControlPoint1, curveControlPoint1)
                     && posEquals(lutPoint1,        curvePoint1)
                     && posEquals(lutControlPoint2, curveControlPoint2)
                     && posEquals(lutPoint2,        curvePoint2)
                    ) {
                        isChanged = true;
                        const lutIndex = lutPointsI / 2; // section every 2 point pairs; always even
                        lut[lutIndex] = lut[lutIndex + 1];
                        lutPointsI += 4; // no longer any need to consider this section or next section
                        continue;
                    }
                }

                // otherwise, recompute the LUT value
                isChanged = true;
                const lutIndex = lutPointsI / 2; // section every 2 point pairs; always even
                lut[lutIndex] = generateBezierLut(
                    curveControlPoint1, curvePoint1, curveControlPoint2, curvePoint2);
                // don't change the LUT point index, as current section may just be moved to next section
            }
        });

        // if something changed, update state
        if (isChanged) {
            setLuts(newLuts);
        }

    }, [points, curves]);

    const handleUpdatePoint = (pointId, changedValues) => {
        const prevPoint = points[pointId];
        if (prevPoint == null) { return; }
        const newPoint = { ...prevPoint, ...changedValues };
        setPoints((prevPoints) => {
            const newPoints = { ...prevPoints };
            newPoints[pointId] = newPoint;
            return newPoints;
        });
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
    }

    const handleUpdateCurve = (curveId, curvePointIds) => {
        if (!Object.hasOwn(curves, curveId)) { return; }
        setCurves((prevCurves) => {
            const newCurves = { ...prevCurves };
            newCurves[curveId] = curvePointIds;
            return newCurves;
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
