import { useState } from 'react'
import { mediaUrl } from '../api'
import { ANIME_POSTER_PLACEHOLDER } from '../constants/placeholders'

export default function AnimePoster({
  cover,
  alt = '',
  className = '',
  imgClassName = 'h-full w-full object-cover object-center',
}) {
  const [failed, setFailed] = useState(false)
  const src = cover && !failed ? mediaUrl(cover) : ANIME_POSTER_PLACEHOLDER

  return (
    <div className={`relative overflow-hidden bg-[#141820] ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover object-center ${imgClassName}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
