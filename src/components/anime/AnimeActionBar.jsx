import { useNavigate } from 'react-router-dom'
import FavoriteStarButton from '../FavoriteStarButton'
import ListStatusButton from '../ListStatusButton'
import WatchQueueButton from '../WatchQueueButton'
import ShareMenu from '../watch/ShareMenu'
import { actionBtnPrimary, actionBtnSecondary } from '../../constants/ui'
import { animeDetailPath } from '../../utils/animeNav'

export default function AnimeActionBar({
  anime,
  onWatch,
  showWatch = true,
  showDetails = true,
  showFavorite = true,
  showList = true,
  showQueue = true,
  showShare = false,
  shareUrl,
  shareLinkOnly = false,
  watchLabel = 'Смотреть',
  watchStacked = false,
  watchDisabled = false,
  className = '',
}) {
  const navigate = useNavigate()
  if (!anime) return null

  const secondaryGroup = (
    <>
      {showFavorite && <FavoriteStarButton animeId={anime.id} />}
      {showList && (
        <ListStatusButton
          animeId={anime.id}
          animeTitle={anime.title}
          cover={anime.cover}
          variant="compact"
        />
      )}
      {showQueue && (
        <WatchQueueButton
          animeId={anime.id}
          animeTitle={anime.title}
          cover={anime.cover}
          variant="compact"
        />
      )}
      {showShare && shareUrl && <ShareMenu url={shareUrl} linkOnly={shareLinkOnly} />}
    </>
  )

  if (watchStacked && showWatch && onWatch) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => onWatch(anime)}
          disabled={watchDisabled}
          className={`${actionBtnPrimary} disabled:opacity-40`}
        >
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {watchLabel}
        </button>
        {secondaryGroup}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showWatch && onWatch && (
        <button type="button" onClick={() => onWatch(anime)} className={actionBtnPrimary}>
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {watchLabel}
        </button>
      )}
      {showDetails && (
        <button
          type="button"
          onClick={() => navigate(animeDetailPath(anime.id))}
          className={actionBtnSecondary}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Подробнее
        </button>
      )}
      {secondaryGroup}
    </div>
  )
}
