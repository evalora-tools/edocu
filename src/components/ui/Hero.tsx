import Link from 'next/link';

const Hero = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Encuentra las Mejores Academias Online
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            Accede a clases grabadas de calidad y aprende a tu propio ritmo con las mejores academias.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/academias"
              className="bg-white text-blue-600 px-8 py-3 rounded-md font-semibold hover:bg-blue-50 transition-colors"
            >
              Explorar Academias
            </Link>
            <Link
              href="/registro"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white/10 transition-colors"
            >
              Registrar Academia
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;