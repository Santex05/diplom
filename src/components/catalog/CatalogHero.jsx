import { getCategoryMeta } from '../../constants/catalog'
import PageIntro from '../PageIntro'

function countLabel(n) {
  if (n === 1) return 'тайтл'
  if (n > 1 && n < 5) return 'тайтла'
  return 'тайтлов'
}

export default function CatalogHero({ categoryId, count, action }) {
  const meta = getCategoryMeta(categoryId)

  return (
    <PageIntro
      title={meta.title}
      subtitle={meta.subtitle}
      count={count}
      countLabel={count != null ? countLabel(count) : null}
      action={action}
    />
  )
}
