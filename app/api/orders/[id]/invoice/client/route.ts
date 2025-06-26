// app/api/orders/[id]/invoice/client/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiAuthMiddleware } from '@/lib/api-middleware'
import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Fonction helper pour formater les nombres
function formatNumber(num: number): string {
  return num.toFixed(2)
}

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id

    // Récupérer la commande
    const order = await prisma.order.findUnique({
      where: { 
        id: orderId,
        userId: session.user.id // S'assurer que la commande appartient au client
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
      return new NextResponse('Commande non trouvée', { status: 404 })
    }

    // Parser les métadonnées de livraison
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
          phone: metadata.deliveryInfo?.phone || metadata.phone
        }
      } catch (e) {
        console.error('Erreur parsing metadata:', e)
      }
    }

    // Calculer les totaux
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const bookingsTotal = order.bookings.reduce((sum, booking) => {
      const price = booking.price ?? booking.deliverySlot.product.price
      return sum + (price * booking.quantity)
    }, 0)
    
    const subtotal = itemsTotal + bookingsTotal
    const deliveryFee = deliveryInfo?.type === 'delivery' ? 15 : 0
    const totalWithDelivery = subtotal + deliveryFee

    const invoiceNumber = order.invoice 
      ? `FACT-${order.invoice.id.substring(0, 8).toUpperCase()}`
      : `CMD-${order.id.substring(0, 8).toUpperCase()}`
    const invoiceDate = order.createdAt.toLocaleDateString('fr-FR')

    // Template HTML pour CLIENT
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
        .company-tagline {
            color: #7f8c8d; 
            margin: 8px 0 0 0;
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
            text-align: right; 
            padding: 30px 0; 
            border-top: 2px solid #dee2e6;
        }
        .total-row { 
            margin: 8px 0; 
            font-size: 15px;
        }
        .final-total { 
            font-size: 22px; 
            color: #FF5A5F; 
            margin-top: 15px;
            font-weight: 600;
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
            <p style="margin: 5px 0;">Date: ${invoiceDate}</p>
        </div>
    </div>

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
                            Producteur: ${item.product.producer.companyName}
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
                            Producteur: ${booking.deliverySlot.product.producer.companyName}
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
        <div class="total-row"><strong>Sous-total:</strong> ${formatNumber(subtotal)} CHF</div>
        ${deliveryFee > 0 ? `<div class="total-row"><strong>Frais de livraison:</strong> ${formatNumber(deliveryFee)} CHF</div>` : ''}
        <div class="final-total"><strong>Total à payer:</strong> ${formatNumber(totalWithDelivery)} CHF</div>
    </div>

    <div class="footer">
        <p>Merci pour votre commande sur Alpigus</p>
        <p style="margin-top: 10px;">
            Pour toute question, contactez-nous à support@alpigus.ch
        </p>
    </div>

    <script>
        window.onload = function() {
            const printBtn = document.createElement('button');
            printBtn.textContent = 'Imprimer / Sauvegarder PDF';
            printBtn.className = 'no-print';
            printBtn.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;background:#FF5A5F;color:white;border:none;border-radius:4px;cursor:pointer;z-index:1000;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:14px;';
            printBtn.onclick = function() { window.print(); };
            document.body.appendChild(printBtn);
        };
    </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Facture_${invoiceNumber}.html"`
      }
    })

  } catch (error) {
    console.error('Erreur génération facture client:', error)
    return new NextResponse('Erreur interne du serveur', { status: 500 })
  }
}, ["CLIENT"]) // Uniquement pour les clients