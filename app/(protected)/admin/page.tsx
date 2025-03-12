// app/admin/page.tsx
export default function AdminPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold font-montserrat text-title mb-8">
        Administration
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Carte Catégories */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-custom-title mb-4">Gestion des catégories</h2>
          <p className="text-custom-text mb-4">
            Gérez les catégories de produits disponibles sur la plateforme.
          </p>
          <a
            href="/admin/categories"
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Accéder aux catégories →
          </a>
        </div>

        {/* Carte Utilisateurs */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-custom-title mb-4">Gestion des utilisateurs</h2>
          <p className="text-custom-text mb-4">
            Gérez les comptes utilisateurs et les permissions.
          </p>
          <a
            href="/admin/users"
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Accéder aux utilisateurs →
          </a>
        </div>

        {/* Carte Produits */}
        <div className="bg-background border border-foreground/10 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-custom-title mb-4">Gestion des produits</h2>
          <p className="text-custom-text mb-4">
            Supervisez tous les produits de la plateforme.
          </p>
          <a
            href="/admin/products"
            className="text-custom-accent hover:opacity-90 transition-opacity"
          >
            Accéder aux produits →
          </a>
        </div>
      </div>
    </div>
  )
}