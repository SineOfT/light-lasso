import React from 'react';
import '../styles/Input.css';

/**
 * component defines collection of related inputs
 */
const InputSet = ({
    title,
    children
}: {
    /** title of the set of inputs */
    title: string,
    children: React.ReactNode,
}) => {
    return (
        <fieldset className="input-set">
            <legend>{title}</legend>
            {children}
        </fieldset>
    );
}

export default InputSet;