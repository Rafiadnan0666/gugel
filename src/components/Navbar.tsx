'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  // if there is a user logged in, show the dashboard link
  // if there is no user logged in, show the sign-in and sign-up links


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blur border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/next.svg"
              alt="Logo"
              width={100}
              height={24}
              className="h-8 w-auto"
            />
          </Link>



          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/sign-in"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                pathname === '/sign-in'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                pathname === '/sign-up'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 