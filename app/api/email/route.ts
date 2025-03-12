// app/api/email/route.ts
import resend from '@/lib/resend';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const data = await resend.emails.send({
      from: 'Mushroom Marketplace <onboarding@resend.dev>',
      to: ['ragaignef@gmail.com'],
      subject: 'Test Email',
      html: '<p>Ceci est un email de test.</p>'
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}