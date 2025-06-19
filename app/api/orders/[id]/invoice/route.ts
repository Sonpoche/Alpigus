// app/api/orders/[id]/invoice/route.ts (version producteur personnalisée)
import { NextRequest, NextResponse } from 'next/server'
import { apiAuthMiddleware } from '@/lib/api-middleware'
import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const orderId = context.params.id

    // Récupérer la commande avec toutes les relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
        }
      }
    })

    if (!order) {
      return new NextResponse('Commande non trouvée', { status: 404 })
    }

    // Vérifier les autorisations
    const isProducer = session.user.role === 'PRODUCER'
    const isAdmin = session.user.role === 'ADMIN'
    const isOrderOwner = order.userId === session.user.id

    if (!isAdmin && !isOrderOwner) {
      if (isProducer) {
        const hasProducts = order.items.some(item => 
          item.product.producer.userId === session.user.id
        ) || order.bookings.some(booking => 
          booking.deliverySlot.product.producer.userId === session.user.id
        )
        
        if (!hasProducts) {
          return new NextResponse('Accès interdit', { status: 403 })
        }
      } else {
        return new NextResponse('Accès interdit', { status: 403 })
      }
    }

    // Récupérer le producteur principal
    let producer
    if (order.items.length > 0) {
      producer = order.items[0].product.producer
    } else if (order.bookings.length > 0) {
      producer = order.bookings[0].deliverySlot.product.producer
    } else {
      return new NextResponse('Aucun produit dans la commande', { status: 400 })
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
        // Ignore
      }
    }

    // Calculer les totaux et commissions
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const bookingsTotal = order.bookings.reduce((sum, booking) => {
      const price = booking.price ?? booking.deliverySlot.product.price
      return sum + (price * booking.quantity)
    }, 0)
    
    const subtotal = itemsTotal + bookingsTotal
    const deliveryFee = deliveryInfo?.type === 'delivery' ? 15 : 0
    const totalWithDelivery = subtotal + deliveryFee
    
    // Commission de la plateforme (5% du sous-total)
    const platformCommission = subtotal * 0.05
    const producerAmount = subtotal - platformCommission

    const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`
    const invoiceDate = order.createdAt.toLocaleDateString('fr-FR')

    // Template personnalisé pour producteur
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Récapitulatif de vente ${invoiceNumber}</title>
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
            border-bottom: 2px solid #34495e; 
            padding-bottom: 30px; 
            margin-bottom: 40px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
        }
        .logo { 
            color: #2c3e50; 
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
        .producer-badge {
            background: #34495e;
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
            font-weight: 300;
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
        .producer-info { 
            background: #f8f9fa; 
            border: 1px solid #34495e; 
        }
        .order-info { 
            background: #f8f9fa; 
            padding: 25px; 
            border: 1px solid #e9ecef;
            border-radius: 4px; 
            margin-bottom: 30px;
        }
        .order-info h3 {
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
        .order-details {
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px;
        }
        .order-details p {
            margin: 8px 0;
            font-size: 14px;
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
            border-bottom: 1px solid #dee2e6;
            font-size: 14px;
        }
        tr:nth-child(even) { 
            background: #f8f9fa; 
        }
        .product-name {
            font-weight: 600;
            color: #2c3e50;
        }
        .delivery-info {
            color: #6c757d;
            font-size: 12px;
            margin-top: 4px;
        }
        .commission-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 25px;
            margin: 30px 0;
        }
        .commission-title {
            color: #2c3e50;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
        }
        .commission-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            align-items: center;
        }
        .commission-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #dee2e6;
            font-size: 14px;
        }
        .commission-item:last-child {
            border-bottom: none;
        }
        .producer-amount {
            background: #2c3e50;
            color: white;
            padding: 20px;
            border-radius: 4px;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
        }
        .producer-amount-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            opacity: 0.8;
        }
        .total-section { 
            display: flex; 
            justify-content: flex-end; 
            margin-bottom: 40px;
        }
        .total-box { 
            width: 350px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            overflow: hidden;
        }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 15px 20px; 
            border-bottom: 1px solid #dee2e6;
            font-size: 14px;
        }
        .total-row:last-child {
            border-bottom: none;
        }
        .grand-total { 
            font-size: 16px; 
            font-weight: 600; 
            color: #2c3e50; 
            background: #f8f9fa;
        }
        .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #6c757d; 
            border-top: 1px solid #dee2e6; 
            padding-top: 30px;
            margin-top: 50px;
        }
        .footer p {
            margin: 8px 0;
        }
        .footer strong {
            color: #2c3e50;
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
            <h1 class="logo">alpigus</h1>
            <div class="producer-badge">Récapitulatif Producteur</div>
            <p class="company-tagline">Plateforme spécialisée dans les champignons de qualité</p>
        </div>
        <div class="invoice-info">
            <h2>RÉCAPITULATIF DE VENTE</h2>
            <p style="margin: 5px 0; font-size: 16px; font-weight: 600;">N° ${invoiceNumber}</p>
            <p style="margin: 0; color: #6c757d;">Date: ${invoiceDate}</p>
        </div>
    </div>

    <div class="info-section">
        <div class="info-box producer-info">
            <h3>Informations Producteur</h3>
            <p><strong>${producer.companyName || producer.user.name || 'N/A'}</strong></p>
            ${producer.address ? `<p>${producer.address.replace(/\n/g, '<br>')}</p>` : ''}
            <p>Téléphone: ${producer.user.phone || 'Non renseigné'}</p>
            <p>Email: ${producer.user.email}</p>
        </div>
        
        <div class="info-box">
            <h3>Informations Client</h3>
            <p><strong>${deliveryInfo?.fullName || order.user.name || 'N/A'}</strong></p>
            ${deliveryInfo?.company ? `<p>${deliveryInfo.company}</p>` : ''}
            ${deliveryInfo?.address ? `<p>${deliveryInfo.address}<br>${deliveryInfo.postalCode} ${deliveryInfo.city}</p>` : ''}
            <p>Téléphone: ${deliveryInfo?.phone || order.user.phone || 'Non renseigné'}</p>
            <p>Email: ${order.user.email}</p>
        </div>
    </div>

    <div class="order-info">
        <h3>Détails de la Commande</h3>
        <div class="order-details">
            <p><strong>N° Commande:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${order.createdAt.toLocaleDateString('fr-FR')}</p>
            <p><strong>Mode de livraison:</strong> ${deliveryInfo?.type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
            <p><strong>Statut:</strong> ${order.status}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Produits Vendus</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix Unitaire</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${order.items.map(item => `
                <tr>
                    <td><span class="product-name">${item.product.name}</span></td>
                    <td style="text-align: center;">${item.quantity} ${item.product.unit}</td>
                    <td style="text-align: right;">${item.price.toFixed(2)} CHF</td>
                    <td style="text-align: right;"><strong>${(item.price * item.quantity).toFixed(2)} CHF</strong></td>
                </tr>
            `).join('')}
            
            ${order.bookings.map(booking => {
              const price = booking.price ?? booking.deliverySlot.product.price
              return `
                <tr>
                    <td>
                        <span class="product-name">${booking.deliverySlot.product.name}</span>
                        <div class="delivery-info">Livraison programmée: ${booking.deliverySlot.date.toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td style="text-align: center;">${booking.quantity} ${booking.deliverySlot.product.unit}</td>
                    <td style="text-align: right;">${price.toFixed(2)} CHF</td>
                    <td style="text-align: right;"><strong>${(price * booking.quantity).toFixed(2)} CHF</strong></td>
                </tr>
              `
            }).join('')}
        </tbody>
    </table>

    <div class="commission-section">
        <div class="commission-title">
            Détail des Revenus
        </div>
        <div class="commission-details">
            <div>
                <div class="commission-item">
                    <span>Total des ventes:</span>
                    <span><strong>${subtotal.toFixed(2)} CHF</strong></span>
                </div>
                <div class="commission-item">
                    <span>Commission plateforme (5%):</span>
                    <span><strong>-${platformCommission.toFixed(2)} CHF</strong></span>
                </div>
            </div>
            <div>
                <div class="producer-amount">
                    <div class="producer-amount-label">Montant Producteur</div>
                    <div>${producerAmount.toFixed(2)} CHF</div>
                </div>
            </div>
        </div>
    </div>

    <div class="total-section">
        <div class="total-box">
            <div class="total-row">
                <span>Sous-total produits:</span>
                <span>${subtotal.toFixed(2)} CHF</span>
            </div>
            ${deliveryFee > 0 ? `
                <div class="total-row">
                    <span>Frais de livraison:</span>
                    <span>${deliveryFee.toFixed(2)} CHF</span>
                </div>
            ` : ''}
            <div class="total-row grand-total">
                <span>Total Commande:</span>
                <span>${totalWithDelivery.toFixed(2)} CHF</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p><strong>alpigus</strong></p>
        <p>Plateforme spécialisée dans les champignons de qualité</p>
        <p>Pour toute question concernant cette vente, contactez-nous à info@alpigus.ch</p>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.createElement('button');
            printBtn.textContent = 'Imprimer / Sauvegarder PDF';
            printBtn.className = 'no-print';
            printBtn.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;background:#34495e;color:white;border:none;border-radius:4px;cursor:pointer;z-index:1000;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:14px;';
            printBtn.onclick = () => window.print();
            document.body.appendChild(printBtn);
        });
    </script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Recapitulatif_${invoiceNumber}.html"`
      }
    })

  } catch (error) {
    console.error('Erreur génération facture:', error)
    return new NextResponse('Erreur interne du serveur', { status: 500 })
  }
}, ["CLIENT", "PRODUCER", "ADMIN"])