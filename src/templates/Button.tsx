import type { MouseEvent } from "react";
import '../styles/Input.css';

/**
 * component defines button that conducts action when clicked
 */
const Button = ({
    title,
    disabled,
    onClick
}: {
    /** title displayed inside the button */
    title: string,
    /** whether the button can be clicked or not */
    disabled?: boolean,
    /** function run when button clicked */
    onClick: (e: MouseEvent<HTMLButtonElement>) => void,
}) => {
    return (
        <button type="button" className="button-input" disabled={disabled} onClick={onClick}>
            {title}
        </button>
    );
}

export default Button;