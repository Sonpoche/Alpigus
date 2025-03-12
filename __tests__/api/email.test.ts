// __tests__/api/email.test.ts
import { POST } from '@/app/api/email/route'
import resend from '@/lib/resend'
import { NextResponse } from 'next/server'
import { CreateEmailResponse } from 'resend'

jest.mock('@/lib/resend', () => ({
  __esModule: true,
  default: {
    emails: {
      send: jest.fn()
    }
  }
}))

describe('Email API Route', () => {
  test('devrait envoyer un email avec succès', async () => {
    const mockResponse: CreateEmailResponse = {
      data: { id: 'email_id' },
      error: null
    }

    jest.spyOn(resend.emails, 'send').mockResolvedValue(mockResponse)

    const response = await POST()
    const data = await response.json()

    expect(response).toBeInstanceOf(NextResponse)
    expect(data).toEqual(mockResponse)
  })

  test('devrait gérer les erreurs', async () => {
    const mockError = new Error('Erreur d\'envoi d\'email')
    jest.spyOn(resend.emails, 'send').mockRejectedValue(mockError)

    const response = await POST()
    const data = await response.json()

    expect(response).toBeInstanceOf(NextResponse)
    expect(data).toHaveProperty('error')
  })
})