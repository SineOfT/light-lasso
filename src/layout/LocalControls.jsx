import { useState } from 'react';
import SliderNumberInput from '../templates/SliderNumberInput';
import '../templates/Input.css';

function LocalControls({ points, selectedPointId, onUpdatePoint }) {

    const handleUpdateRadius = (radius) => {
        onUpdatePoint(selectedPointId, { radius });
    }

    if (selectedPointId == null) {
        return <></>;
    }

    const radius = points[selectedPointId]?.radius;

    return (
        <SliderNumberInput title="Radius" id="radius" value={radius}
            onUpdateValue={handleUpdateRadius}
        />
    );
}

export default LocalControls;