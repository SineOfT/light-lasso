import { useState, useEffect } from 'react';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
import LocalControls from './layout/LocalControls';
import './styles/App.css'

import type { pos } from './scripts/pos';
import type { pointUpdaterFunctions, selectedPoint } from './scripts/point';
import type { posPoint } from './scripts/posPoint';
import type { dataPoint } from './scripts/dataPoint';
import type { curve } from './scripts/curve';

const App = () => {
    // the dimensions of the editable canvas, as an (x,y) position
    const [resolution, setResolution] = useState<pos>({ x: 0, y: 0 });
    // a record of all existing points
    const [points, setPoints] = useState<Map<string, posPoint>>(new Map());
    // a record of all radius points on each curve
    const [radiusPoints, setRadiusPoints] = useState<Map<string, dataPoint>>(new Map());
    // a record of all existing curves
    const [curves, setCurves] = useState<Map<string, curve>>(new Map());
    // the point that is currently selected
    const [selectedPoint, setSelectedPoint] = useState<selectedPoint|null>(null);

    // effect updates states to temporary mock starting data
    useEffect(() => {
        setResolution({ x: 1024, y: 1024 });
        setPoints(new Map([
            ['0', {
                anchorPos:  { x: 50,  y: 50  },
                controlPos: {
                    direction: { x: 0.707, y: 0.707 },
                    beforeLength: 50,
                    afterLength: 50,
                },
            }],
            ['1', {
                anchorPos:  { x: 600, y: 300 },
                controlPos: {
                    direction: { x: 0, y: -1 },
                    beforeLength: 100,
                    afterLength: 100,
                },
            }],
        ]));
        setCurves(new Map([
            ['0', [
                { id: '0', t: 0.5 },
                { id: '1', t: 0.5 },
            ]],
        ]));

    }, []);

    /**
     * function applies updates to states dictated by return value of updater function
     * @param data the updater functions returned after calling an updater
     */
    const handleUpdateState = (data: pointUpdaterFunctions|undefined) => {
        // if updater functions undefined, skip
        if (data === undefined) { return; }

        // apply updates to states
        if (data.updatePosPoints !== undefined) {
            setPoints(data.updatePosPoints);
        }
        if (data.updateRadiusPoints !== undefined) {
            setRadiusPoints(data.updateRadiusPoints);
        }
        if (data.updateCurves !== undefined) {
            setCurves(data.updateCurves);
        }
        if (data.newSelectedPoint !== undefined) {
            setSelectedPoint(data.newSelectedPoint);
        }
    }

    return (<>
        <Main
            resolution={resolution}
            posPoints={points}
            curves={curves}
            selectedPoint={selectedPoint}
            onUpdateState={handleUpdateState}
        />
        <Sidebar direction="right" zIndex={1}>
            <LocalControls
                posPoints={points}
                radiusPoints={radiusPoints}
                curves={curves}
                selectedPoint={selectedPoint}
                onUpdateState={handleUpdateState}
            />
        </Sidebar>
        <Sidebar direction="bottom" zIndex={2}></Sidebar>
    </>);
}

export default App;
