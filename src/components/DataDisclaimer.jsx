import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DataDisclaimer = () => (
  <div className="bg-yellow-50 border-b border-yellow-200">
    <div className="flex items-center px-4 py-2 gap-2">
      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
      <p className="text-sm text-yellow-700">
        No confidential data
      </p>
    </div>
  </div>
);

export default DataDisclaimer;