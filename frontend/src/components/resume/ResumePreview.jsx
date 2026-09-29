import { useEffect, useRef, useState } from 'react'
import TemplatePreview from './templates/TemplatePreview'

const A4_WIDTH = 594
export const A4_HEIGHT = 842

export function exceedsA4Height(paper) {
  if (!paper) return false
  return Math.max(paper.scrollHeight, paper.offsetHeight, paper.clientHeight) > A4_HEIGHT
}

export default function ResumePreview({ resume, onOverflowChange }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const updateScale = () => setScale(Math.min(1, Math.max(0.35, element.clientWidth / A4_WIDTH)))
    updateScale()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }
    const observer = new ResizeObserver(updateScale)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!onOverflowChange) return undefined
    const frame = requestAnimationFrame(() => onOverflowChange(exceedsA4Height(containerRef.current?.querySelector('.resume-preview-paper'))))
    return () => cancelAnimationFrame(frame)
  }, [resume, onOverflowChange])

  return <section className="resume-preview" aria-label="Aperçu du CV">
    <p className="resume-preview-label">Aperçu en direct</p>
    <div className="resume-preview-scale-container" ref={containerRef}>
      <div className="resume-preview-stage" style={{ '--preview-scale': scale }}>
        <TemplatePreview resume={resume} />
      </div>
    </div>
  </section>
}
