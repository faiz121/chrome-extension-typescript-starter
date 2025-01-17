import React from 'react';
import { X } from 'lucide-react';

const FileUpload = ({ files, onRemoveFile }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {files.map((file, index) => (
        <div 
          key={file.name + index}
          className="flex items-center px-4 py-2 rounded-full bg-white border border-gray-200"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0" />
          <span className="text-sm flex-grow truncate max-w-[200px]">
            {file.name}
          </span>
          <button
            onClick={() => onRemoveFile(index)}
            className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          {file.status === 'uploading' && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-full">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FileUpload;