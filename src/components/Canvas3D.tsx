import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Sky, ContactShadows } from '@react-three/drei';
import { DesignItem } from '../types';
import * as THREE from 'three';

interface Props {
  items: DesignItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
}

function Item3D({ item, isSelected, onSelect }: { item: DesignItem, isSelected: boolean, onSelect: () => void }) {
  const isRoom = item.assetId === 'room-square' || item.assetId === 'floor-surface';
  
  // vertical heights (Y axis scale)
  let verticalHeight = 20; 
  if (item.assetId === 'wall-segment') verticalHeight = 250;
  if (item.assetId === 'door-single') verticalHeight = 210;
  if (item.assetId === 'window-standard') verticalHeight = 150;
  if (item.category === 'Furniture') {
      if (item.name.includes('Sofa')) verticalHeight = 70;
      if (item.name.includes('Bed')) verticalHeight = 50;
      if (item.name.includes('Table')) verticalHeight = 85;
      if (item.name.includes('Chair')) verticalHeight = 90;
      if (item.name.includes('TV')) verticalHeight = 45;
  }
  if (item.category === 'Plumbing') {
      if (item.name.includes('Toilet')) verticalHeight = 80;
      if (item.name.includes('Sink')) verticalHeight = 85;
  }

  // vertical positions (Y axis translation)
  let yPos = verticalHeight / 2;
  if (item.assetId === 'window-standard') yPos = 90 + verticalHeight / 2; 

  if (item.assetId === 'wall-segment') {
    return (
      <mesh 
        position={[item.x, verticalHeight / 2, item.y]} 
        rotation={[0, -item.rotation * (Math.PI / 180), 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <boxGeometry args={[item.width, verticalHeight, item.height]} />
        <meshStandardMaterial color={isSelected ? '#60a5fa' : item.color} />
      </mesh>
    );
  }

  if (isRoom) {
     if (item.points) {
         const shape = new THREE.Shape();
         item.points.forEach((p, i) => {
             if (i === 0) shape.moveTo(p.x, p.y);
             else shape.lineTo(p.x, p.y);
         });
         return (
             <mesh position={[item.x, 0.1, item.y]} rotation={[-Math.PI / 2, 0, 0]}>
                 <shapeGeometry args={[shape]} />
                 <meshStandardMaterial color={item.color} side={THREE.DoubleSide} />
             </mesh>
         )
     }
     return (
        <mesh 
          position={[item.x, 0.1, item.y]} 
          rotation={[-Math.PI / 2, 0, -item.rotation * Math.PI / 180]}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          <planeGeometry args={[item.width, item.height]} />
          <meshStandardMaterial color={isSelected ? '#a5b4fc' : item.color} side={THREE.DoubleSide} />
        </mesh>
     );
  }

  return (
    <mesh 
      position={[item.x, yPos, item.y]} 
      rotation={[0, -item.rotation * (Math.PI / 180), 0]}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <boxGeometry args={[item.width, verticalHeight, item.height]} />
      <meshStandardMaterial color={isSelected ? '#60a5fa' : item.color} />
    </mesh>
  );
}

export default function Canvas3D({ items, selectedItemId, onSelectItem }: Props) {
  return (
    <div className="absolute inset-0 bg-[#e5e7eb]">
      <Canvas shadows camera={{ position: [0, 400, 600], fov: 50 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[100, 200, 100]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
        
        <Suspense fallback={null}>
            <Environment preset="city" />
            <group>
                {items.map(item => (
                <Item3D 
                    key={item.id} 
                    item={item} 
                    isSelected={selectedItemId === item.id}
                    onSelect={() => onSelectItem(item.id)}
                />
                ))}
            </group>
            
            <ContactShadows resolution={1024} scale={1000} blur={2} opacity={0.5} far={100} color="#000000" />
            
            <Grid infiniteGrid fadeDistance={2000} sectionColor="#94a3b8" cellColor="#cbd5e1" position={[0, 0, 0]} />
        </Suspense>

        <OrbitControls makeDefault minDistance={100} maxDistance={2000} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm text-sm font-medium text-gray-700 pointer-events-none">
        3D Preview Mode (Read-only)
      </div>
    </div>
  );
}
