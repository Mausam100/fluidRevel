import BottleHover from './components/BottleHover'

function App() {
  // Replace these with your actual image paths
  const normalImage = '/Rectangle7.png' // Simple bottle image
  const hoverImage = '/Rectangle8.png'   // Bottle with background

  return (
    <div className="w-full h-screen bg-[#E8E9EC] flex items-center justify-center relative">
      <div className="absolute left-60 text-5xl text-nowrap w-96 h-80 hover:text-white flex items-center justify-center  text-blue-900 z-10">
        NATURE'S PUREST
      </div>
      <BottleHover normalImage={normalImage} hoverImage={hoverImage} />
      <div className="absolute w-96 h-80 hover:text-white right-40 text-5xl flex items-center justify-center text-nowrap text-blue-900 ">
        FORM OF HYDRATION
      </div>
    </div>
  )
}

export default App
