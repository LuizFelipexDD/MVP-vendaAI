/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <div className="flex h-screen w-full bg-white text-gray-800 font-sans overflow-hidden">
      <Sidebar />
      <ChatWindow />
      <Toaster position="top-right" />
    </div>
  );
}
