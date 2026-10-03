import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/notificationService', () => ({
  archiveAllNotifications: vi.fn(), archiveNotification: vi.fn(), createNextActionNotification: vi.fn(), deleteNotification: vi.fn(), getNotifications: vi.fn(), markAllNotificationsRead: vi.fn(), setNotificationRead: vi.fn(),
}))
vi.mock('../services/applicationService', () => ({ getApplications: vi.fn() }))

import { getApplications } from '../services/applicationService'
import { archiveNotification, createNextActionNotification, deleteNotification, getNotifications, markAllNotificationsRead, setNotificationRead } from '../services/notificationService'
import NotificationsPage from './NotificationsPage'

const notice = { id_notification: 'n-1', id_application: 'a-1', type: 'no_response', title: 'Une relance est possible', body: 'Aucune réponse de CloudNova depuis 8 jours.', scheduled_for: '2026-10-02T10:00:00Z', is_read: false }
const renderPage = () => render(<MemoryRouter><NotificationsPage /></MemoryRouter>)

describe('NotificationsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); getNotifications.mockResolvedValue({ notifications: [notice], unreadCount: 1 }); getApplications.mockResolvedValue({ applications: [{ id_application: 'a-1', company_name: 'CloudNova', job_title: 'Product Designer', status: 'Candidature envoyée' }] }); createNextActionNotification.mockResolvedValue({ notification: {} }) })
  afterEach(cleanup)

  it('renders the empty state when the user has no reminders', async () => {
    getNotifications.mockResolvedValueOnce({ notifications: [], unreadCount: 0 })
    renderPage()
    expect(await screen.findByText('Vous êtes à jour')).toBeTruthy()
  })

  it('shows owned application reminders with a link and marks an item read', async () => {
    renderPage()
    expect(await screen.findByText('Une relance est possible')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ouvrir la candidature' }).getAttribute('href')).toBe('/candidatures/a-1')
    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme lu' }))
    await waitFor(() => expect(setNotificationRead).toHaveBeenCalledWith('n-1', true))
  })

  it('supports archiving and deletion from the notification center', async () => {
    renderPage()
    await screen.findByText('Une relance est possible')
    fireEvent.click(screen.getByRole('button', { name: 'Archiver la notification' }))
    await waitFor(() => expect(archiveNotification).toHaveBeenCalledWith('n-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la notification' }))
    await waitFor(() => expect(deleteNotification).toHaveBeenCalledWith('n-1'))
  })

  it('offers a bulk mark-read action for unread items', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Tout marquer comme lu' }))
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledOnce())
  })

  it('lets the user schedule a next action against an existing application', async () => {
    renderPage()
    await screen.findByText('Une relance est possible')
    fireEvent.click(screen.getByText('Programmer une prochaine action'))
    fireEvent.change(screen.getByLabelText('Candidature'), { target: { value: 'a-1' } })
    fireEvent.change(screen.getByLabelText('Action à ne pas oublier'), { target: { value: 'Relire mes notes' } })
    fireEvent.change(screen.getByLabelText('Date et heure'), { target: { value: '2027-01-01T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Programmer le rappel' }))
    await waitFor(() => expect(createNextActionNotification).toHaveBeenCalledWith(expect.objectContaining({ id_application: 'a-1', title: 'Relire mes notes' })))
  })
})
