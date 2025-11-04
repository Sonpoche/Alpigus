// Chemin du fichier: app/(protected)/admin/utilisateurs/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { UserRole } from '@prisma/client'
import { 
  Search, 
  Plus, 
  Filter,
  RefreshCw,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash,
  UserPlus,
  Mail,
  Users as UsersIcon
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { UserCreateModal } from '@/components/admin/user-create-modal'
import { UserEditModal } from '@/components/admin/user-edit-modal'
import { UserDeleteConfirmModal } from '@/components/admin/user-delete-confirm-modal'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: UserRole
  emailVerified: Date | null
  createdAt: string
  producer?: {
    id: string
    companyName: string | null
  } | null
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User | null,
    direction: 'ascending' | 'descending'
  }>({ key: 'createdAt', direction: 'descending' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des utilisateurs')
      }
      
      const data = await response.json()
      setUsers(data.users || data)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const requestSort = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0
    
    const key = sortConfig.key
    
    if (a[key] === null && b[key] === null) return 0
    if (a[key] === null) return sortConfig.direction === 'ascending' ? -1 : 1
    if (b[key] === null) return sortConfig.direction === 'ascending' ? 1 : -1
    
    if (key === 'createdAt' || key === 'emailVerified') {
      const dateA = a[key] ? new Date(a[key] as string).getTime() : 0
      const dateB = b[key] ? new Date(b[key] as string).getTime() : 0
      
      return sortConfig.direction === 'ascending'
        ? dateA - dateB
        : dateB - dateA
    }
    
    if (typeof a[key] === 'string' && typeof b[key] === 'string') {
      return sortConfig.direction === 'ascending'
        ? (a[key] as string).localeCompare(b[key] as string)
        : (b[key] as string).localeCompare(a[key] as string)
    }
    
    return sortConfig.direction === 'ascending'
      ? (a[key] as any) > (b[key] as any) ? 1 : -1
      : (b[key] as any) > (a[key] as any) ? 1 : -1
  })

  const filteredUsers = sortedUsers.filter(user => {
    const matchesSearch = 
      searchQuery === '' ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'ALL' ||
      user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  })

  const handleCreateUser = async (userData: Partial<User>) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'utilisateur')
      }
      
      const newUser = await response.json()
      setUsers(prev => [...prev, newUser])
      setIsCreateModalOpen(false)
      
      toast({
        title: "Utilisateur créé",
        description: `L'utilisateur ${newUser.email} a été créé avec succès`
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de créer l'utilisateur",
        variant: "destructive"
      })
    }
  }

  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'utilisateur')
      }
      
      const updatedUser = await response.json()
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user))
      setEditingUser(null)
      
      toast({
        title: "Utilisateur mis à jour",
        description: `Les informations de ${updatedUser.email} ont été mises à jour`
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'utilisateur')
      }
      
      setUsers(prev => prev.filter(user => user.id !== userId))
      setUserToDelete(null)
      
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès"
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      })
    }
  }

  const sendInviteEmail = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/invite`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'invitation')
      }
      
      toast({
        title: "Invitation envoyée",
        description: "L'email d'invitation a été envoyé avec succès"
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'invitation",
        variant: "destructive"
      })
    }
  }

  const resetUserPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation du mot de passe')
      }
      
      toast({
        title: "Mot de passe réinitialisé",
        description: "Un email de réinitialisation a été envoyé à l'utilisateur"
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe",
        variant: "destructive"
      })
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'PRODUCER':
        return 'default'
      case 'CLIENT':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header avec nouveau design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-3">
            <UsersIcon className="h-8 w-8" />
            Utilisateurs
          </h1>
          <p className="mt-2 text-gray-600">
            Administrez les comptes utilisateurs et leurs permissions
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-black text-white hover:bg-gray-800 border-2 border-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Barre de recherche et filtres avec nouveau design */}
      <div className="bg-white border-2 border-black rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
            className="px-4 py-2 border-2 border-gray-300 rounded-md bg-white focus:border-black focus:outline-none"
          >
            <option value="ALL">Tous les rôles</option>
            <option value="ADMIN">Administrateurs</option>
            <option value="PRODUCER">Producteurs</option>
            <option value="CLIENT">Clients</option>
          </select>

          <Button 
            variant="outline" 
            onClick={fetchUsers}
            className="border-2 border-black hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} trouvé{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tableau avec nouveau design */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b-2 border-black">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
                    onClick={() => requestSort('name')}
                  >
                    Nom
                    {sortConfig.key === 'name' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
                    onClick={() => requestSort('email')}
                  >
                    Email
                    {sortConfig.key === 'email' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
                    onClick={() => requestSort('phone')}
                  >
                    Téléphone
                    {sortConfig.key === 'phone' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
                    onClick={() => requestSort('role')}
                  >
                    Rôle
                    {sortConfig.key === 'role' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-black">
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-gray-700"
                    onClick={() => requestSort('createdAt')}
                  >
                    Date d'inscription
                    {sortConfig.key === 'createdAt' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-black">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-5 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-5 bg-gray-200 rounded w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center font-semibold text-gray-700">
                          {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-black">{user.name || '---'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.phone || '---'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="border-2">
                        {user.role}
                      </Badge>
                      {user.role === 'PRODUCER' && user.producer && (
                        <div className="mt-1 text-xs text-gray-500">
                          {user.producer.companyName || 'Entreprise non définie'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-2 border-black bg-white">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingUser(user)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendInviteEmail(user.id)} className="cursor-pointer">
                            <Mail className="h-4 w-4 mr-2" />
                            Envoyer invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetUserPassword(user.id)} className="cursor-pointer">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Réinitialiser mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setUserToDelete(user)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <UserCreateModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />

      {editingUser && (
        <UserEditModal 
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(data) => handleUpdateUser(editingUser.id, data)}
          user={editingUser}
        />
      )}

      {userToDelete && (
        <UserDeleteConfirmModal 
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={() => handleDeleteUser(userToDelete.id)}
          userName={userToDelete.name || userToDelete.email}
        />
      )}
    </div>
  )
}