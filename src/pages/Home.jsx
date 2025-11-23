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
      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-1.5 sm:mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <span className="text-xl sm:text-2xl md:text-2xl">🏥</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 sm:mb-1.5">
              Tekisky Hospital +
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium">OPD Management System</p>
            <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-1 sm:gap-1.5">
              <div className="h-0.5 sm:h-0.5 md:h-1 w-6 sm:w-8 md:w-10 lg:w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <div className="h-0.5 sm:h-0.5 md:h-1 w-1 sm:w-1.5 md:w-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <div className="h-0.5 sm:h-0.5 md:h-1 w-6 sm:w-8 md:w-10 lg:w-12 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 sm:mb-3">
            Welcome to OPD System
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Please select your role to continue accessing the hospital management system
          </p>
        </div>

        {/* Login Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {loginCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className={`
                group relative overflow-hidden
                bg-white rounded-2xl sm:rounded-3xl
                border border-gray-200 ${card.borderColor}
                shadow-md hover:shadow-xl
                transform transition-all duration-300 cursor-pointer
                active:scale-[0.98] sm:hover:scale-[1.02] sm:hover:-translate-y-1
                hover:border-opacity-100
              `}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Animated Gradient Background */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${card.gradient}
                opacity-0 group-hover:opacity-5 transition-opacity duration-300
              `}></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Content */}
              <div className="relative p-3 sm:p-4 md:p-5">
                {/* Icon Container */}
                <div className="flex justify-center mb-2.5 sm:mb-3">
                  <div className={`
                    relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 ${card.iconBg} rounded-xl sm:rounded-xl md:rounded-2xl
                    shadow-md ${card.iconShadow}
                    flex items-center justify-center
                    transform group-active:scale-95 sm:group-hover:scale-110 sm:group-hover:rotate-6
                    transition-all duration-300
                  `}>
                    <span className="text-2xl sm:text-3xl md:text-4xl transform group-active:scale-95 sm:group-hover:scale-110 transition-transform duration-300">
                      {card.icon}
                    </span>
                    {/* Icon Glow */}
                    <div className={`
                      absolute inset-0 ${card.iconBg} rounded-xl sm:rounded-2xl
                      opacity-0 group-hover:opacity-50 blur-xl
                      transition-opacity duration-300
                    `}></div>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2 text-center group-hover:text-gray-900 transition-colors">
                  {card.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 text-center mb-3 sm:mb-3.5 text-xs sm:text-sm md:text-base leading-snug sm:leading-relaxed px-1">
                  {card.description}
                </p>
                
                {/* Features List */}
                <div className="mb-3 space-y-1 sm:space-y-1.5">
                  {card.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-gray-500">
                      <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-r ${card.gradient} flex-shrink-0`}></div>
                      <span className="leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* Button */}
                <button
                  className={`
                    w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-lg font-semibold text-white text-xs sm:text-sm md:text-base
                    bg-gradient-to-r ${card.gradient} ${card.hoverGradient}
                    transform transition-all duration-300
                    shadow-md hover:shadow-lg active:shadow-sm
                    relative overflow-hidden
                    active:scale-[0.97] sm:hover:scale-[1.02]
                    touch-manipulation
                    flex items-center justify-center
                    min-h-[40px] sm:min-h-[44px]
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(card.route)
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                    <span>Login</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform group-hover:translate-x-0.5 sm:group-hover:translate-x-1 transition-transform duration-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  {/* Button Shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
              
              {/* Corner Accent */}
              <div className={`
                absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br ${card.gradient}
                opacity-0 group-hover:opacity-10 rounded-bl-full
                transition-opacity duration-500
              `}></div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-gray-200/50">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
            <p className="text-gray-600 text-xs sm:text-sm font-medium">
              Secure • Reliable • Professional
            </p>
          </div>
          <p className="text-gray-500 text-[10px] sm:text-xs mt-3 sm:mt-4">
            © 2025 Tekisky Hospital +. All rights reserved.
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
