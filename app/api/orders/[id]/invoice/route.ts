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
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            line-height: 1.6; 
            color: #333;
        }
        .header { 
            border-bottom: 3px solid #FF5A5F; 
            padding-bottom: 20px; 
            margin-bottom: 40px; 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
        }
        .logo { color: #FF5A5F; font-size: 28px; font-weight: bold; margin: 0; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { margin: 0; font-size: 24px; color: #333; }
        .producer-badge {
            background: linear-gradient(135deg, #FF5A5F, #FF7B7F);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            display: inline-block;
        }
        .info-section { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 40px; 
            gap: 40px;
        }
        .info-box { 
            flex: 1; 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 8px;
        }
        .info-box h3 { color: #FF5A5F; margin-top: 0; }
        .producer-info { 
            background: linear-gradient(135deg, #fff5f5, #ffe8e8); 
            border: 2px solid #FF5A5F; 
        }
        .order-info { 
            background: #f0f0f0; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
        }
        th { 
            background: #FF5A5F; 
            color: white; 
            padding: 15px; 
            text-align: left;
        }
        td { 
            padding: 12px 15px; 
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) { background: #f9f9f9; }
        .commission-section {
            background: linear-gradient(135deg, #fff9c4, #ffeaa7);
            border: 2px solid #fdcb6e;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .commission-title {
            color: #e17055;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .commission-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .commission-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
        }
        .producer-amount {
            background: linear-gradient(135deg, #00b894, #00cec9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0;
        }
        .total-section { 
            display: flex; 
            justify-content: flex-end; 
            margin-bottom: 40px;
        }
        .total-box { width: 400px; }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 10px 0; 
            border-bottom: 1px solid #ddd;
        }
        .grand-total { 
            font-size: 18px; 
            font-weight: bold; 
            color: #FF5A5F; 
            border-top: 2px solid #FF5A5F; 
            padding-top: 15px;
        }
        .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            border-top: 1px solid #ddd; 
            padding-top: 20px;
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
            <h1 class="logo">🍄 Mushroom Marketplace</h1>
            <div class="producer-badge">📊 RÉCAPITULATIF PRODUCTEUR</div>
            <p style="color: #666; margin: 5px 0 0 0;">Marketplace B2B Champignons</p>
        </div>
        <div class="invoice-info">
            <h2>RÉCAPITULATIF DE VENTE</h2>
            <p style="margin: 5px 0; font-size: 16px; font-weight: bold;">N° ${invoiceNumber}</p>
            <p style="margin: 0; color: #666;">Date: ${invoiceDate}</p>
        </div>
    </div>

    <div class="info-section">
        <div class="info-box producer-info">
            <h3>VOS INFORMATIONS</h3>
            <p><strong>${producer.companyName || producer.user.name || 'N/A'}</strong></p>
            ${producer.address ? `<p>${producer.address.replace(/\n/g, '<br>')}</p>` : ''}
            <p>Tél: ${producer.user.phone || 'N/A'}</p>
            <p>Email: ${producer.user.email}</p>
        </div>
        
        <div class="info-box">
            <h3>CLIENT</h3>
            <p><strong>${deliveryInfo?.fullName || order.user.name || 'N/A'}</strong></p>
            ${deliveryInfo?.company ? `<p>${deliveryInfo.company}</p>` : ''}
            ${deliveryInfo?.address ? `<p>${deliveryInfo.address}<br>${deliveryInfo.postalCode} ${deliveryInfo.city}</p>` : ''}
            <p>Tél: ${deliveryInfo?.phone || order.user.phone || 'N/A'}</p>
            <p>Email: ${order.user.email}</p>
        </div>
    </div>

    <div class="order-info">
        <h3 style="color: #FF5A5F; margin-top: 0;">DÉTAILS DE LA COMMANDE</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <p><strong>N° Commande:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${order.createdAt.toLocaleDateString('fr-FR')}</p>
            <p><strong>Mode de livraison:</strong> ${deliveryInfo?.type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
            <p><strong>Statut:</strong> ${order.status}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Vos produits vendus</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix unitaire</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${order.items.map(item => `
                <tr>
                    <td><strong>${item.product.name}</strong></td>
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
                        <strong>${booking.deliverySlot.product.name}</strong><br>
                        <small style="color: #666;">📅 Livraison programmée: ${booking.deliverySlot.date.toLocaleDateString('fr-FR')}</small>
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
            💰 DÉTAIL DE VOS REVENUS
        </div>
        <div class="commission-details">
            <div>
                <div class="commission-item">
                    <span>Total de vos ventes:</span>
                    <span><strong>${subtotal.toFixed(2)} CHF</strong></span>
                </div>
                <div class="commission-item">
                    <span>Commission plateforme (5%):</span>
                    <span><strong>-${platformCommission.toFixed(2)} CHF</strong></span>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="producer-amount" style="width: 100%;">
                    <div>💵 VOTRE MONTANT</div>
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
                    <span>Frais de livraison (client):</span>
                    <span>${deliveryFee.toFixed(2)} CHF</span>
                </div>
            ` : ''}
            <div class="total-row grand-total">
                <span>TOTAL COMMANDE CLIENT:</span>
                <span>${totalWithDelivery.toFixed(2)} CHF</span>
            </div>
        </div>
    </div>

    <div style="background: #e8f5e8; border: 2px solid #00b894; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="color: #00b894; margin-top: 0; display: flex; align-items: center; gap: 10px;">
            💳 PAIEMENT DE VOS REVENUS
        </h3>
        <p style="margin-bottom: 10px;"><strong>Montant qui vous sera versé :</strong> ${producerAmount.toFixed(2)} CHF</p>
        <p style="margin-bottom: 10px;"><strong>Modalités :</strong> Paiement sous 7 jours après livraison confirmée</p>
        <p style="margin-bottom: 0;"><strong>Méthode :</strong> Virement bancaire sur le compte renseigné dans votre profil</p>
    </div>

    <div class="footer">
        <p><strong>Mushroom Marketplace - Votre partenaire B2B champignons</strong></p>
        <p>Ce récapitulatif vous permet de suivre vos ventes et revenus sur notre plateforme</p>
        <p>Questions ? Contactez-nous à producteurs@mushroom-marketplace.com</p>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const printBtn = document.createElement('button');
            printBtn.textContent = '🖨️ Imprimer / Sauvegarder en PDF';
            printBtn.className = 'no-print';
            printBtn.style.cssText = 'position:fixed;top:10px;right:10px;padding:12px 20px;background:#FF5A5F;color:white;border:none;border-radius:25px;cursor:pointer;z-index:1000;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
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