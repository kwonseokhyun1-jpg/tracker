import { useState } from 'react'
import { DataProvider } from './context/DataContext'
import { TabBar } from './components/TabBar'
import { DecksTab } from './components/DecksTab'
import { LogTab } from './components/LogTab'
import { StatsTab } from './components/StatsTab'
import { BackupButton } from './components/BackupButton'
import type { TabId } from './types'
import './styles/app.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('decks')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <h1>MTG Game Tracker</h1>
          <BackupButton />
        </div>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      <main className="app-main">
        {activeTab === 'decks' && <DecksTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'stats' && <StatsTab />}
      </main>
    </div>
  )
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App
