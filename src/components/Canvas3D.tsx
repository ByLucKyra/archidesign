import React, { Suspense, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Sky, ContactShadows, Line, Html } from '@react-three/drei';
import { DesignItem } from '../types';
import * as THREE from 'three';
import { Ruler, X, MousePointer2 } from 'lucide-react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface Props {
  items: DesignItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<DesignItem>) => void;
}

export const getMaterialProps = (material: string | undefined, color: string, isSelected: boolean) => {
  const materialProps: any = {
    color: isSelected ? '#a5b4fc' : color,
  };

  if (!isSelected) {
    switch (material) {
      case 'wood':
        materialProps.roughness = 0.4;
        materialProps.metalness = 0.05;
        materialProps.clearcoat = 0.2;
        materialProps.clearcoatRoughness = 0.3;
        break;
      case 'tile':
        materialProps.roughness = 0.1;
        materialProps.metalness = 0.05;
        materialProps.clearcoat = 0.8;
        materialProps.clearcoatRoughness = 0.1;
        break;
      case 'paint':
        materialProps.roughness = 0.6;
        materialProps.metalness = 0.1;
        materialProps.clearcoat = 0.05;
        break;
      case 'concrete':
        materialProps.roughness = 0.9;
        materialProps.metalness = 0;
        break;
      case 'fabric':
        materialProps.roughness = 1.0;
        materialProps.sheen = 1.0;
        materialProps.sheenRoughness = 0.8;
        materialProps.sheenColor = color;
        materialProps.color = color;
        break;
      case 'glossy':
        materialProps.roughness = 0.05;
        materialProps.metalness = 0.1;
        materialProps.clearcoat = 1.0;
        materialProps.clearcoatRoughness = 0.05;
        break;
      case 'matte':
        materialProps.roughness = 0.9;
        materialProps.metalness = 0.0;
        materialProps.clearcoat = 0.0;
        break;
      case 'metallic':
        materialProps.roughness = 0.2;
        materialProps.metalness = 1.0;
        materialProps.clearcoat = 0.3;
        materialProps.clearcoatRoughness = 0.1;
        break;
      default:
        materialProps.roughness = 0.5;
        materialProps.metalness = 0.1;
    }
  } else {
     materialProps.color = '#60a5fa'; // Selected color override
  }
  return materialProps;
};

