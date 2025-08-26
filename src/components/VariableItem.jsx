import React from 'react';
import './VariableItem.css';
import { formatValueForInput } from '../utils/fileParser';
export default function VariableItem({ 
  name, 
  data, 
  currentValue,
  hasChanges,
  isUpdated, 
  onInputChange 
}) {
  const getInputType = () => {
    if (typeof data.value === 'boolean') return 'checkbox';
    if (data.value instanceof Date) return 'datetime-local';
    if (typeof data.value === 'number') return 'number';
    return 'text';
  };

  const getItemTypeClass = () => {
    if (typeof data.value === 'boolean') return 'variable-item--checkbox';
    if (data.value instanceof Date) return 'variable-item--date';
    if (typeof data.value === 'number') return 'variable-item--number';
    return 'variable-item--text';
  };

  const getDisplayValue = () => {
    // For datetime-local inputs, we need YYYY-MM-DDTHH:MM format (no seconds/milliseconds)
    return formatValueForInput(data.value, currentValue);
  };

  return (
    <div className={`variable-item ${getItemTypeClass()} ${isUpdated ? 'variable-item--updated' : ''} ${hasChanges ? 'variable-item--changed' : ''}`}>
      {/* Label above input */}
      <div className="variable-item__label-row">
        <label htmlFor={`var-${name}`} className="variable-item__label" title={name}>
          {name}
          {hasChanges && <span className="variable-item__changed-indicator">●</span>}
        </label>
        {isUpdated && (
          <div className="variable-item__status-inline">
            Updated
          </div>
        )}
      </div>
      
      {/* Input below label */}
      <div className="variable-item__input-row">
        {typeof data.value === 'boolean' ? (
          <div className="variable-item__checkbox-wrapper">
            <input
              id={`var-${name}`}
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) => onInputChange(name, e.target.checked)}
              className="variable-item__checkbox"
            />
            <span className="variable-item__checkbox-label">
              {Boolean(currentValue) ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        ) : (
          <input
            id={`var-${name}`}
            type={getInputType()}
            value={getDisplayValue()}
            onChange={(e) => onInputChange(name, e.target.value)}
            className="variable-item__input"
            placeholder={data.value instanceof Date ? "YYYY-MM-DDTHH:MM" : "Enter value..."}
          />
        )}
      </div>
      
      {/* Original value info at bottom */}
      <div className="variable-item__info">
        <div className="variable-item__original">
          <strong>Original:</strong> 
          <code>{data.originalLine.trim()}</code>
        </div>
      </div>
    </div>
  );
}