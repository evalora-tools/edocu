import Link from 'next/link';

const Header = () => {
  return (
    <header className="w-full glass-effect fixed top-0 z-50 border-b border-gray-100">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-3xl">📚</span>
            Academia Castiñeira
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/asignaturas" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Asignaturas
            </Link>
            <Link 
              href="/horarios" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Horarios
            </Link>
            <Link 
              href="/contacto" 
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Contacto
            </Link>
            <Link 
              href="/acceder"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 font-medium shadow-md hover:shadow-lg"
            >
              Acceder
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;