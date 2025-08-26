import React, { useState, useEffect } from 'react';
import { parseVariables, convertDateToString, convertBooleanToNumber } from '../utils/fileParser';
import VariableItem from './VariableItem';
import Button from './Button';
import './VariableEditor.css';

export default function VariableEditor({ fileContent, onContentChange }) {
  const [variables, setVariables] = useState({});
  const [updatedFields, setUpdatedFields] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [hasUpdated, setHasUpdated] = useState(false); // Track if Update All has been called

  useEffect(() => {
    if (fileContent) {
      const parsed = parseVariables(fileContent);
      setVariables(parsed);
      
      // Initialize input values with original values
      const initialValues = {};
      Object.keys(parsed).forEach(key => {
        initialValues[key] = parsed[key].value;
      });
      setInputValues(initialValues);
      setUpdatedFields({});
      setHasUpdated(false); // Reset when new file is loaded
    }
  }, [fileContent]);

  const handleInputChange = (variableName, newValue) => {
    setInputValues(prev => ({
      ...prev,
      [variableName]: newValue
    }));
  };

  // Helper function to create Date object from datetime-local input preserving local time
  const createLocalDateFromString = (datetimeString) => {
    if (typeof datetimeString !== 'string') return null;
    
    // Handle both full datetime-local format and partial formats
    const match = datetimeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    
    const [, year, month, day, hours, minutes, seconds = '0'] = match;
    
    // Create date with explicit local time components (no timezone conversion)
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1, // months are 0-indexed
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10),

    );
  };

  // Helper function to convert Date to the original format: "2019-09-01T00:01:00"
  const formatDateForInput = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    
    // Convert to the same format as original: "2019-09-01T00:01:00"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Helper function to normalize values for comparison
  const normalizeValueForComparison = (value) => {
    if (value instanceof Date) {
      // Convert Date objects to the original string format
      return formatDateForInput(value);
    }
    
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/)) {
      // Ensure datetime strings have seconds
      if (value.length === 16) { // Format: "2019-09-01T00:01"
        return value + ':00';
      }
      return value; // Already in correct format: "2019-09-01T00:01:00"
    }
    
    return String(value);
  };

  // Get changes comparing inputValues with what's currently considered "original"
  const getAllChanges = () => {
    const changes = {};
    
    Object.keys(variables).forEach(variableName => {
      const currentValue = inputValues[variableName];
      
      // The "baseline" is either the updated value (if it was updated) or the original value
      const baselineValue = updatedFields[variableName] !== undefined 
        ? updatedFields[variableName] 
        : variables[variableName].value;
      
      // Normalize both values for proper comparison
      const normalizedCurrent = normalizeValueForComparison(currentValue);
      const normalizedBaseline = normalizeValueForComparison(baselineValue);
      
      console.log(`Comparing ${variableName}:`, {
        current: currentValue,
        baseline: baselineValue,
        normalizedCurrent,
        normalizedBaseline,
        hasChanged: normalizedCurrent !== normalizedBaseline
      });
      
      const hasChanged = normalizedCurrent !== normalizedBaseline;
      
      if (hasChanged) {
        // Convert the final value to appropriate type
        let finalValue = currentValue;
        
        if (variables[variableName].value instanceof Date && typeof currentValue === 'string' && currentValue) {
          const date = createLocalDateFromString(currentValue);
          if (date && !isNaN(date.getTime())) {
            console.log(`Converting datetime for ${variableName}:`, {
              input: currentValue,
              parsed: date,
              localTime: date.toLocaleString(),
              components: {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hours: date.getHours(),
                minutes: date.getMinutes()
              }
            });
            finalValue = date;
          }
        }
        
        changes[variableName] = finalValue;
      }
    });
    
    return changes;
  };

  const handleUpdateAll = () => {
    const changes = getAllChanges();
    
    if (Object.keys(changes).length === 0) {
      alert('No changes to update!');
      return;
    }
    
    // Create new updatedFields by processing all current input values
    const newUpdatedFields = { ...updatedFields };
    const updatedInputValues = { ...inputValues };
    
    // Add/update changed fields
    Object.keys(changes).forEach(key => {
      newUpdatedFields[key] = changes[key];
      // For datetime fields, keep the Date object in inputValues for proper display
      updatedInputValues[key] = changes[key];
    });
    
    // Check if any previously updated fields should be removed
    Object.keys(variables).forEach(variableName => {
      const currentValue = inputValues[variableName];
      const originalValue = variables[variableName].value;
      
      // Normalize both values for comparison with original
      const normalizedCurrent = normalizeValueForComparison(currentValue);
      const normalizedOriginal = normalizeValueForComparison(originalValue);
      
      // If current value matches original value, remove from updatedFields
      if (normalizedCurrent === normalizedOriginal && newUpdatedFields[variableName] !== undefined) {
        console.log(`Removing ${variableName} from updatedFields - reverted to original value`);
        delete newUpdatedFields[variableName];
      }
    });
    
    setUpdatedFields(newUpdatedFields);
    setInputValues(updatedInputValues);
    setHasUpdated(true); // Enable Generate SQL button
    
    console.log('Updated fields:', newUpdatedFields);
    console.log('DateTime details:', Object.keys(newUpdatedFields).reduce((acc, key) => {
      if (newUpdatedFields[key] instanceof Date) {
        const date = newUpdatedFields[key];
        acc[key] = {
          inputFormat: formatDateForInput(date),
          localDisplay: date.toLocaleString(),
          utcDisplay: date.toISOString(),
          rawComponents: {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hours: date.getHours(),
            minutes: date.getMinutes(),
            seconds: date.getSeconds()
          }
        };
      }
      return acc;
    }, {}));
    
    // Convert to original format for export
    const originalFormat = {};
    Object.keys(newUpdatedFields).forEach(key => {
      const value = newUpdatedFields[key];
      const originalValue = variables[key].originalValue;
      
      // Convert back to original format
      if ((originalValue === 0 || originalValue === 1) && typeof value === 'boolean') {
        originalFormat[key] = convertBooleanToNumber(value);
      } else if (typeof originalValue === 'string' && originalValue.match(/^\d{4}-\d{2}-\d{2}T/) && value instanceof Date) {
        originalFormat[key] = convertDateToString(value);
      } else {
        originalFormat[key] = value;
      }
    });
    
    console.log('Original format:', originalFormat);
  };

  const handleGenerateSQL = () => {
    console.log('Generate SQL button clicked!');
    console.log('Current updated fields:', updatedFields);
    
    // Add SQL generation logic here later
    if (Object.keys(updatedFields).length > 0) {
      console.log('Ready to generate SQL with updated fields:', Object.keys(updatedFields));
    } else {
      console.log('No updated fields to generate SQL from');
    }
  };

  // Only show "No Variables Found" if there's actually file content but no variables could be parsed
  if (fileContent && Object.keys(variables).length === 0) {
    return (
      <div className="variable-editor__no-variables">
        <h3>No Variables Found</h3>
        <p>
          No editable variables detected in the loaded task. Variables should follow the pattern: <br />
          <code>variableName = value</code>
        </p>
      </div>
    );
  }

  // If there's no file content, don't render anything 
  if (!fileContent) {
    return null;
  }

  const changedCount = Object.keys(getAllChanges()).length;

  return (
    <div className="variable-editor">
      <div className="variable-editor__header">
        <h3 className="variable-editor__title">
          Edit Variables ({Object.keys(variables).length} found)
          {Object.keys(updatedFields).length > 0 && (
            <span style={{ color: '#49796B', fontSize: '16px', marginLeft: '10px' }}>
              ({Object.keys(updatedFields).length} updated)
            </span>
          )}
        </h3>
        <div className="variable-editor__actions">
          <Button
            onClick={handleUpdateAll}
            disabled={changedCount === 0}
          >
            Update All {changedCount > 0 && `(${changedCount})`}
          </Button>
          <Button
            onClick={handleGenerateSQL}
            disabled={!hasUpdated || Object.keys(updatedFields).length === 0}
            title={hasUpdated && Object.keys(updatedFields).length > 0 ? "Generate SQL with updated fields" : "Update fields first to enable SQL generation"}
          >
            Generate SQL
          </Button>
        </div>
      </div>

      {/* Show updated fields summary */}
      {Object.keys(updatedFields).length > 0 && (
        <div className="variable-editor__summary">
          <strong>Updated Fields ({Object.keys(updatedFields).length}):</strong>
          <ul>
            {Object.entries(updatedFields).map(([key, value]) => (
              <li key={key}>
                <code>{key}</code>: {typeof value === 'object' && value instanceof Date ? 
                  `${formatDateForInput(value)} (${value.toLocaleString()})` : 
                  JSON.stringify(value)
                }
                <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>
                  ({typeof value})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="variable-editor__grid">
        {Object.entries(variables).map(([name, data]) => {
          const currentInputValue = inputValues[name] ?? data.value;
          
          // Check if changed from baseline using normalized comparison
          const baselineValue = updatedFields[name] !== undefined 
            ? updatedFields[name] 
            : data.value;
          
          const normalizedCurrent = normalizeValueForComparison(currentInputValue);
          const normalizedBaseline = normalizeValueForComparison(baselineValue);
          const hasChanges = normalizedCurrent !== normalizedBaseline;
          
          const isInUpdatedFields = updatedFields[name] !== undefined;
          
          return (
            <VariableItem
              key={name}
              name={name}
              data={data}
              currentValue={currentInputValue}
              hasChanges={hasChanges}
              isUpdated={isInUpdatedFields}
              onInputChange={handleInputChange}
              formatDateForInput={formatDateForInput}
            />
          );
        })}
      </div>
    </div>
  );
}