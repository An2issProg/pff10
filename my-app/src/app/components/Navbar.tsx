'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiShoppingCart } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkLoginStatus();
    updateCartCount();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token') {
        checkLoginStatus();
      } else if (event.key === 'panier') {
        updateCartCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for cart updates within the same tab
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const updateCartCount = () => {
    const cart = localStorage.getItem('panier');
    if (cart) {
      try {
        const parsedCart = JSON.parse(cart);
        const count = Array.isArray(parsedCart) 
          ? parsedCart.reduce((total, item) => total + (item.quantity || 0), 0)
          : 0;
        setCartItemsCount(count);
      } catch (e) {
        setCartItemsCount(0);
      }
    } else {
      setCartItemsCount(0);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-20 py-4 bg-black/20 backdrop-blur-lg border-b border-white/10"
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center" aria-label="Accueil YallaClean">
          <Image
            src="/96539f82-301e-4773-9046-8111bea17b62.webp"
            alt="Logo YallaClean"
            width={52}
            height={52}
            priority
            className="h-13 w-13 object-contain drop-shadow-lg"
          />
        </Link>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link href="/panier" className="relative text-white/80 hover:text-white transition-all duration-300">
                <FiShoppingCart className="w-6 h-6" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount > 9 ? '9+' : cartItemsCount}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full font-semibold hover:from-red-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-sky-500 to-emerald-500 text-white px-6 py-2 rounded-full font-semibold hover:from-sky-400 hover:to-emerald-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
