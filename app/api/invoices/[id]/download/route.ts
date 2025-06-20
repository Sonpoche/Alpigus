// app/api/invoices/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiAuthMiddleware } from "@/lib/api-middleware"
import { Session } from "next-auth"

function formatNumber(num: number): string {
  return num.toFixed(2)
}

export const GET = apiAuthMiddleware(async (
  req: NextRequest,
  session: Session,
  context: { params: { [key: string]: string } }
) => {
  try {
    const invoiceId = context.params.id

    // Récupérer la facture avec toutes les informations nécessaires
    const invoice = await prisma.invoice.findUnique({
      where: { 
        id: invoiceId,
        userId: session.user.id // Sécurité : seul le client peut télécharger sa facture
      },
      include: {
        order: {
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
        }
      }
    })

    if (!invoice) {
      return new NextResponse('Facture non trouvée', { status: 404 })
    }

    const order = invoice.order
    
    // Extraire les informations de livraison du metadata
    const deliveryInfo = order.metadata ? JSON.parse(order.metadata).deliveryInfo : null
    
    // Calculer les totaux
    const itemsTotal = order.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
    
    const bookingsTotal = order.bookings.reduce((sum, booking) => {
      const price = booking.price ?? booking.deliverySlot.product.price
      return sum + (price * booking.quantity)
    }, 0)
    
    const subtotal = itemsTotal + bookingsTotal
    const deliveryFee = deliveryInfo?.type === 'delivery' ? 15 : 0
    const totalWithDelivery = subtotal + deliveryFee

    const invoiceNumber = `FACT-${invoice.id.substring(0, 8).toUpperCase()}`
    const invoiceDate = invoice.createdAt.toLocaleDateString('fr-FR')
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : null

    // Template client avec même style que la version producteur
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
        .invoice-details {
            color: #34495e;
            margin: 5px 0;
        }
        .parties-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            gap: 40px;
        }
        .info-box {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            flex: 1;
            border-left: 4px solid #FF5A5F;
        }
        .info-box h3 {
            color: #FF5A5F;
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-box p {
            margin: 5px 0;
            color: #2c3e50;
        }
        .order-info {
            background: #ecf0f1;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #FF5A5F;
        }
        .order-info h3 {
            color: #FF5A5F;
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .order-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .order-details p {
            margin: 0;
            color: #2c3e50;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 12px;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #ecf0f1;
        }
        tr:last-child td {
            border-bottom: none;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        .product-name {
            font-weight: 500;
            color: #2c3e50;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        .totals-box {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            min-width: 350px;
            border: 2px solid #ecf0f1;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
        }
        .total-row:last-child {
            border-bottom: none;
        }
        .grand-total {
            font-size: 18px;
            font-weight: 600;
            color: #FF5A5F;
            border-top: 2px solid #FF5A5F;
            padding-top: 15px;
            margin-top: 10px;
        }
        .payment-info {
            background: #e8f5e8;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #27ae60;
        }
        .payment-info h3 {
            color: #27ae60;
            margin: 0 0 15px 0;
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .payment-info p {
            margin: 8px 0;
            color: #2c3e50;
        }
        .payment-status {
            background: ${invoice.status === 'PAID' ? '#d4edda' : '#fff3cd'};
            color: ${invoice.status === 'PAID' ? '#155724' : '#856404'};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid ${invoice.status === 'PAID' ? '#c3e6cb' : '#ffeaa7'};
            text-align: center;
            font-weight: 500;
        }
        .footer {
            border-top: 2px solid #ecf0f1;
            padding-top: 25px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            line-height: 1.6;
        }
        .footer p {
            margin: 5px 0;
        }
        .no-print {
            display: block;
        }
        @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
        }
        @media (max-width: 768px) {
            body { padding: 20px; }
            .parties-info { flex-direction: column; gap: 20px; }
            .order-details { grid-template-columns: 1fr; }
            .totals-box { min-width: auto; width: 100%; }
            table { font-size: 12px; }
            th, td { padding: 10px 8px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1 class="logo">🍄 alpigus</h1>
            <p class="company-tagline">Marketplace spécialisée dans les champignons de qualité</p>
            <div class="client-badge">FACTURE CLIENT</div>
        </div>
        <div class="invoice-info">
            <h2>FACTURE</h2>
            <p class="invoice-details"><strong>N° ${invoiceNumber}</strong></p>
            <p class="invoice-details">Date d'émission: ${invoiceDate}</p>
            ${dueDate ? `<p class="invoice-details">Date d'échéance: ${dueDate}</p>` : ''}
        </div>
    </div>

    <div class="payment-status">
        ${invoice.status === 'PAID' 
          ? `✅ FACTURE PAYÉE - Paiement reçu le ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR') : 'N/A'}`
          : invoice.status === 'OVERDUE' 
            ? `⚠️ FACTURE EN RETARD - Échéance dépassée`
            : `📋 FACTURE EN ATTENTE - Paiement requis${dueDate ? ` avant le ${dueDate}` : ''}`
        }
    </div>

    <div class="parties-info">
        <div class="info-box">
            <h3>Informations Client (Facturé à)</h3>
            <p><strong>${deliveryInfo?.fullName || order.user.name || 'N/A'}</strong></p>
            ${deliveryInfo?.company ? `<p>${deliveryInfo.company}</p>` : ''}
            ${deliveryInfo?.address ? `<p>${deliveryInfo.address}<br>${deliveryInfo.postalCode} ${deliveryInfo.city}</p>` : ''}
            <p>Téléphone: ${deliveryInfo?.phone || order.user.phone || 'Non renseigné'}</p>
            <p>Email: ${order.user.email}</p>
        </div>
        
        <div class="info-box">
            <h3>Fournisseur</h3>
            <p><strong>alpigus</strong></p>
            <p>Marketplace B2B Champignons</p>
            <p>Plateforme de mise en relation</p>
            <p>Email: info@alpigus.ch</p>
            <p>Support: support@alpigus.ch</p>
        </div>
    </div>

    <div class="order-info">
        <h3>Détails de la Commande</h3>
        <div class="order-details">
            <p><strong>N° Commande:</strong> #${order.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date de commande:</strong> ${order.createdAt.toLocaleDateString('fr-FR')}</p>
            <p><strong>Mode de livraison:</strong> ${deliveryInfo?.type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}</p>
            <p><strong>Statut commande:</strong> ${order.status}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Produits Commandés</th>
                <th style="text-align: center;">Quantité</th>
                <th style="text-align: right;">Prix Unitaire</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${order.items.map(item => `
                <tr>
                    <td>
                        <span class="product-name">${item.product.name}</span>
                        <br><small style="color: #7f8c8d;">Producteur: ${item.product.producer.companyName || item.product.producer.user.name}</small>
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
                        <span class="product-name">${booking.deliverySlot.product.name}</span> (Réservation)
                        <br><small style="color: #7f8c8d;">Producteur: ${booking.deliverySlot.product.producer.companyName || booking.deliverySlot.product.producer.user.name}</small>
                        <br><small style="color: #7f8c8d;">Livraison: ${new Date(booking.deliverySlot.date).toLocaleDateString('fr-FR')}</small>
                    </td>
                    <td style="text-align: center;">${formatNumber(booking.quantity)} ${booking.deliverySlot.product.unit}</td>
                    <td style="text-align: right;">${formatNumber(price)} CHF</td>
                    <td style="text-align: right;"><strong>${formatNumber(price * booking.quantity)} CHF</strong></td>
                </tr>
              `
            }).join('')}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="totals-box">
            <div class="total-row">
                <span>Sous-total produits:</span>
                <span>${formatNumber(subtotal)} CHF</span>
            </div>
            ${deliveryFee > 0 ? `
                <div class="total-row">
                    <span>Frais de livraison:</span>
                    <span>${formatNumber(deliveryFee)} CHF</span>
                </div>
            ` : ''}
            <div class="total-row grand-total">
                <span>TOTAL À PAYER:</span>
                <span>${formatNumber(totalWithDelivery)} CHF</span>
            </div>
        </div>
    </div>

    ${invoice.status !== 'PAID' ? `
    <div class="payment-info">
        <h3>Informations de Paiement</h3>
        <p><strong>Montant à régler:</strong> ${formatNumber(invoice.amount)} CHF</p>
        ${dueDate ? `<p><strong>Date limite de paiement:</strong> ${dueDate}</p>` : ''}
        <p><strong>Mode de paiement:</strong> Virement bancaire ou paiement en ligne</p>
        <p><strong>Référence à mentionner:</strong> ${invoiceNumber}</p>
        <p>Pour effectuer votre paiement, connectez-vous à votre espace client sur alpigus.ch</p>
    </div>
    ` : `
    <div class="payment-info" style="background: #d4edda; border-left-color: #27ae60;">
        <h3 style="color: #27ae60;">Paiement Confirmé</h3>
        <p><strong>Montant payé:</strong> ${formatNumber(invoice.amount)} CHF</p>
        <p><strong>Date de paiement:</strong> ${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR') : 'N/A'}</p>
        <p><strong>Mode de paiement:</strong> ${invoice.paymentMethod || 'Non spécifié'}</p>
        <p>✅ Merci pour votre paiement. Cette facture est soldée.</p>
    </div>
    `}

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
}, ["CLIENT", "ADMIN"])