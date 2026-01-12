import BottleHover from './components/BottleHover'

function App() {
  // Replace these with your actual image paths
  const normalImage = '/Rectangle7.png' // Simple bottle image
  const hoverImage = '/Rectangle8.png'   // Bottle with background

  return (
    <div className="w-full h-screen bg-[#E8E9EC] flex items-center justify-center relative">
      <div className="absolute left-60 text-5xl text-blue-900 z-10">
        NATURE'S PUREST
      </div>
      <BottleHover normalImage={normalImage} hoverImage={hoverImage} />
      <div className="absolute right-30 text-5xl text-blue-900">
        FORM OF HYDRATION
      </div>
    </div>
  )
}

export default App
