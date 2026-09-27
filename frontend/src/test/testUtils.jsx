import { MemoryRouter } from 'react-router-dom'

export function withRouter(component, initialEntries = ['/']) {
  return <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>
}
