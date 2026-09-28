import { useEffect, useRef, useState } from 'react'

export default function AutocompleteInput({ label, value, onChange, suggestions, placeholder }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const ref = useRef(null)
  const normalized = value.trim().toLocaleLowerCase('fr')
  const matches = suggestions.filter((item) => item.toLocaleLowerCase('fr').includes(normalized)).slice(0, 8)
  useEffect(() => { const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])
  const choose = (item) => { onChange(item); setOpen(false); setActive(-1) }
  function keyDown(event) { if (event.key === 'Escape') { setOpen(false); return } if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)) } if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)) } if (event.key === 'Enter' && open && active >= 0) { event.preventDefault(); choose(matches[active]) } }
  return <label className="autocomplete-input" ref={ref}>{label}<input value={value} placeholder={placeholder} role="combobox" aria-expanded={open} aria-autocomplete="list" onFocus={() => setOpen(true)} onKeyDown={keyDown} onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1) }} />{open && matches.length > 0 && <ul role="listbox">{matches.map((item, index) => <li key={item} role="option" aria-selected={active === index}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>{item}</button></li>)}</ul>}</label>
}
