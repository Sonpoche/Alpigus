// app/api/orders/[id]/invoice/client/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withClientSecurity, validateData, commonSchemas } from "@/lib/api-security"
import { handleError, createError } from "@/lib/error-handler"
import { prisma } from '@/lib/prisma'
import { z } from "zod"

// Schéma de validation pour les paramètres d'URL
const paramsSchema = z.object({
  id: commonSchemas.id
})

// Fonction helper pour formater les nombres
function formatNumber(num: number): string {
  return num.toFixed(2)
}

export const GET = withClientSecurity(async (request: NextRequest, session) => {
  try {
    // 1. Extraction et validation de l'ID depuis l'URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const orderId = pathSegments[pathSegments.indexOf('orders') + 1]

    const { id } = validateData(paramsSchema, { id: orderId })

    console.log(`🧾 Génération facture client pour commande ${id} par user ${session.user.id}`)

    // 2. Récupération sécurisée avec vérification d'ownership stricte
    const order = await prisma.order.findUnique({
      where: { 
        id,
        userId: session.user.id // SÉCURITÉ CRITIQUE: seul le client peut voir sa facture
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                producer: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
        bookings: {
          include: {
            deliverySlot: {
              include: {
                product: {
                  include: {
                    producer: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        invoice: true
      }
    })

    if (!order) {
      console.warn(`⚠️ Tentative génération facture client non autorisée ${id} par user ${session.user.id}`)
      throw createError.notFound('Commande non trouvée ou non autorisée')
    }

    // 3. Parsing sécurisé des métadonnées de livraison
    let deliveryInfo = null
    if (order.metadata) {
      try {
        const metadata = JSON.parse(order.metadata)
        deliveryInfo = {
          type: metadata.deliveryType || metadata.type || 'pickup',
          fullName: metadata.deliveryInfo?.fullName || metadata.fullName,
          company: metadata.deliveryInfo?.company || metadata.company,
          address: metadata.deliveryInfo?.address || metadata.address,
          postalCode: metadata.deliveryInfo?.postalCode || metadata.postalCode,
          city: metadata.deliveryInfo?.city || metadata.city,
          phone: metadata.deliveryInfo?.phone || metadata.phone,
          paymentMethod: metadata.paymentMethod
        }
      } catch (e) {
        console.error('Erreur parsing metadata facture client:', e)
      }
    }

    // 4. Calculs sécurisés des totaux
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const bookingsTotal = order.bookings.reduce((sum, booking) => {
      const price = booking.price ?? booking.deliverySlot.product.price
      return sum + (price * booking.quantity)
    }, 0)
    
    const subtotal = itemsTotal + bookingsTotal
    const deliveryFee = deliveryInfo?.type === 'delivery' ? 15 : 0
    const totalWithDelivery = subtotal + deliveryFee

    // 5. Détermination sécurisée du statut de paiement
    const invoiceNumber = order.invoice 
      ? `FACT-${order.invoice.id.substring(0, 8).toUpperCase()}`
      : `CMD-${order.id.substring(0, 8).toUpperCase()}`
    const invoiceDate = order.createdAt.toLocaleDateString('fr-FR')
    
    // Vérification multi-source du statut de paiement
    let isPaid = false
    let paidAt = null
    let paymentMethod = null
    
    // 1. Vérifier dans la facture (si elle existe)
    if (order.invoice) {
      isPaid = order.invoice.status === 'PAID'
      paidAt = order.invoice.paidAt ? new Date(order.invoice.paidAt).toLocaleDateString('fr-FR') : null
      paymentMethod = order.invoice.paymentMethod
    }
    
    // 2. Vérifier dans les métadonnées de la commande
    if (!isPaid && order.metadata) {
      try {
        const metadata = JSON.parse(order.metadata)
        isPaid = metadata.paymentStatus === 'PAID' || metadata.paymentStatus === 'INVOICE_PAID'
        if (isPaid && metadata.paidAt) {
          paidAt = new Date(metadata.paidAt).toLocaleDateString('fr-FR')
        }
        if (!paymentMethod) {
          paymentMethod = metadata.paymentMethod
        }
      } catch (e) {
        // Ignore l'erreur de parsing
      }
    }
    
    // 3. Vérifier le statut de la commande (fallback)
    if (!isPaid) {
      isPaid = order.status === 'INVOICE_PAID'
    }
    
    // Si pas de méthode de paiement trouvée, utiliser celle des métadonnées de livraison
    if (!paymentMethod && deliveryInfo?.paymentMethod) {
      paymentMethod = deliveryInfo.paymentMethod
    }
    
    const dueDate = order.invoice?.dueDate ? new Date(order.invoice.dueDate).toLocaleDateString('fr-FR') : null

    // 6. Template HTML sécurisé pour client
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ${invoiceNumber}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 40px; 
            line-height: 1.5; 
            color: #2c3e50;
            background: #fff;
        }
        .header { 
            border-bottom: 2px solid #FF5A5F; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
        }
        .logo { 
            color: #FF5A5F; 
            font-size: 28px; 
            font-weight: 300; 
            margin: 0; 
            letter-spacing: 1px;
        }
        .company-tagline {
            color: #7f8c8d; 
            margin: 8px 0 0 0;
            font-size: 14px;
        }
        .invoice-info { 
            text-align: right; 
        }
        .invoice-info h2 { 
            margin: 0; 
            font-size: 24px; 
            color: #2c3e50; 
            font-weight: 300;
        }
        .client-badge {
            background: #FF5A5F;
            color: white;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 15px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .invoice-details {
            color: #34495e;
            margin: 5px 0;
            font-size: 14px;
        }
        .info-section { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 40px; 
            gap: 40px;
        }
        .info-box { 
            flex: 1; 
            background: #f8f9fa; 
            padding: 25px; 
            border: 1px solid #e9ecef;
            border-radius: 4px;
        }
        .info-box h3 { 
            color: #2c3e50; 
            margin-top: 0; 
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            overflow: hidden;
        }
        th { 
            background: #34495e; 
            color: white; 
            padding: 18px 15px; 
            text-align: left;
            font-weight: 500;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        td { 
            padding: 15px; 
            border-bottom: 1px solid #e9ecef;
            font-size: 14px;
        }
        tr:last-child td { 
            border-bottom: none; 
        }
        .total-section { 
            background: #f8f9fa;
            padding: 30px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
            margin-bottom: 30px;
        }
        .total-row { 
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
            font-size: 16px;
        }
        .total-row.grand-total {
            border-top: 2px solid #34495e;
            padding-top: 15px;
            margin-top: 20px;
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .payment-status {
            background: ${isPaid ? '#d4edda' : '#fff3cd'};
            border: 1px solid ${isPaid ? '#c3e6cb' : '#ffeaa7'};
            color: ${isPaid ? '#155724' : '#856404'};
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 30px;
            text-align: center;
        }
        .footer { 
            text-align: center; 
            margin-top: 60px; 
            padding-top: 30px; 
            border-top: 1px solid #e9ecef;
            color: #7f8c8d;
            font-size: 13px;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 class="logo">Alpigus</h1>
            <p class="company-tagline">Plateforme de vente directe producteur</p>
        </div>
        <div class="invoice-info">
            <div class="client-badge">FACTURE CLIENT</div>
            <h2>Facture ${invoiceNumber}</h2>
            <div class="invoice-details">Date: ${invoiceDate}</div>
            ${dueDate ? `<div class="invoice-details">Échéance: ${dueDate}</div>` : ''}
        </div>
    </div>

    ${isPaid ? `
    <div class="payment-status">
        <h3 style="margin: 0 0 10px 0;">✅ Facture Payée</h3>
        <p style="margin: 0;">
            ${paidAt ? `Payée le ${paidAt}` : 'Paiement confirmé'}
            ${paymentMethod ? ` (${paymentMethod === 'invoice' ? 'Virement bancaire' : paymentMethod === 'card' ? 'Carte bancaire' : paymentMethod})` : ''}
        </p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Merci pour votre paiement. Cette facture est soldée.</p>
    </div>
    ` : order.invoice && dueDate ? `
    <div class="payment-status">
        <h3 style="margin: 0 0 10px 0;">⏳ FACTURE EN ATTENTE</h3>
        <p style="margin: 0;">Paiement requis avant le ${dueDate}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;">
            ${paymentMethod === 'invoice' ? 'Veuillez effectuer le virement bancaire avant l\'échéance.' : 'Veuillez procéder au paiement avant l\'échéance.'}
        </p>
    </div>
    ` : ''}

    <div class="info-section">
        <div class="info-box">
            <h3>Vos Informations</h3>
            <p><strong>${order.user.name || 'N/A'}</strong></p>
            ${deliveryInfo?.company ? `<p>${deliveryInfo.company}</p>` : ''}
            ${deliveryInfo?.address ? `
                <p>${deliveryInfo.address}<br>
                ${deliveryInfo.postalCode} ${deliveryInfo.city}</p>
            ` : ''}
            <p>Téléphone: ${deliveryInfo?.phone || order.user.phone || 'Non renseigné'}</p>
            <p>Email: ${order.user.email}</p>
        </div>
        
        <div class="info-box">
            <h3>Informations de Commande</h3>
            <p><strong>N° Commande:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${order.createdAt.toLocaleDateString('fr-FR')}</p>
            <p><strong>Mode de livraison:</strong> ${deliveryInfo?.type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
            <p><strong>Statut:</strong> ${order.status}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Produit</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix Unitaire</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${order.items.map(item => `
                <tr>
                    <td>
                        <strong>${item.product.name}</strong><br>
                        <span style="color: #7f8c8d; font-size: 13px;">
                            Producteur: ${item.product.producer.companyName || item.product.producer.user.name}
                        </span>
                    </td>
                    <td style="text-align: center;">${formatNumber(item.quantity)} ${item.product.unit}</td>
                    <td style="text-align: right;">${formatNumber(item.price)} CHF</td>
                    <td style="text-align: right;"><strong>${formatNumber(item.price * item.quantity)} CHF</strong></td>
                </tr>
            `).join('')}
            
            ${order.bookings.map(booking => {
              const price = booking.price ?? booking.deliverySlot.product.price
              return `
                <tr>
                    <td>
                        <strong>${booking.deliverySlot.product.name}</strong><br>
                        <span style="color: #7f8c8d; font-size: 13px;">
                            Producteur: ${booking.deliverySlot.product.producer.companyName || booking.deliverySlot.product.producer.user.name}<br>
                            Livraison: ${new Date(booking.deliverySlot.date).toLocaleDateString('fr-FR')}
                        </span>
                    </td>
                    <td style="text-align: center;">${formatNumber(booking.quantity)} ${booking.deliverySlot.product.unit}</td>
                    <td style="text-align: right;">${formatNumber(price)} CHF</td>
                    <td style="text-align: right;"><strong>${formatNumber(price * booking.quantity)} CHF</strong></td>
                </tr>
              `
            }).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Sous-total:</span>
            <span>${formatNumber(subtotal)} CHF</span>
        </div>
        ${deliveryFee > 0 ? `
        <div class="total-row">
            <span>Frais de livraison:</span>
            <span>${formatNumber(deliveryFee)} CHF</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
            <span>${isPaid ? 'Total Payé:' : 'Total à Payer:'}</span>
            <span>${formatNumber(totalWithDelivery)} CHF</span>
        </div>
    </div>

    <div class="footer">
        <p><strong>alpigus - Marketplace B2B Champignons</strong></p>
        <p>Cette facture est générée automatiquement par la plateforme alpigus</p>
        <p>Pour toute question concernant cette facture, contactez-nous à support@alpigus.ch</p>
        <p>TVA non applicable - Prestations de services numériques</p>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.createElement('button');
            printBtn.textContent = 'Imprimer / Sauvegarder PDF';
            printBtn.className = 'no-print';
            printBtn.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;background:#FF5A5F;color:white;border:none;border-radius:4px;cursor:pointer;z-index:1000;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:14px;';
            printBtn.onclick = () => window.print();
            document.body.appendChild(printBtn);
        });
    </script>
</body>
</html>`

    // 7. Log d'audit sécurisé
    console.log(`📋 Audit - Facture client générée:`, {
      orderId: id,
      userId: session.user.id,
      totalAmount: totalWithDelivery,
      isPaid,
      paymentMethod,
      timestamp: new Date().toISOString()
    })

    console.log(`✅ Facture client générée pour commande ${id}`)

    // 8. Réponse sécurisée avec headers appropriés
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Facture_${invoiceNumber}.html"`,
        // Headers de sécurité
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('❌ Erreur génération facture client:', error)
    return handleError(error, request.url)
  }
})