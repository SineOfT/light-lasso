import type { ChangeEvent } from 'react';

import type { pos } from '../scripts/pos';

/** component defines input that updates positions */
export const PosInput = ({
    id,
    pos,
    onUpdatePos,
}: {
    /** ID to uniquely identify input */
    id: string,
    /** current position of input */
    pos: pos,
    /** function updates position of current position, ignoring unset keys */
    onUpdatePos: (changedValues: { x?: number, y?: number }) => void,
}) => {
    /** function handles changing x value of position */
    const handleChangeX = (e: ChangeEvent<HTMLInputElement>) => {
        const newX = parseFloat(e.target.value);
        if (isNaN(newX)) { return; }
        onUpdatePos({ x: newX });
    }

    /** function handles changing y value of position */
    const handleChangeY = (e: ChangeEvent<HTMLInputElement>) => {
        const newY = parseFloat(e.target.value);
        if (isNaN(newY)) { return; }
        onUpdatePos({ y: newY });
    }

    // create IDs for each input
    const xInputId = `${id}-x-input`;
    const yInputId = `${id}-y-input`;

    return (<>
        <div className="number-input input-inline">
            <label htmlFor={xInputId}>X</label>
            <input type="number" id={xInputId} value={parseFloat(pos.x.toFixed(2))}
                onChange={handleChangeX}
            />
        </div>
        <div className="number-input input-inline">
            <label htmlFor={yInputId}>Y</label>
            <input type="number" id={yInputId} value={parseFloat(pos.y.toFixed(2))}
                onChange={handleChangeY}
            />
        </div>
    </>);
}

export default PosInput;