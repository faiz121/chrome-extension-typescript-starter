import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Upload, Check, Layers } from 'lucide-react';

const MAX_FILES = 5;
const MAX_TABS = 5;

// Custom Popover Component
const Popover = ({ children, content, isOpen, onOpenChange }) => {
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // if (popoverRef.current && 
      //     !popoverRef.current.contains(event.target) &&
      //     !triggerRef.current.contains(event.target)) {
      //   onOpenChange(false);
      // }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    onOpenChange(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] mx-auto left-1/2 transform -translate-x-1/2 bottom-16 w-80 bg-gray-100 shadow-lg rounded-2xl border border-gray-300"
        >
          {content}
        </div>
      )}
    </div>
  );
};

// FileItem component remains the same
const FileItem = ({ file, onDelete, checked, onCheckChange, onRemoveFile }) => {
  let extensionBgColor = 'bg-gray-300';
  let extensionTextColor = 'text-gray-700';

  if (file.extension === 'pdf') {
    extensionBgColor = 'bg-red-100';
    extensionTextColor = 'text-red-500';
  } else if (file.extension === 'docx' || file.extension === 'doc') {
    extensionBgColor = 'bg-blue-100';
    extensionTextColor = 'text-blue-500';
  } else if (file.extension === 'xlsx') {
    extensionBgColor = 'bg-green-100';
    extensionTextColor = 'text-green-500';
  } else if (file.extension === 'txt') {
    extensionBgColor = 'bg-gray-200';
    extensionTextColor = 'text-gray-600';
  }

  return (
    <div className="relative flex items-center px-2 py-2 rounded-full bg-gray-100">
      <input
        type="checkbox"
        checked={checked}
        disabled={file.status === 'uploading'}
        onChange={(e) => onCheckChange(file.name, e.target.checked)}
        className="mr-2 h-4 w-4"
      />
      <span className={`px-2 py-1 rounded-l-full uppercase text-xs font-semibold ${extensionBgColor} ${extensionTextColor}`}>
        {file.extension}
      </span>
      <span className="text-sm flex-grow truncate max-w-[200px] px-2 py-1 bg-gray-100 rounded-r-full">
        {file.name}
      </span>
      {file.status === 'uploading' ? (
        <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemoveFile()
          }}
          className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Remove file"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      )}
    </div>
  );
};


