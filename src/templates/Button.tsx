import type { MouseEvent } from "react";
import '../styles/Input.css';

/**
 * component defines button that conducts action when clicked
 */
const Button = ({
    title,
    disabled,
    className,
    onClick
}: {
    /** title displayed inside the button */
    title: string,
    /** whether the button can be clicked or not */
    disabled?: boolean,
    /** the classes to add to the button */
    className?: string,
    /** function run when button clicked */
    onClick: (e: MouseEvent<HTMLButtonElement>) => void,
}) => {
    // add custom class to given class names
    const buttonClassName = `button-input ${className ?? ''}`;

    return (
        <button type="button" className={buttonClassName} disabled={disabled} onClick={onClick}>
            {title}
        </button>
    );
}

export default Button;