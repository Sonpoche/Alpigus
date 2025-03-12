// jest.setup.js
require('@testing-library/jest-dom');

// Mock NextAuth
jest.mock('next-auth', () => {
  const mockSession = {
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
    user: { 
      id: 'test-client',
      role: 'CLIENT',
      email: 'test@test.com',
      phone: '+33600000000'
    }
  };

  return {
    __esModule: true,
    default: () => {
      return {
        GET: jest.fn(() => Promise.resolve(mockSession)),
        POST: jest.fn(() => Promise.resolve(mockSession))
      }
    },
    getServerSession: jest.fn(() => Promise.resolve(mockSession))
  }
});

// Mock auth adapter
jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn()
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn()
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ 
    data: { 
      user: { 
        id: 'test-client',
        role: 'CLIENT',
        email: 'test@test.com',
        phone: '+33600000000'
      },
      expires: new Date(Date.now() + 2 * 86400).toISOString()
    }, 
    status: 'authenticated' 
  }))
}));

// Mock the auth options
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {
    adapter: {},
    providers: [],
    session: { strategy: 'jwt' },
    callbacks: {}
  }
}));