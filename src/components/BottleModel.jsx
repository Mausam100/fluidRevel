import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function Model(props) {
  const { nodes, materials } = useGLTF('/bottle1.glb')
  return (
    <group {...props} dispose={null}>
      {/* <mesh
        castShadow
        receiveShadow
        geometry={nodes.Plane.geometry}
        material={materials['Material.001']}
      /> */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Plane001.geometry}
        material={materials['Material.002']}
        position={[0, 0, -2.2]}
      />
    </group>
  )
}

useGLTF.preload('/bottle1.glb')