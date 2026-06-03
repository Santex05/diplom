import { PAGE_CONTAINER } from '../constants/layout'

export default function PageContainer({ children, className = '' }) {
  return <div className={`${PAGE_CONTAINER} ${className}`.trim()}>{children}</div>
}
