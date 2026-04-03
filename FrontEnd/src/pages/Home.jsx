import React from 'react'

export default function Home() {
   
  const recentDocs = [
    { id: 1, title: 'Project Alpha Requirements', updated: '10 mins ago', author: 'Alice' },
    { id: 2, title: 'Q3 Marketing Plan', updated: '2 hours ago', author: 'Bob' },
    { id: 3, title: 'API Endpoints Draft', updated: 'Yesterday', author: 'You' },
    { id: 4, title: 'Weekly Sync Notes', updated: '2 days ago', author: 'Charlie' },
  ];

  const tasks = [
    { id: 1, text: 'Review Anthropic AI integration', status: 'In Progress' },
    { id: 2, text: 'Update Prisma schema for new models', status: 'Pending' },
    { id: 3, text: 'Fix Yjs WebSocket sync issue', status: 'Done' },
  ];

  const members = [
    { id: 1, name: 'Alice (Admin)', initials: 'A', status: 'online' },
    { id: 2, name: 'Bob (Editor)', initials: 'B', status: 'online' },
    { id: 3, name: 'Charlie (Viewer)', initials: 'C', status: 'offline' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      
      {/* Sidebar: Workspace Overview & Members */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">CollabLearn AI</h1>
          <p className="text-sm text-gray-500 mt-1">Main Workspace</p>
        </div>

        <div className="p-6 flex-1">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Workspace Members
          </h2>
          <ul className="space-y-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {member.initials}
                  </div>
                  <span 
                    className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                      member.status === 'online' ? 'bg-green-400' : 'bg-gray-300'
                    }`} 
                  />
                </div>
                <span className="text-sm font-medium">{member.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Good evening!</h2>
            <p className="text-gray-500">Here's what's happening in your workspace.</p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            + New Document
          </button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Documents Grid (Takes up 2 columns on large screens) */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold border-b-2 border-indigo-500 pb-1 inline-block">
                Recent Documents
              </h3>
              <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">View all</a>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                      {/* Document Icon Placeholder */}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1 truncate">{doc.title}</h4>
                  <p className="text-xs text-gray-500">
                    Updated {doc.updated} • By {doc.author}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Section (Takes up 1 column) */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">My Tasks</h3>
            <ul className="space-y-4">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-start">
                  <input 
                    type="checkbox" 
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                    defaultChecked={task.status === 'Done'}
                  />
                  <div className="ml-3">
                    <p className={`text-sm ${task.status === 'Done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {task.text}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      task.status === 'Done' ? 'bg-green-100 text-green-700' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}
