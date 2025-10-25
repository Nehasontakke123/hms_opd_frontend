import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate()

  const loginCards = [
    {
      title: 'Admin Login',
      description: 'Manage doctors and receptionists, view all users',
      icon: '👨‍💼',
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      route: '/admin'
    },
    {
      title: 'Doctor Login',
      description: 'View patients, create prescriptions',
      icon: '🩺',
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      route: '/doctor'
    },
    {
      title: 'Receptionist Login',
      description: 'Register patients and generate tokens',
      icon: '💁‍♀️',
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
      route: '/receptionist'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center">
            Tekisky Hospital
          </h1>
          <p className="text-center text-gray-600 mt-2">OPD Management System</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Welcome to OPD System
          </h2>
          <p className="text-lg text-gray-600">
            Please select your role to continue
          </p>
        </div>

        {/* Login Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {loginCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className={`
                relative overflow-hidden bg-white rounded-2xl shadow-lg
                transform transition-all duration-300 cursor-pointer
                hover:scale-105 hover:shadow-2xl
                border-2 border-transparent hover:border-gray-200
              `}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5`}></div>
              
              {/* Content */}
              <div className="relative p-8">
                {/* Icon */}
                <div className="text-6xl mb-6 text-center">
                  {card.icon}
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
                  {card.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 text-center mb-6">
                  {card.description}
                </p>
                
                {/* Button */}
                <button
                  className={`
                    w-full py-3 px-6 rounded-lg font-semibold text-white
                    bg-gradient-to-r ${card.color} ${card.hoverColor}
                    transform transition-all duration-200
                    hover:shadow-lg
                  `}
                >
                  Login
                </button>
              </div>
              
              {/* Hover Effect Gradient */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${card.color}
                opacity-0 hover:opacity-10 transition-opacity duration-300
              `}></div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 Tekisky Hospital. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
