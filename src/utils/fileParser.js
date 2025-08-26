const convertValue = (value) => {
  // Convert 1/0 to boolean
  if (value === 1 || value === "1") {
    return true;
  }
  if (value === 0 || value === "0") {
    return false;
  }
  
  // Convert ISO date strings to Date objects
  if (typeof value === 'string') {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    
    if (isoDateRegex.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return value;
};

const flattenObject = (obj, prefix = '') => {
  const flattened = {};
  
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      // Nested object - recurse
      Object.assign(flattened, flattenObject(value, fullKey));
    } else {
      // Primitive value - add to flattened object
      flattened[fullKey] = value;
    }
  });
  
  return flattened;
};

export const parseVariables = (fileContent) => {
  const variables = {};
  
  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(fileContent);
    const flattenedData = flattenObject(jsonData);
    
    // Handle single object only (since you're passing one selected object)
    Object.keys(flattenedData).forEach((key, index) => {
      const value = flattenedData[key];
      const convertedValue = convertValue(value); // Apply conversion
      
      variables[key] = {
        value: convertedValue,
        originalValue: value,
        lineIndex: index,
        originalLine: `"${key}": ${JSON.stringify(value)}`,
        comment: ''
      };
    });
    console.log('Parsed JSON variables:', variables);
    return variables;
    
  } catch (jsonError) {
    // Not JSON, try line-by-line parsing
    const lines = fileContent.split('\n');
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';') || trimmedLine.startsWith('//') || trimmedLine.startsWith('--')) {
        return;
      }
      
      const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(['"]?)([^'";\n#]*)\2\s*([;#].*)?$/);
      
      if (match) {
        const [, name, , value, comment] = match;
        const trimmedValue = value.trim();
        const convertedValue = convertValue(trimmedValue); // Apply conversion
        
        variables[name] = {
          value: convertedValue,
          originalValue: trimmedValue,
          lineIndex: index,
          originalLine: line,
          comment: comment || ''
        };
      }
    });
  }
  
  return variables;
};

export const convertDateToString = (dateValue) => {
  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }
  return dateValue; // Return as-is if not a Date
};

export const convertBooleanToNumber = (booleanValue) => {
  if (typeof booleanValue === 'boolean') {
    return booleanValue ? 1 : 0;
  }
  return booleanValue; // Return as-is if not a boolean
};

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

export const createLocalDateFromString = (datetimeString) => {
  if (typeof datetimeString !== 'string' || !datetimeString.trim()) {
    return null;
  }
  // Match YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS format
  const match = datetimeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  
  const [, year, month, day, hours, minutes, seconds = '0'] = match;
  
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // Month is 0-based
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
    parseInt(seconds, 10)
  );
}

export const formatValueForInput = (originalValue, currentValue) => {
  // Handle dates
  if (originalValue instanceof Date) {
    let dateToFormat = null;
    
    if (currentValue instanceof Date) {
      dateToFormat = currentValue;
    } else if (typeof currentValue === 'string' && currentValue) {
      // Try to parse user input as date
      const parsedDate = createLocalDateFromString(currentValue);
      if (parsedDate) {
        dateToFormat = parsedDate;
      } else {
        // If parsing failed, return the string as-is for user to edit
        return currentValue;
      }
    } else {
      // Use original date value
      dateToFormat = originalValue;
    }
    
    return formatDateForInput(dateToFormat);
  }
  
  // For all other types, convert to string
  return String(currentValue ?? '');
};