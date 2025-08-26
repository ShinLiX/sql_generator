import React from 'react';
import './Button.css';

export default function Button({
  children,
  type = "button",
  disabled = false,
  onClick,
  className = "",
  ...props
}) {
  const classes = ["btn", "btn--success", className].join(" ");
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}