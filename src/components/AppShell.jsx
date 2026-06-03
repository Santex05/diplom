import { QueueProvider } from '../context/QueueContext'
import { SearchProvider } from '../context/SearchContext'
import PlaybackQueueBar from './PlaybackQueueBar'
import SearchOverlay from './SearchOverlay'

export default function AppShell({ children }) {
  return (
    <SearchProvider>
      <QueueProvider>
        {children}
        <PlaybackQueueBar />
        <SearchOverlay />
      </QueueProvider>
    </SearchProvider>
  )
}
