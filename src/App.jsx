import BottleHover from './components/BottleHover'

function App() {
  // Replace these with your actual image paths
  const normalImage = '/bottle3.png' // Simple bottle image
  const hoverImage = '/withbackground.png'   // Bottle with background

  return (
    <div className="w-full h-screen bg-black">
      <BottleHover normalImage={normalImage} hoverImage={hoverImage} />
    </div>
  )
}

export default App
