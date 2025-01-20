import React, { useState } from 'react';
import { Cog } from 'lucide-react';

const SettingsPage = ({ onClose }) => {
    const [setting1, setSetting1] = useState('');
    const [setting2, setSetting2] = useState('');
    const [setting3, setSetting3] = useState('');
  
    const handleSubmit = (e) => {
        e.preventDefault();
        // Perform some action
      };

  return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-md shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Setting 1</label>
            <input type="text" value={setting1} onChange={e => setSetting1(e.target.value)} className="w-full p-2 border rounded-md"/>
          </div>
            <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Setting 2</label>
            <input type="text" value={setting2} onChange={e => setSetting2(e.target.value)} className="w-full p-2 border rounded-md"/>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Setting 3</label>
            <input type="text" value={setting3} onChange={e => setSetting3(e.target.value)} className="w-full p-2 border rounded-md"/>
          </div>
          <div className="flex justify-end">
           <button type="button" onClick={onClose} className="bg-gray-300 px-4 py-2 rounded-md mr-2">Cancel</button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">Save</button>
          </div>
        </form>
       
      </div>
    </div>
  );
};

export default SettingsPage;