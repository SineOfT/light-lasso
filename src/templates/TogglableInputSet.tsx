import React from 'react';
import '../styles/Input.css';

import type { ChangeEvent } from 'react';

/** component defines container to set of inputs that can be toggled between editable and hidden */
const TogglableInputSet = ({
    title,
    id,
    isToggled,
    onUpdateToggled,
    children,
}: {
    /** title of the set of inputs */
    title: string,
    /** unique ID to identify this input set; can be same ID as children */
    id: string,
    /** whether or not the children of this component are editable */
    isToggled: boolean,
    /** function updates whether the input set is toggled or not */
    onUpdateToggled: (isToggled: boolean) => void,
    children: React.ReactNode,
}) => {
    /**
     * function handles changing whether the input set is currently toggled or not, from switch input
     * @param e event provided by event listener
     */
    const handleChangeToggled = (e: ChangeEvent<HTMLInputElement>) => {
        const isToggled = e.target.checked;
        onUpdateToggled(isToggled);
    }

    // determine IDs for inputs
    const toggleSwitchId = `${id}-switch`;

    return (
        <fieldset className="input-set">
            <legend>
                <div className="flex-row">
                    {title}
                    <div className="form-switch">
                        <input type="checkbox" role="switch" id={toggleSwitchId} className="form-check-input"
                            checked={isToggled} onChange={handleChangeToggled}
                        />
                        <label htmlFor={toggleSwitchId} className="form-check-label">
                            {isToggled ? '' : 'None'}
                        </label>
                    </div>
                </div>
            </legend>
            {isToggled && children}
        </fieldset>
    );
}

export default TogglableInputSet;