function CustomModel({ url, type, width, height, verticalHeight, isSelected, itemColor, itemMaterial, modelMeshMaterials, onUpdate }: any) {
  const isGLTF = type === 'glb' || type === 'gltf';
  // Use try/catch behavior by wrapping in Suspense for useLoader
  const gltf = isGLTF ? useLoader(GLTFLoader, url) : null;
  const obj = type === 'obj' ? useLoader(OBJLoader, url) : null;
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);

  // If item is deselected, clear selected mesh
  React.useEffect(() => {
    if (!isSelected) setSelectedMesh(null);
  }, [isSelected]);

  const scene = React.useMemo(() => {
    let clonedScene = null;
    if (gltf) clonedScene = (gltf as any).scene.clone();
    if (obj) clonedScene = (obj as any).clone();
    
    if (clonedScene) {
      clonedScene.traverse((child: any) => {
        if (child.isMesh) {
          const meshName = child.name || 'unnamed';
          const meshSettings = modelMeshMaterials?.[meshName];
          const meshMaterialType = meshSettings?.material || itemMaterial;
          const meshColor = meshSettings?.color || itemColor;

          const isPartSelected = isSelected && selectedMesh === meshName;
          const displayColor = isPartSelected ? '#60a5fa' : meshColor;
          
          const newMaterialProps = getMaterialProps(meshMaterialType, displayColor, false);
          
          child.material = new THREE.MeshPhysicalMaterial({
            ...newMaterialProps,
            side: THREE.DoubleSide
          });
          
          // Adding emissive glow for selected part
          if (isPartSelected) {
             child.material.emissive = new THREE.Color('#3b82f6');
             child.material.emissiveIntensity = 0.5;
          }
        }
      });
    }
    return clonedScene;
  }, [gltf, obj, itemColor, itemMaterial, modelMeshMaterials, isSelected, selectedMesh]);

  const { scale, centerOffset } = React.useMemo(() => {
    if (!scene) return { scale: [1, 1, 1] as [number, number, number], centerOffset: [0, 0, 0] as [number, number, number] };
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    // In our 3D space, Z is height (depth on 2D map), Y is vertical height
    const targetSize = new THREE.Vector3(width, verticalHeight, height);
    
    // Default size to avoid division by zero
    if (size.x === 0) size.x = 1;
    if (size.y === 0) size.y = 1;
    if (size.z === 0) size.z = 1;

    // Scale maintaining aspect ratio, fit inside the target bounding box
    const scaleX = targetSize.x / size.x;
    const scaleY = targetSize.y / size.y;
    const scaleZ = targetSize.z / size.z;
    const minScale = Math.min(scaleX, scaleY, scaleZ);

    const center = new THREE.Vector3();
    box.getCenter(center);
    center.multiplyScalar(minScale);

    return { 
      scale: [minScale, minScale, minScale] as [number, number, number], 
      centerOffset: [-center.x, -center.y, -center.z] as [number, number, number]
    };
  }, [scene, width, height, verticalHeight]);

  if (!scene) return null;

  const handleMeshChange = (key: string, value: string) => {
     if (!selectedMesh) return;
     const currentSettings = modelMeshMaterials?.[selectedMesh] || {};
     
     let colorUpdate = {};
     if (key === 'material') {
        const currentColor = currentSettings.color || itemColor;
        if (currentColor === '#ffffff') {
           if (value === 'wood') colorUpdate = { color: '#8B5A2B' };
           if (value === 'concrete') colorUpdate = { color: '#9ca3af' };
        }
     }

     onUpdate({
       modelMeshMaterials: {
         ...modelMeshMaterials,
         [selectedMesh]: { ...currentSettings, [key]: value, ...colorUpdate }
       }
     });
  };

  return (
    <group>
      <group position={centerOffset} onClick={(e) => {
         if (isSelected && (e.object as any)?.isMesh) {
            e.stopPropagation();
            setSelectedMesh(e.object.name || 'unnamed');
         }
      }}>
        <primitive object={scene} scale={scale} />
      </group>
      
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 2, verticalHeight + 2, height + 2]} />
          <meshBasicMaterial color="#60a5fa" wireframe={true} transparent opacity={0.5} />
        </mesh>
      )}

      {isSelected && selectedMesh && (
        <Html position={[0, verticalHeight / 2 + 20, 0]} center zIndexRange={[100, 0]}>
          <div className="bg-white p-4 rounded-xl shadow-2xl w-60 border border-gray-200 pointer-events-auto select-none"
               onClick={(e) => e.stopPropagation()} // Prevent clicking HTML from deselecting
               onPointerDown={(e) => e.stopPropagation()}
          >
             <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-xs text-gray-800">Part: {selectedMesh}</span>
                <button onClick={() => setSelectedMesh(null)} className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded p-1 transition-colors"><X size={12} /></button>
             </div>
             
             <div className="flex flex-col gap-3">
               <div className="flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-blue-500 rounded-md p-1 transition-all">
                 <label className="text-[10px] text-gray-500 font-semibold">Surface Material</label>
                 <select 
                   value={modelMeshMaterials?.[selectedMesh]?.material || itemMaterial || 'default'}
                   onChange={(e) => handleMeshChange('material', e.target.value)}
                   className="w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-xs text-gray-800 outline-none"
                 >
                   <option value="default">Default Finish</option>
                   <option value="paint">Paint (Matte)</option>
                   <option value="wood">Wood (Polished)</option>
                   <option value="tile">Ceramic Tile</option>
                   <option value="concrete">Concrete / Stone</option>
                   <option value="fabric">Fabric / Carpet</option>
                   <option value="glossy">Glossy Plastic</option>
                   <option value="matte">Matte Plastic</option>
                   <option value="metallic">Metallic</option>
                 </select>
               </div>

               <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] text-gray-500 font-semibold">Base Color Profile</label>
                 <div className="flex gap-2">
                   <div className="relative">
                     <input 
                       type="color" 
                       value={modelMeshMaterials?.[selectedMesh]?.color || itemColor} 
                       onChange={(e) => handleMeshChange('color', e.target.value)}
                       className="w-7 h-7 rounded-md cursor-pointer border border-gray-300 bg-white shadow-sm appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none" 
                     />
                   </div>
                 </div>
               </div>
               
               <button 
                  onClick={() => {
                     const newMaterials = { ...modelMeshMaterials };
                     delete newMaterials[selectedMesh];
                     onUpdate({ modelMeshMaterials: newMaterials });
                     setSelectedMesh(null);
                  }}
                  className="mt-1 w-full text-[10px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
               >
                 Reset to item defaults
               </button>
             </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Item3D({ item, isSelected, onSelect, onUpdate }: { item: DesignItem, isSelected: boolean, onSelect: () => void, onUpdate: (updates: Partial<DesignItem>) => void }) {

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

  const materialProps = getMaterialProps(item.material, item.color, isSelected);

  const renderMaterial = (isRoomType: boolean = false) => {
    return <meshPhysicalMaterial {...materialProps} side={isRoomType ? THREE.DoubleSide : THREE.FrontSide} />;
  }

  if (item.modelUrl) {
    return (
      <group 
        position={[item.x, yPos, item.y]} 
        rotation={[0, -item.rotation * (Math.PI / 180), 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <Suspense fallback={
          <mesh>
             <boxGeometry args={[item.width, verticalHeight, item.height]} />
             <meshStandardMaterial color="#d1d5db" wireframe />
          </mesh>
        }>
          <CustomModel 
            url={item.modelUrl} 
            type={item.modelType} 
            width={item.width} 
            height={item.height} 
            verticalHeight={verticalHeight} 
            isSelected={isSelected}
            itemColor={item.color}
            itemMaterial={item.material}
            modelMeshMaterials={item.modelMeshMaterials}
            onUpdate={onUpdate}
          />
        </Suspense>
        {isSelected && item.category === 'Furniture' && (
           <Html position={[0, verticalHeight / 2 + 15, 0]} center zIndexRange={[100, 0]}>
             <div className="bg-zinc-900/90 text-white px-2.5 py-1 rounded-md text-[10px] font-medium tracking-wide whitespace-nowrap pointer-events-none text-center shadow-xl border border-white/10 backdrop-blur-md">
                W: {item.width}cm &times; D: {item.height}cm &times; H: {verticalHeight}cm
             </div>
           </Html>
        )}
      </group>
    );
  }

  if (item.assetId === 'wall-segment') {
    return (
      <mesh 
        position={[item.x, verticalHeight / 2, item.y]} 
        rotation={[0, -item.rotation * (Math.PI / 180), 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <boxGeometry args={[item.width, verticalHeight, item.height]} />
        {renderMaterial()}
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
                 {renderMaterial(true)}
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
          {renderMaterial(true)}
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
      {renderMaterial()}
      {isSelected && item.category === 'Furniture' && (
         <Html position={[0, verticalHeight / 2 + 15, 0]} center zIndexRange={[100, 0]}>
           <div className="bg-zinc-900/90 text-white px-2.5 py-1 rounded-md text-[10px] font-medium tracking-wide whitespace-nowrap pointer-events-none text-center shadow-xl border border-white/10 backdrop-blur-md">
              W: {item.width}cm &times; D: {item.height}cm &times; H: {verticalHeight}cm
           </div>
         </Html>
      )}
    </mesh>
  );
}

export default function Canvas3D({ items, selectedItemId, onSelectItem, onUpdateItem }: Props) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  const handlePointerDown = (e: any) => {
    if (!isMeasuring) return;
    e.stopPropagation();
    if (measurePoints.length >= 2) {
      setMeasurePoints([e.point.clone()]);
    } else {
      setMeasurePoints([...measurePoints, e.point.clone()]);
    }
  };

  const distance = measurePoints.length === 2 ? measurePoints[0].distanceTo(measurePoints[1]) : 0;

  return (
    <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-zinc-900">
      <Canvas shadows camera={{ position: [0, 400, 600], fov: 50 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[100, 200, 100]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
        
        <Suspense fallback={null}>
            <Environment preset="city" />
            <group onPointerDown={handlePointerDown}>
                <mesh position={[0, -0.1, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                  <planeGeometry args={[10000, 10000]} />
                  <meshBasicMaterial visible={false} />
                </mesh>
                {items.map(item => (
                <Item3D 
                    key={item.id} 
                    item={item} 
                    isSelected={selectedItemId === item.id}
                    onSelect={() => !isMeasuring && onSelectItem(item.id)}
                    onUpdate={(updates) => onUpdateItem(item.id, updates)}
                />
                ))}
            </group>
            
            {measurePoints.map((p, i) => (
              <mesh key={i} position={p}>
                <sphereGeometry args={[2.5, 16, 16]} />
                <meshBasicMaterial color="#ef4444" depthTest={false} />
              </mesh>
            ))}

            {measurePoints.length === 2 && (
              <>
                <Line points={[measurePoints[0], measurePoints[1]]} color="#ef4444" lineWidth={3} depthTest={false} />
                <Html position={measurePoints[0].clone().lerp(measurePoints[1], 0.5)} center zIndexRange={[100, 0]}>
                  <div className="bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-xl border border-red-400/50 text-xs font-bold pointer-events-none whitespace-nowrap">
                    {distance.toFixed(1)} cm
                  </div>
                </Html>
              </>
            )}

            <ContactShadows resolution={1024} scale={1000} blur={2} opacity={0.5} far={100} color="#000000" />
            
            <Grid infiniteGrid fadeDistance={2000} sectionColor="#94a3b8" cellColor="#cbd5e1" position={[0, 0, 0]} />
        </Suspense>

        <OrbitControls makeDefault minDistance={50} maxDistance={2000} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
      
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-200 pointer-events-none">
          3D Preview
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 p-1 flex gap-1 pointer-events-auto">
          <button 
            className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${!isMeasuring ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
            onClick={() => setIsMeasuring(false)}
            title="Select/View"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button 
            className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${isMeasuring ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
            onClick={() => setIsMeasuring(true)}
            title="Measure Distance"
          >
            <Ruler className="w-4 h-4" />
          </button>
        </div>
        
        {isMeasuring && measurePoints.length > 0 && (
          <button 
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700 px-3 py-1.5 flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors pointer-events-auto"
            onClick={() => setMeasurePoints([])}
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {isMeasuring && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-xl pointer-events-none">
          {measurePoints.length === 0 && "Click anywhere to place the first point"}
          {measurePoints.length === 1 && "Click a second point to measure distance"}
          {measurePoints.length === 2 && "Measurement complete. Click to start a new measurement."}
        </div>
      )}
    </div>
  );
}
