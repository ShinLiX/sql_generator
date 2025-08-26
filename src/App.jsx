import React, { useState, useEffect, useRef } from 'react';
import VariableEditor from './components/VariableEditor';
import Button from './components/Button';
import './App.css';

export default function App() {
  const [taskData, setTaskData] = useState('');
  const [fileName, setFileName] = useState('updated-task.sql');
  const [jobType, setJobType] = useState('');
  const [jobName, setJobName] = useState('');
  const [fileSetting, setFileSetting] = useState('');
  const [availableNames, setAvailableNames] = useState([]);
  const [filteredNames, setFilteredNames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTaskData, setIsLoadingTaskData] = useState(false);
  const [loadError, setLoadError] = useState('');
  const searchRef = useRef(null);

  const handleContentChange = (newContent) => setTaskData(newContent);

  useEffect(() => {
    const fetchTaskNames = async () => {
      if (!fileSetting) {
        setAvailableNames([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/names?filename=${fileSetting}`);
        if (response.ok) {
          const names = await response.json();
          setAvailableNames(names);
        } else {
          setAvailableNames([]);
        }
      } catch {
        setAvailableNames([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTaskNames();
  }, [fileSetting]);

  useEffect(() => {
    if (!jobName.trim()) {
      setFilteredNames([]);
      return;
    }
    const filtered = availableNames.filter(name =>
      name.toLowerCase().includes(jobName.toLowerCase())
    );
    setFilteredNames(filtered);
  }, [jobName, availableNames]);

  const handleJobTypeChange = (e) => {
    const selectedJobType = e.target.value;
    setJobType(selectedJobType);
    setJobName('');
    setTaskData('');
    setLoadError('');
    setShowSuggestions(false);
    let newFileSetting = '';
    switch (selectedJobType) {
      case 'Data Extract':
        newFileSetting = 'data_extract_settings.json';
        break;
      case 'Data Load':
        newFileSetting = 'data_load_settings.json';
        break;
      case 'File Delivery':
        newFileSetting = 'file_delivery_settings.json';
        break;
      default:
        newFileSetting = '';
        break;
    }
    setFileSetting(newFileSetting);
  };

  const handleJobNameChange = (e) => {
    const value = e.target.value;
    setJobName(value);
    setShowSuggestions(value.trim().length > 0);
    setLoadError('');
  };

  const handleSuggestionClick = (suggestion) => {
    setJobName(suggestion);
    setShowSuggestions(false);
    setLoadError('');
    if (searchRef.current) searchRef.current.focus();
  };

  const handleLoadTask = async () => {
    if (!jobName.trim() || !fileSetting) {
      setLoadError('Please enter a job name');
      return;
    }
    if (!availableNames.includes(jobName)) {
      setLoadError(`"${jobName}" is not a valid job name. Please select from the suggestions.`);
      return;
    }
    setIsLoadingTaskData(true);
    setLoadError('');
    try {
      const response = await fetch(`http://127.0.0.1:8000/${jobName}?filename=${fileSetting}`);
      if (response.ok) {
        const taskContent = await response.text();
        if (taskContent.trim()) {
          setTaskData(taskContent);
          setFileName(`${jobName}.sql`);
        } else {
          setLoadError(`No task data found for "${jobName}"`);
          setTaskData('');
        }
      } else {
        setLoadError(`Failed to load task data: ${response.statusText}`);
        setTaskData('');
      }
    } catch {
      setLoadError('Failed to connect to the server. Please check your connection.');
      setTaskData('');
    } finally {
      setIsLoadingTaskData(false);
    }
  };

  const handleInputFocus = () => {
    if (filteredNames.length > 0 && jobName.trim()) setShowSuggestions(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      searchRef.current?.blur();
    }
    if (e.key === 'Enter' && !showSuggestions) {
      handleLoadTask();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="job-bar">
          <select
            id="job-type"
            value={jobType}
            onChange={handleJobTypeChange}
            className="job-type-dropdown"
          >
            <option value="">-- Select Job Type --</option>
            <option value="Data Extract">Data Extract</option>
            <option value="Data Load">Data Load</option>
            <option value="File Delivery">File Delivery</option>
          </select>
          <div className="job-name-autocomplete">
            <input
              id="job-name"
              ref={searchRef}
              type="text"
              value={jobName}
              onChange={handleJobNameChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="job-name-input"
              placeholder={isLoading ? "Loading..." : "Enter job name..."}
              disabled={!fileSetting || isLoading}
            />
            {showSuggestions && filteredNames.length > 0 && (
              <div className="job-name-suggestions">
                {filteredNames.slice(0, 10).map((name, index) => (
                  <div
                    key={index}
                    className="job-name-suggestion"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(name);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleLoadTask}>
            {isLoadingTaskData ? 'Loading...' : 'Load Task'}
          </Button>
        </div>
        <div style={{ width: "100%" }}>
          {loadError && (
            <div className="job-name-hint" style={{ color: '#dc3545' }}>
              {loadError}
            </div>
          )}
        </div>
      </header>
      <main className="App-main">
        {taskData && taskData.trim().length > 0 && (
          <VariableEditor 
            fileContent={taskData} 
            onContentChange={handleContentChange}
          />
        )}
        {!jobType && (
          <div className="no-task-message">
            Please select a job type to get started
          </div>
        )}
        {jobType && !taskData && !isLoadingTaskData && (
          <div className="no-task-message">
            Select a job name and click "Load Task" to begin editing variables
          </div>
        )}
      </main>
    </div>
  );
}