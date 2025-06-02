// components/invoices/invoice-template.tsx
import React from 'react'

interface InvoiceData {
  order: {
    id: string
    createdAt: string
    total: number
    items: Array<{
      id: string
      quantity: number
      price: number
      product: {
        name: string
        unit: string
      }
    }>
    bookings?: Array<{
      id: string
      quantity: number
      price?: number // Changé de number | null vers number | undefined
      deliverySlot: {
        date: string
        product: {
          name: string
          price: number
          unit: string
        }
      }
    }>
    user: {
      name: string | null
      email: string
      phone: string | null
    }
  }
  producer: {
    companyName: string | null
    address: string | null
    phone: string
    email: string
    user: {
      name: string | null
    }
  }
  deliveryInfo?: {
    type: string
    address?: string
    fullName?: string
    company?: string
    postalCode?: string
    city?: string
    phone?: string
  } | null
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
}

export default function InvoiceTemplate({ data }: { data: InvoiceData }) {
  const { order, producer, deliveryInfo, invoiceNumber, invoiceDate, dueDate } = data

  // Calculer les totaux
  const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const bookingsTotal = order.bookings?.reduce((sum, booking) => {
    const price = booking.price ?? booking.deliverySlot.product.price // Utilisation de ?? au lieu de ||
    return sum + (price * booking.quantity)
  }, 0) || 0
  
  const subtotal = itemsTotal + bookingsTotal
  const deliveryFee = deliveryInfo?.type === 'delivery' ? 15 : 0
  const total = subtotal + deliveryFee

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      padding: '40px', 
      maxWidth: '800px', 
      margin: '0 auto',
      lineHeight: 1.6,
      fontSize: '14px'
    }}>
      {/* En-tête */}
      <div style={{ marginBottom: '40px', borderBottom: '2px solid #FF5A5F', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: '#FF5A5F', fontSize: '28px', margin: 0 }}>
              🍄 Mushroom Marketplace
            </h1>
            <p style={{ color: '#666', margin: '5px 0 0 0' }}>Marketplace B2B Champignons</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>FACTURE</h2>
            <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold' }}>
              N° {invoiceNumber}
            </p>
            <p style={{ margin: 0, color: '#666' }}>
              Date: {new Date(invoiceDate).toLocaleDateString('fr-FR')}
            </p>
            {dueDate && (
              <p style={{ margin: 0, color: '#666' }}>
                Échéance: {new Date(dueDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Informations vendeur et client */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        {/* Vendeur */}
        <div style={{ width: '45%' }}>
          <h3 style={{ color: '#FF5A5F', marginBottom: '15px', fontSize: '16px' }}>VENDEUR</h3>
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '16px' }}>
              {producer.companyName || producer.user.name || 'N/A'}
            </p>
            {producer.address && (
              <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                {producer.address.split('\n').map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
              </p>
            )}
            <p style={{ margin: '0 0 5px 0', color: '#666' }}>
              Tél: {producer.phone || 'N/A'}
            </p>
            <p style={{ margin: 0, color: '#666' }}>
              Email: {producer.email}
            </p>
          </div>
        </div>

        {/* Client */}
        <div style={{ width: '45%' }}>
          <h3 style={{ color: '#FF5A5F', marginBottom: '15px', fontSize: '16px' }}>CLIENT</h3>
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '16px' }}>
              {deliveryInfo?.fullName || order.user.name || 'N/A'}
            </p>
            {deliveryInfo?.company && (
              <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                {deliveryInfo.company}
              </p>
            )}
            {deliveryInfo?.address && (
              <p style={{ margin: '0 0 5px 0', color: '#666' }}>
                {deliveryInfo.address}<br />
                {deliveryInfo.postalCode} {deliveryInfo.city}
              </p>
            )}
            <p style={{ margin: '0 0 5px 0', color: '#666' }}>
              Tél: {deliveryInfo?.phone || order.user.phone || 'N/A'}
            </p>
            <p style={{ margin: 0, color: '#666' }}>
              Email: {order.user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Informations commande */}
      <div style={{ marginBottom: '30px', backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
        <h3 style={{ color: '#FF5A5F', marginBottom: '10px', fontSize: '16px' }}>COMMANDE</h3>
        <div style={{ display: 'flex', gap: '30px' }}>
          <p style={{ margin: 0 }}>
            <strong>N° Commande:</strong> #{order.id.substring(0, 8).toUpperCase()}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString('fr-FR')}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Mode de livraison:</strong> {deliveryInfo?.type === 'pickup' ? 'Retrait sur place' : 'Livraison à domicile'}
          </p>
        </div>
      </div>

      {/* Tableau des articles */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#FF5A5F', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
              Description
            </th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
              Quantité
            </th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
              Prix unitaire
            </th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Produits standards */}
          {order.items.map((item, index) => (
            <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {item.product.name}
              </td>
              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                {item.quantity} {item.product.unit}
              </td>
              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                {item.price.toFixed(2)} CHF
              </td>
              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                {(item.price * item.quantity).toFixed(2)} CHF
              </td>
            </tr>
          ))}

          {/* Livraisons programmées */}
          {order.bookings?.map((booking, index) => {
            const price = booking.price ?? booking.deliverySlot.product.price
            return (
              <tr key={booking.id} style={{ backgroundColor: (order.items.length + index) % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  {booking.deliverySlot.product.name}
                  <br />
                  <small style={{ color: '#666' }}>
                    Livraison: {new Date(booking.deliverySlot.date).toLocaleDateString('fr-FR')}
                  </small>
                </td>
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                  {booking.quantity} {booking.deliverySlot.product.unit}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                  {price.toFixed(2)} CHF
                </td>
                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                  {(price * booking.quantity).toFixed(2)} CHF
                </td>
              </tr>
            )
          })}

          {/* Frais de livraison */}
          {deliveryFee > 0 && (
            <tr style={{ backgroundColor: (order.items.length + (order.bookings?.length || 0)) % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                Frais de livraison
              </td>
              <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                1
              </td>
              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                {deliveryFee.toFixed(2)} CHF
              </td>
              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                {deliveryFee.toFixed(2)} CHF
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
            <span>Sous-total:</span>
            <span>{subtotal.toFixed(2)} CHF</span>
          </div>
          {deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
              <span>Frais de livraison:</span>
              <span>{deliveryFee.toFixed(2)} CHF</span>
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '15px 0', 
            borderTop: '2px solid #FF5A5F',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#FF5A5F'
          }}>
            <span>TOTAL:</span>
            <span>{total.toFixed(2)} CHF</span>
          </div>
        </div>
      </div>

      {/* Conditions de paiement */}
      <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '5px', marginBottom: '30px' }}>
        <h3 style={{ color: '#FF5A5F', marginBottom: '15px', fontSize: '16px' }}>CONDITIONS DE PAIEMENT</h3>
        <p style={{ margin: '0 0 10px 0' }}>
          Paiement à 30 jours net. En cas de retard de paiement, des intérêts de retard au taux légal seront appliqués.
        </p>
        <p style={{ margin: 0 }}>
          Aucun escompte ne sera accordé pour paiement anticipé.
        </p>
      </div>

      {/* Mentions légales */}
      <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
        <p style={{ margin: '0 0 5px 0' }}>
          Mushroom Marketplace - Plateforme B2B de vente de champignons
        </p>
        <p style={{ margin: '0 0 5px 0' }}>
          Cette facture est générée automatiquement par la plateforme Mushroom Marketplace
        </p>
        <p style={{ margin: 0 }}>
          Pour toute question, contactez-nous à support@mushroom-marketplace.com
        </p>
      </div>
    </div>
  )
}