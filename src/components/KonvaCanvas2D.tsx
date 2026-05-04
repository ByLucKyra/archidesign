import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Circle, Shape } from 'react-konva';
import { DesignItem } from '../types';
import { ASSET_LIBRARY } from '../lib/constants';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  items: DesignItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<DesignItem>) => void;
  activeTool: string;
  setActiveTool: (tool: any) => void;
  onDrawComplete: (item: DesignItem, keepSelected?: boolean) => void;
  onDeleteItem: (id: string) => void;
  placeAssetId: string | null;
}

export default function KonvaCanvas2D({ items, selectedItemId, onSelectItem, onUpdateItem, activeTool, setActiveTool, onDrawComplete, onDeleteItem, placeAssetId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [transform, setTransform] = useState({ x: 0, y: 0, z: 1 });
  const [draftState, setDraftState] = useState<any>(null);
  const [pointerPos, setPointerPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeTool === 'select') setDraftState(null);
  }, [activeTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId && document.activeElement?.tagName !== 'INPUT') {
        onDeleteItem(selectedItemId);
      }
      if (e.key === 'Escape') {
        setDraftState(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, activeTool, onDeleteItem, setActiveTool]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const zoomSensitivity = e.evt.ctrlKey ? 0.05 : 0.02;
    const delta = -e.evt.deltaY * zoomSensitivity;
    
    const oldScale = transform.z;
    let newScale = oldScale * Math.exp(delta);
    newScale = Math.min(Math.max(newScale, 0.05), 10);

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - transform.x) / oldScale,
      y: (pointer.y - transform.y) / oldScale,
    };

    setTransform({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
      z: newScale,
    });
  };

  const getPointerCoord = (stagePoint: {x: number, y: number}, checkSnap: boolean = true) => {
    const xUnsnapped = (stagePoint.x - transform.x) / transform.z;
    const yUnsnapped = (stagePoint.y - transform.y) / transform.z;

    const snap = 10;
    let x = Math.round(xUnsnapped / snap) * snap;
    let y = Math.round(yUnsnapped / snap) * snap;
    
    if (checkSnap && ['draw-wall', 'draw-room', 'place-item'].includes(activeTool)) {
       let minDistance = 20; 
       items.forEach((item: DesignItem) => {
           if (item.assetId === 'wall-segment') {
               const angle = item.rotation * Math.PI / 180;
               const trueLength = item.width - item.height;
               const dx = (trueLength / 2) * Math.cos(angle);
               const dy = (trueLength / 2) * Math.sin(angle);
               
               const p1 = { x: item.x - dx, y: item.y - dy };
               const p2 = { x: item.x + dx, y: item.y + dy };
               
               [p1, p2].forEach(p => {
                   const dist = Math.sqrt((p.x - xUnsnapped)**2 + (p.y - yUnsnapped)**2);
                   if (dist < minDistance) {
                       minDistance = dist;
                       x = p.x;
                       y = p.y;
                   }
               });
           }
       });
    }
    return { x, y };
  };

  const handlePointerDown = (e: any) => {
    const stage = e.target.getStage();
    const stagePoint = stage.getPointerPosition();
    if (!stagePoint) return;
    
    const coord = getPointerCoord(stagePoint);

    // Pan with middle click
    if (e.evt.button === 1 || e.evt.button === 2) {
      if (e.evt.button === 2 && draftState) {
         setDraftState(null);
         setActiveTool('select');
      }
      return; 
    }

    if (e.evt.button === 0 || e.evt.pointerType === 'touch' || e.evt.button === undefined) {
      if (activeTool === 'select') {
        if (e.target === stage) {
            onSelectItem(null);
        }
      } else if (activeTool === 'place-item' && placeAssetId) {
        const asset = ASSET_LIBRARY.find(a => a.id === placeAssetId);
        if (asset) {
          onDrawComplete({
            id: `item-${Date.now()}`,
            assetId: asset.id,
            name: asset.name,
            x: coord.x,
            y: coord.y,
            width: asset.defaultWidth,
            height: asset.defaultHeight,
            rotation: 0,
            color: asset.defaultColor
          });
        }
      } else if (activeTool === 'draw-wall' || activeTool === 'draw-room') {
        let snapCoord = coord;
        if (activeTool === 'draw-wall') {
           const gridSize = 10;
           snapCoord = { x: Math.round(coord.x / gridSize) * gridSize, y: Math.round(coord.y / gridSize) * gridSize };
        }

        if (!draftState) {
          setDraftState({
            startX: snapCoord.x,
            startY: snapCoord.y,
            pointerX: snapCoord.x,
            pointerY: snapCoord.y,
            sequence: [{x: snapCoord.x, y: snapCoord.y}]
          });
        } else {
          // Commit
          commitDraftAction(draftState.pointerX, draftState.pointerY);
        }
      }
    }
  };

  const handlePointerMove = (e: any) => {
    const stage = e.target.getStage();
    const stagePoint = stage.getPointerPosition();
    if (!stagePoint) return;

    const currentCoord = getPointerCoord(stagePoint);
    setPointerPos(currentCoord);

    if (draftState && (activeTool === 'draw-wall' || activeTool === 'draw-room')) {
      let px = currentCoord.x;
      let py = currentCoord.y;
      let currentInferences: {x: number, y: number}[] = [];

      if (activeTool === 'draw-wall') {
          const gridSize = 10;
          px = Math.round(px / gridSize) * gridSize;
          py = Math.round(py / gridSize) * gridSize;
          const dx = Math.abs(px - draftState.startX);
          const dy = Math.abs(py - draftState.startY);
          const angle = Math.atan2(py - draftState.startY, px - draftState.startX) * 180 / Math.PI;
          const normalizedAngle = (angle + 360) % 360;
          const isNearOrthogonal = (normalizedAngle % 90 < 10) || (normalizedAngle % 90 > 80);
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (e.evt.shiftKey || (isNearOrthogonal && dist > 20)) {
             if (dx < dy) { px = draftState.startX; }
             else { py = draftState.startY; }
          }
          
          // Simplified inference gathering for Konva Demo
          if (draftState.sequence && draftState.sequence.length >= 3) {
              const startPoint = draftState.sequence[0];
              if (Math.sqrt((px - startPoint.x)**2 + (py - startPoint.y)**2) < 30) {
                  px = startPoint.x;
                  py = startPoint.y;
              }
          }
      }
      setDraftState({ ...draftState, pointerX: px, pointerY: py, inferences: currentInferences });
    }
  };

  const handlePointerUp = (e: any) => {
    if (!draftState) return;
    
    const stage = e.target.getStage();
    const stagePoint = stage.getPointerPosition();
    if (!stagePoint) return;
    
    // Check if dragging happened by measuring distance from start
    const dist = Math.sqrt(Math.pow(draftState.pointerX - draftState.startX, 2) + Math.pow(draftState.pointerY - draftState.startY, 2));
    if (dist > 10) {
       // Drag to draw completed! Commit it.
       if (activeTool === 'draw-wall' || activeTool === 'draw-room') {
           commitDraftAction(draftState.pointerX, draftState.pointerY);
           // After a drag commit, end the drafting sequence to avoid confusing continuing lines
           setDraftState(null);
           setActiveTool('select');
       }
    }
  };

  const commitDraftAction = (finalX: number, finalY: number) => {
    const sq = draftState.sequence || [{x: draftState.startX, y: draftState.startY}];
    let isClosed = false;

    if (activeTool === 'draw-wall' && sq.length >= 3) {
        if (Math.sqrt((finalX - sq[0].x)**2 + (finalY - sq[0].y)**2) < 20) {
            finalX = sq[0].x;
            finalY = sq[0].y;
            isClosed = true;
        }
    }

    const newWallId = commitDraftLogic(draftState.startX, draftState.startY, finalX, finalY);

    if (activeTool === 'draw-wall') {
      if (isClosed) {
        const newSequence = [...sq, {x: finalX, y: finalY}];
        const minX = Math.min(...newSequence.map(p => p.x));
        const maxX = Math.max(...newSequence.map(p => p.x));
        const minY = Math.min(...newSequence.map(p => p.y));
        const maxY = Math.max(...newSequence.map(p => p.y));
        
        onDrawComplete({
          id: `floor-${Date.now()}`,
          assetId: 'floor-surface',
          name: 'Floor Surface',
          x: minX + (maxX - minX) / 2,
          y: minY + (maxY - minY) / 2,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
          color: '#f8fafc',
          points: newSequence.map(p => ({
            x: p.x - (minX + (maxX - minX) / 2),
            y: p.y - (minY + (maxY - minY) / 2)
          }))
        }, false);

        setDraftState(null);
        setActiveTool('select');
      } else {
        setDraftState({
           startX: finalX, startY: finalY, pointerX: finalX, pointerY: finalY,
           sequence: [...sq, {x: finalX, y: finalY}],
           wallIds: [...(draftState.wallIds || []), newWallId].filter(Boolean) as string[]
        });
      }
    } else {
      setDraftState(null);
      setActiveTool('select');
    }
  };

  const commitDraftLogic = (x1: number, y1: number, x2: number, y2: number) => {
    if (activeTool === 'draw-wall') {
      const asset = ASSET_LIBRARY.find(a => a.id === 'wall-segment')!;
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rot = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      const id = `wall-${Date.now()}`;
      onDrawComplete({
        id, assetId: asset.id, name: asset.name, x: cx, y: cy,
        width: length + asset.defaultHeight, height: asset.defaultHeight,
        rotation: rot, color: asset.defaultColor, jointType: 'squared'
      });
      return id;
    } else if (activeTool === 'draw-room') {
      const asset = ASSET_LIBRARY.find(a => a.id === 'room-square')!;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const id = `room-${Date.now()}`;
      onDrawComplete({
        id, assetId: asset.id, name: asset.name,
        x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2,
        width: maxX - minX, height: maxY - minY, rotation: 0, color: 'transparent'
      });
      return id;
    }
  };

  const handleZoom = (deltaZ: number) => {
    setTransform(prev => {
      const container = containerRef.current;
      if (!container) return prev;
      
      const rect = container.getBoundingClientRect();
      const newZoom = Math.min(Math.max(prev.z * Math.exp(deltaZ), 0.05), 10);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const contentX = (centerX - prev.x) / prev.z;
      const contentY = (centerY - prev.y) / prev.z;

      const newPanX = centerX - contentX * newZoom;
      const newPanY = centerY - contentY * newZoom;

      return { x: newPanX, y: newPanY, z: newZoom };
    });
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#f0f2f5]"
         onContextMenu={e => { e.preventDefault(); if(draftState) setDraftState(null); else setActiveTool('select'); }}>
      
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        draggable={activeTool === 'select' && !selectedItemId}
        onDragMove={(e) => {
            if (e.target === e.target.getStage()) {
                setTransform({ x: e.target.x(), y: e.target.y(), z: transform.z });
            }
        }}
        onDragEnd={(e) => {
             if (e.target === e.target.getStage()) {
                setTransform({ x: e.target.x(), y: e.target.y(), z: transform.z });
            }
        }}
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer x={transform.x} y={transform.y} scaleX={transform.z} scaleY={transform.z}>
          {/* Background Grid using pure Konva Lines for CAD look */}
          <Shape
            listening={false}
            sceneFunc={(context, shape) => {
              // Dynamic step based on zoom level to prevent extreme line density
              const baseStep = 20;
              let step = baseStep;
              if (transform.z < 0.2) step = baseStep * 5;
              else if (transform.z < 0.5) step = baseStep * 2;
              
              const startX = Math.floor((-transform.x / transform.z) / step) * step;
              const endX = (dimensions.width - transform.x) / transform.z;
              const startY = Math.floor((-transform.y / transform.z) / step) * step;
              const endY = (dimensions.height - transform.y) / transform.z;

              context.beginPath();
              // minor grid
              for (let x = startX; x <= endX; x += step) {
                context.moveTo(x, startY);
                context.lineTo(x, endY);
              }
              for (let y = startY; y <= endY; y += step) {
                context.moveTo(startX, y);
                context.lineTo(endX, y);
              }
              context.strokeStyle = 'rgba(0,0,0,0.05)';
              context.lineWidth = 1 / transform.z;
              context.stroke();
              
              // major grid
              const majorStep = step * 5;
              const majorStartX = Math.floor((-transform.x / transform.z) / majorStep) * majorStep;
              const majorStartY = Math.floor((-transform.y / transform.z) / majorStep) * majorStep;
              
              context.beginPath();
              for (let x = majorStartX; x <= endX; x += majorStep) {
                context.moveTo(x, startY);
                context.lineTo(x, endY);
              }
              for (let y = majorStartY; y <= endY; y += majorStep) {
                context.moveTo(startX, y);
                context.lineTo(endX, y);
              }
              context.strokeStyle = 'rgba(0,0,0,0.1)';
              context.lineWidth = 2 / transform.z;
              context.stroke();
            }}
          />

          {items.map(item => (
            <Group 
              key={item.id}
              x={item.x} y={item.y} rotation={item.rotation}
              draggable={activeTool === 'select' && selectedItemId === item.id}
              onDragEnd={(e) => {
                 onUpdateItem(item.id, { x: e.target.x(), y: e.target.y() });
              }}
              onClick={() => activeTool === 'select' && onSelectItem(item.id)}
              onTap={() => activeTool === 'select' && onSelectItem(item.id)}
            >
              {item.points ? (
                <Line
                  points={item.points.flatMap((p: any) => [p.x, p.y])}
                  fill={item.color}
                  stroke={selectedItemId === item.id ? '#60a5fa' : '#a1a1aa'}
                  strokeWidth={selectedItemId === item.id ? 2/transform.z : 1/transform.z}
                  closed
                  shadowColor={selectedItemId === item.id ? 'rgba(0,0,0,0.5)' : 'transparent'}
                  shadowBlur={10/transform.z}
                />
              ) : (
                <Rect
                  x={-item.width/2} y={-item.height/2}
                  width={item.width} height={item.height}
                  fill={item.color}
                  stroke={selectedItemId === item.id ? '#60a5fa' : '#a1a1aa'}
                  strokeWidth={selectedItemId === item.id ? 2/transform.z : 1/transform.z}
                  shadowColor={selectedItemId === item.id ? 'rgba(0,0,0,0.5)' : 'transparent'}
                  shadowBlur={10/transform.z}
                  cornerRadius={item.assetId === 'wall-segment' && item.jointType === 'rounded' ? item.height/2 : 0}
                />
              )}
            </Group>
          ))}

          {/* DRAFTING PREVIEW for Wall */}
          {draftState && activeTool === 'draw-wall' && (() => {
             const dist = Math.sqrt(Math.pow(draftState.pointerX - draftState.startX, 2) + Math.pow(draftState.pointerY - draftState.startY, 2));
             const angle = Math.atan2(draftState.pointerY - draftState.startY, draftState.pointerX - draftState.startX) * (180 / Math.PI);
             return (
                 <Group x={draftState.startX} y={draftState.startY} rotation={angle}>
                    <Rect x={-7.5} y={-7.5} width={dist+15} height={15} fill="rgba(96, 165, 250, 0.4)" stroke="#2563eb" strokeWidth={1.5/transform.z} cornerRadius={7.5} />
                    <Circle x={0} y={0} radius={4/transform.z} fill="white" stroke="#1e293b" strokeWidth={1.5/transform.z} />
                    <Circle x={dist} y={0} radius={4/transform.z} fill="white" stroke="#1e293b" strokeWidth={1.5/transform.z} />
                 </Group>
             );
          })()}

          {/* DRAFTING PREVIEW for Room */}
          {draftState && activeTool === 'draw-room' && (() => {
             const minX = Math.min(draftState.startX, draftState.pointerX);
             const minY = Math.min(draftState.startY, draftState.pointerY);
             const width = Math.abs(draftState.pointerX - draftState.startX);
             const height = Math.abs(draftState.pointerY - draftState.startY);
             return (
                 <Group x={minX} y={minY}>
                    <Rect x={0} y={0} width={width} height={height} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth={2/transform.z} dash={[10/transform.z, 10/transform.z]} />
                 </Group>
             );
          })()}

          {/* PLACEMENT PREVIEW Ghost */}
          {activeTool === 'place-item' && placeAssetId && pointerPos && (() => {
             const asst = ASSET_LIBRARY.find(a => a.id === placeAssetId);
             if (!asst) return null;
             return (
                 <Group x={pointerPos.x} y={pointerPos.y}>
                    <Rect x={-asst.defaultWidth/2} y={-asst.defaultHeight/2} width={asst.defaultWidth} height={asst.defaultHeight} fill={asst.defaultColor} stroke="#3b82f6" strokeWidth={2/transform.z} opacity={0.6} cornerRadius={asst.id.includes('door') || asst.id.includes('window') ? 0 : 8} />
                 </Group>
             );
          })()}

        </Layer>
      </Stage>

      {/* Toolbar - Bottom Right Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 space-x-2 shadow-lg z-30 pointer-events-auto">
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" title="Lock Settings"><Icons.Lock className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-gray-200"></div>
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" onClick={() => handleZoom(-0.2)}><Icons.ZoomOut className="w-4 h-4" /></button>
        <div className="w-24 px-2">
           <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" min="5" max="1000" value={transform.z * 100} onChange={(e) => setTransform(p => ({...p, z: Number(e.target.value)/100}))} />
        </div>
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" onClick={() => handleZoom(0.2)}><Icons.ZoomIn className="w-4 h-4" /></button>
      </div>

      {/* Toolbar - Bottom Left Floor Switcher */}
      <div className="absolute bottom-6 left-6 flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-lg z-30 pointer-events-auto shadow-sm">
        <div className="flex items-center gap-1 bg-gray-100/50 rounded-full p-0.5">
           <button className="p-2 text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm bg-white"><Icons.Layers className="w-4 h-4"/></button>
           <button className="px-4 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-full transition-colors">2D 1</button>
           <button className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-full transition-colors">3D 3</button>
        </div>
      </div>

      {/* Tool hint banner */}
      <AnimatePresence>
        {activeTool !== 'select' && (
          <motion.div 
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="absolute top-6 left-1/2 bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-xl pointer-events-none"
          >
            {activeTool === 'draw-wall' && "Click to start wall. Hold Shift for straight lines. Right-click or ESC to finish."}
            {activeTool === 'draw-room' && "Click and drag or click two points to draw a room. ESC to cancel."}
            {activeTool === 'place-item' && "Click to place item. Right-click or ESC to exit."}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
