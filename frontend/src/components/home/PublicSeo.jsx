import { useEffect } from 'react'

export default function PublicSeo({ title, description }) {
  useEffect(() => {
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.append(meta) }
    meta.content = description
  }, [title, description])
  return null
}
