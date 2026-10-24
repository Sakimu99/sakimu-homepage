import { useEffect } from 'react'

type Meta = { title: string; description?: string }

/** 每个页面设置自己的标题与描述，离开时还原 */
export function usePageMeta({ title, description }: Meta) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    let meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? null

    if (description) {
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'description')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', description)
    }

    return () => {
      document.title = prevTitle
      if (prevDesc !== null && meta) meta.setAttribute('content', prevDesc)
    }
  }, [title, description])
}
