import { useState } from 'react';
import SliderNumberInput from '../templates/SliderNumberInput';
import InputSet from '../templates/InputSet';
import Button from '../templates/Button';
import '../templates/Input.css';

function LocalControls({
    points, curves, selectedPointId,
    onUpdatePoint, onUpdateSelected, onAddPoint,
}) {

    const handleUpdateRadius = (radius) => {
        onUpdatePoint(selectedPointId, { radius });
    }

    if (selectedPointId == null) {
        return <></>;
    }

    const radius = points[selectedPointId]?.radius;

    const curveObj = Object.entries(curves).find(([_, curve]) => curve.includes(selectedPointId));
    const curveId = curveObj?.[0];
    const curve = curveObj?.[1];
    const curvePointIndex = curve?.indexOf(selectedPointId) ?? -1;
    const pointBeforeId = curvePointIndex !== -1 && curvePointIndex > 0
        ? curve[curvePointIndex-1]
        : null;
    const pointAfterId  = curvePointIndex !== -1 && curvePointIndex < curve.length-1
        ? curve[curvePointIndex+1]
        : null;

    return (<>
        <SliderNumberInput title="Radius" value={radius}
            onUpdateValue={handleUpdateRadius}
        />
        <InputSet title="Traverse Points">
            <Button title="< Point Before" disabled={pointBeforeId == null}
                onClick={() => { onUpdateSelected(pointBeforeId); }}
            />
            <Button title="Point After >"  disabled={pointAfterId  == null}
                onClick={() => { onUpdateSelected(pointAfterId); }}
            />
        </InputSet>
        <InputSet title="Add Point">
            <Button title="+ Add Point Before"
                onClick={() => { onAddPoint(curveId, curvePointIndex); }}
            />
            <Button title="Add Point After +"
                onClick={() => { onAddPoint(curveId, curvePointIndex+1); }}
            />
        </InputSet>
    </>);
}

export default LocalControls;