import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate()

  const loginCards = [
    {
      title: 'Admin Login',
      description: 'Manage doctors and receptionists, view all users',
      icon: '👨‍💼',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-700',
      iconShadow: 'shadow-blue-500/50',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700',
      borderColor: 'border-blue-200',
      route: '/admin',
      features: ['User Management', 'System Control', 'Analytics']
    },
    {
      title: 'Medical Login',
      description: 'View patients and prescriptions (read-only)',
      icon: '🏥',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      iconShadow: 'shadow-cyan-500/50',
      gradient: 'from-cyan-500 via-teal-500 to-blue-500',
      hoverGradient: 'hover:from-cyan-600 hover:via-teal-600 hover:to-blue-600',
      borderColor: 'border-cyan-200',
      route: '/medical',
      features: ['View Records', 'Prescription Access', 'Read-Only Mode']
    },
    {
      title: 'Doctor Login',
      description: 'View patients, create prescriptions',
      icon: '🩺',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      iconShadow: 'shadow-purple-500/50',
      gradient: 'from-purple-500 via-purple-600 to-pink-600',
      hoverGradient: 'hover:from-purple-600 hover:via-purple-700 hover:to-pink-700',
      borderColor: 'border-purple-200',
      route: '/doctor',
      features: ['Patient Care', 'Prescription Creation', 'Medical Records']
    },
    {
      title: 'Receptionist Login',
      description: 'Register patients and generate tokens',
      icon: '💁‍♀️',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      iconShadow: 'shadow-green-500/50',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      hoverGradient: 'hover:from-green-600 hover:via-emerald-600 hover:to-teal-600',
      borderColor: 'border-green-200',
      route: '/receptionist',
      features: ['Patient Registration', 'Token Generation', 'Appointment Management']
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <span className="text-3xl">🏥</span>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Tekisky Hospital
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 font-medium">OPD Management System</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <div className="h-1 w-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <div className="h-1 w-12 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Welcome to OPD System
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Please select your role to continue accessing the hospital management system
          </p>
        </div>

        {/* Login Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {loginCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className={`
                group relative overflow-hidden
                bg-white/90 backdrop-blur-sm rounded-3xl
                border-2 ${card.borderColor}
                shadow-xl hover:shadow-2xl
                transform transition-all duration-500 cursor-pointer
                hover:scale-105 hover:-translate-y-2
                hover:border-opacity-100
              `}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Animated Gradient Background */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${card.gradient}
                opacity-0 group-hover:opacity-5 transition-opacity duration-500
              `}></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Content */}
              <div className="relative p-6 sm:p-8">
                {/* Icon Container */}
                <div className="flex justify-center mb-6">
                  <div className={`
                    relative w-20 h-20 ${card.iconBg} rounded-2xl
                    shadow-lg ${card.iconShadow}
                    flex items-center justify-center
                    transform group-hover:scale-110 group-hover:rotate-6
                    transition-all duration-300
                  `}>
                    <span className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                      {card.icon}
                    </span>
                    {/* Icon Glow */}
                    <div className={`
                      absolute inset-0 ${card.iconBg} rounded-2xl
                      opacity-0 group-hover:opacity-50 blur-xl
                      transition-opacity duration-300
                    `}></div>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 text-center group-hover:text-gray-900 transition-colors">
                  {card.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 text-center mb-6 text-sm sm:text-base leading-relaxed">
                  {card.description}
                </p>
                
                {/* Features List */}
                <div className="mb-6 space-y-2">
                  {card.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${card.gradient}`}></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* Button */}
                <button
                  className={`
                    w-full py-3.5 px-6 rounded-xl font-semibold text-white
                    bg-gradient-to-r ${card.gradient} ${card.hoverGradient}
                    transform transition-all duration-300
                    shadow-lg group-hover:shadow-xl
                    relative overflow-hidden
                    group-hover:scale-105
                  `}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <span>Login</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  {/* Button Shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
              
              {/* Corner Accent */}
              <div className={`
                absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient}
                opacity-0 group-hover:opacity-10 rounded-bl-full
                transition-opacity duration-500
              `}></div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-gray-600 text-sm font-medium">
              Secure • Reliable • Professional
            </p>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            © 2025 Tekisky Hospital. All rights reserved.
          </p>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default Home