const FilesTab = ({ files, uploadingFiles, handleFileUpload, onDeleteFile, checkedFiles, onFileCheck, onRemoveFile }) => {
  const fileInputRef = useRef(null);
  const totalFiles = files.length + uploadingFiles.length;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 flex flex-col" style={{ height: '350px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files, fileInputRef)}
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.csv,.xlsx"
      />
      
      <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 overflow-hidden">
        {totalFiles === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-1">No files uploaded</p>
            <p className="text-xs text-gray-400 mb-4">Upload PDF, Word, Excel, or CSV files to include in the context</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="space-y-2">
              {files.map((file, index) => (
                <FileItem
                  key={file.name}
                  file={file}
                  onDelete={onDeleteFile}
                  checked={checkedFiles.includes(file.name)}
                  onCheckChange={onFileCheck}
                  onRemoveFile={() => onRemoveFile(index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center">
        <button
          onClick={handleUploadClick}
          disabled={totalFiles >= MAX_FILES}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          Upload Files
        </button>
        {totalFiles >= MAX_FILES && (
          <p className="text-xs text-red-500 mt-2">Maximum {MAX_FILES} files allowed</p>
        )}
      </div>
    </div>
  );
};
// TabsTab component remains the same
const TabsTab = ({ allTabs, selectedTabs, onTabSelect, handleTabsSubmit, error, currentTab }) => {
  const [selectAll, setSelectAll] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(new Set());
  const [completedTabs, setCompletedTabs] = useState(new Set());

  // const handleSelectAll = () => {
  //   const newSelectAll = !selectAll;
  //   setSelectAll(newSelectAll);

  //   if (newSelectAll) {
  //     const tabsToSelect = allTabs.slice(0, MAX_TABS);
  //     onTabSelect(tabsToSelect.map(tab => ({ id: tab.id, processed: false }))
  //   );
  //   } else {
  //     onTabSelect([]);
  //   }
  // };

  const handleTabSelect = async (tabId) => {
    if (selectedTabs.some(selectedTab => selectedTab.id === tabId)) {
      onTabSelect(selectedTabs.filter(selectedTab => selectedTab.id !== tabId));
    } else if (selectedTabs.length < MAX_TABS) {
      try {
      setLoadingTabs(prev => new Set([...prev, tabId]));
      onTabSelect([...selectedTabs, {
        id: tabId,
        processed: false
      }]);
      await handleTabsSubmit(tabId);
      setCompletedTabs(prev => new Set([...prev, tabId]));
    } finally {
      setLoadingTabs(prev => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
      setTimeout(() => {
        setCompletedTabs(prev => {
          const next = new Set(prev);
          next.delete(tabId);
          return next;
        });
      }, 1000);
    }
  }
}

  return (
    <div className="p-4 flex flex-col" style={{ height: '350px' }}>
      {/* <div className="flex items-center mb-4">
        <button
          onClick={handleSelectAll}
          disabled={isProcessing}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          Select All
        </button>
      </div> */}
      
      {/* <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 overflow-hidden"> */}
        <div className="h-full overflow-y-auto">
          <div className="space-y-2">
            {allTabs.map((tab) => (
              <div key={tab.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTabs.some(selectedTab => selectedTab.id === tab.id)}
                  onChange={() => {handleTabSelect(tab.id)}}
                  disabled={loadingTabs.length > 0 || (!selectedTabs.some(selectedTab => selectedTab.id === tab.id) && selectedTabs.length >= MAX_TABS)}
                  className="h-4 w-4 accent-blue-500 shrink-0"
                />
                <img src={tab.favIconUrl} alt="" className="h-6 w-6 rounded" />
                <span className="text-sm truncate flex-1">{tab.id === currentTab.id ? `Current Tab` : tab.title}</span>
                {loadingTabs.has(tab.id) && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2" />
                )}
                {completedTabs.has(tab.id) && (
                  <Check className="w-4 h-4 text-green-500 ml-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      {/* </div> */}

      <div className="flex flex-col items-center">
        {selectedTabs.length >= MAX_TABS && (
          <p className="text-xs text-red-500 mb-2">Maximum {MAX_TABS} tabs allowed</p>
        )}
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
      </div>
    </div>
  );
};


// Content Selector Panel
const ContextSelectorPanel = ({ onClose, isContextEnabled, checkedFiles, setCheckedFiles, selectedTabs, setSelectedTabs, files, setFiles, currentTab, onRemoveFile, setIsProcessing }) => {
  const [activeTab, setActiveTab] = useState('files');
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [allTabs, setAllTabs] = useState([]);
  // const [isProcessing, setIsProcessing] = useState(false);
  const isProcessing = false
  const [error, setError] = useState('');

  // Reset checked items when context is disabled
  // useEffect(() => {
  //   if (!isContextEnabled) {
  //     setCheckedFiles([]);
  //     setSelectedTabs([]);
  //   }
  // }, [isContextEnabled]);

  const handleFileCheck = (fileName, isChecked) => {
    setCheckedFiles(prev => {
      if (isChecked) {
        return [...prev, fileName];
      } else {
        return prev.filter(name => name !== fileName);
      }
    });
  };

  useEffect(() => {
    // Get current tabs from chrome.tabs API
    if (chrome?.tabs) {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        // Move current to the top of the list
        const allTabExceptCurrent = tabs.filter(tab => tab.id !== currentTab.id);
        setAllTabs([currentTab, ...allTabExceptCurrent]);
      });
    }
  }, []);

  const handleFileUpload = async (fileList, fileInputRef) => {
    const newFiles = Array.from(fileList);
    const currentTotalFiles = files.length + uploadingFiles.length;
    const wouldExceedLimit = currentTotalFiles + newFiles.length > MAX_FILES;

    try {
      if (wouldExceedLimit) {
        const remainingSlots = MAX_FILES - currentTotalFiles;
        throw new Error(`Can only upload ${remainingSlots} more file${remainingSlots === 1 ? '' : 's'}. Maximum ${MAX_FILES} files allowed.`);
      }

      // Add files to uploading state first
      const filesWithStatus = newFiles.map((file) => ({
        file,
        name: file.name,
        status: 'uploading',
        progress: 0,
        type: file.type,
        size: file.size,
        extension: file.name.split('.').pop().toLowerCase(),
        uploadStartTime: Date.now()
      }));

      setFiles((prev) => [...filesWithStatus, ...prev]);

      // Process each file
      for (const fileData of filesWithStatus) {
        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 20) {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === fileData.name ? { ...f, progress } : f
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          const response = await simulateFileUpload(fileData.file, 'username');

          if (response.success) {
            // Move from uploading to completed state
            setFiles((prevFiles) => 
              prevFiles.map((f) => 
                f.name === fileData.name 
                  ? {
                      ...f,
                      status: 'completed',
                      progress: 100,
                      uploadEndTime: Date.now(),
                      uploadDuration: Date.now() - fileData.uploadStartTime
                    }
                  : f
              )
            );

            // Remove from uploading state
            // setFiles((prev) =>
            //   prev.filter((f) => f.name !== fileData.name)
            // );
            setCheckedFiles((prev) => [...prev, fileData.name]);
          }
        } catch (error) {
          console.error(`Error uploading ${fileData.name}:`, error);
            setFiles((prev) =>
              prev.filter((f) => f.name !== fileData.name)
            );
          alert(`Failed to upload ${fileData.name}: ${error.message}`);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error processing files:', error);
      alert(error.message);
    }
  };

  const handleDeleteFile = (fileName) => {
    setFiles(files.filter(file => file.name !== fileName));
    // setUploadingFiles(uploadingFiles.filter(file => file.name !== fileName));
  };

  const handleTabsSubmit = async (tabId) => {
    if (selectedTabs.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'ingestSelectedTabsContent',
            tabId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to process tabs');
      }
    } catch (err) {
      setError(err.message);
      setSelectedTabs(prev => prev.filter(tab => tab.id !== tabId));
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-medium">Select Context</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      <div className="border-b">
        <div className="flex">
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'files'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-500 border-transparent'
            }`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('files')}}
          >
            Files ({checkedFiles.length})
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'tabs'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-500 border-transparent'
            }`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActiveTab('tabs')
            }}
          >
            Tabs ({selectedTabs.length})
          </button>
        </div>
      </div>

      {activeTab === 'files' ? (
        <FilesTab
          files={files}
          uploadingFiles={uploadingFiles}
          handleFileUpload={handleFileUpload}
          onDeleteFile={handleDeleteFile}
          checkedFiles={checkedFiles}
          onFileCheck={handleFileCheck}
          onRemoveFile={onRemoveFile}
        />
      ) : (
        <TabsTab
          allTabs={allTabs}
          selectedTabs={selectedTabs}
          onTabSelect={setSelectedTabs}
          isProcessing={isProcessing}
          error={error}
          currentTab={currentTab}
          handleTabsSubmit={handleTabsSubmit}
          setIsProcessing={setIsProcessing}
        />
      )}

      <div className="p-4 border-t">
        <button
          onClick={onClose}
          disabled={isProcessing || (activeTab === 'tabs' && selectedTabs.length === 0)}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Processing...
            </>
          ) : (
            'Done'
          )}
        </button>
      </div>
    </div>
  );
};

const simulateFileUpload = (file, username) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = function () {
      // For binary files (PDF, DOC, etc), we want the raw base64 data
      // For text files (CSV), we might want to handle them differently
      let fileData;
      let fileFormat;

      // Determine file format from extension
      const extension = file.name.split('.').pop().toLowerCase();

      // For text-based files like CSV
      if (extension === 'csv') {
        // Use readAsText instead for CSV files
        reader.readAsText(file);
        fileFormat = 'text';
      } else {
        // For binary files (PDF, DOC, DOCX, XLSX)
        fileFormat = 'binary';
        // The base64 data is already set in reader.result
      }

      fileData = reader.result.split(',')[1]; // Get base64 portion

      chrome.runtime.sendMessage(
        {
          action: 'uploadFile',
          username,
          fileName: file.name,
          fileType: file.type,
          fileFormat: fileFormat,
          fileSize: file.size,
          fileData: fileData,
          extension: extension
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        }
      );
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    // Use readAsDataURL for binary files by default
    reader.readAsDataURL(file);
  });
};

// Main ContextSelector component
const ContextSelector = ({ currentTab, isContextEnabled, checkedFiles, setCheckedFiles, selectedTabs, setSelectedTabs, files, setFiles, onRemoveFile, setIsProcessing, isContextSearchActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalContext = checkedFiles.length + selectedTabs.length;
  
  return (
    <Popover 
      isOpen={isOpen} 
      onOpenChange={setIsOpen}
      content={
        <ContextSelectorPanel 
          onClose={() => setIsOpen(false)} 
          isContextEnabled={isContextEnabled}
          checkedFiles={checkedFiles}
          setCheckedFiles={setCheckedFiles}
          selectedTabs={selectedTabs}
          setSelectedTabs={setSelectedTabs}
          files={files}
          setFiles={setFiles}
          currentTab={currentTab}
          onRemoveFile={onRemoveFile}
          setIsProcessing={setIsProcessing}
        />
      }
    >
<button 
  className={`relative p-2 rounded-lg ${
    !isContextSearchActive 
      ? 'opacity-50 cursor-not-allowed pointer-events-none' 
      : 'hover:bg-gray-100'
  }`} 
  disabled={!isContextSearchActive}
>
  <Layers className={`w-5 h-5 ${
    (checkedFiles.length > 0 || selectedTabs.length > 0) 
      ? 'text-blue-500' 
      : 'text-gray-600'
  }`} />
  {totalContext > 0 && (
    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
      {totalContext}
    </span>
  )}
</button>
    </Popover>
  );
};

export default ContextSelector;