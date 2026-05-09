import React, { useState } from 'react';
import { ViewMode, DesignItem } from './types';
import { ASSET_LIBRARY } from './lib/constants';
import * as Icons from 'lucide-react';
import { cn } from './lib/utils';
import { DownloadCloud, Layers, Box, Settings2, ZoomIn, ZoomOut, Move, Hand, MousePointer2, Focus, Pencil, SquareSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import KonvaCanvas2D from './components/KonvaCanvas2D';
import Canvas3D from './components/Canvas3D';
import AIGeneratorModal from './components/AIGeneratorModal';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('2D');
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const [items, setItems] = useState<DesignItem[]>(() => {
    try {
      const saved = localStorage.getItem('homestyler_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [history, setHistory] = useState<DesignItem[][]>([items]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'draw-wall' | 'draw-room' | 'place-item'>('select');
  const [placeAssetId, setPlaceAssetId] = useState<string | null>(null);

  const saveToHistory = (newItems: DesignItem[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSetItems = (newItems: DesignItem[] | ((prev: DesignItem[]) => DesignItem[])) => {
    setItems((prev) => {
      const nextItems = typeof newItems === 'function' ? newItems(prev) : newItems;
      saveToHistory(nextItems);
      return nextItems;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setItems(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setItems(history[historyIndex + 1]);
    }
  };

  const clearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the canvas?")) {
      handleSetItems([]);
      setSelectedItemId(null);
    }
  };

  const saveProject = () => {
    localStorage.setItem('homestyler_items', JSON.stringify(items));
    alert("Project saved locally!");
  };

  const handleAddItemFromLibrary = (assetId: string) => {
    const asset = ASSET_LIBRARY.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.id === 'wall-segment') {
      setActiveTool('draw-wall');
      setSelectedItemId(null);
      return;
    }
    if (asset.id === 'room-square') {
      setActiveTool('draw-room');
      setSelectedItemId(null);
      return;
    }

    setActiveTool('place-item');
    setPlaceAssetId(asset.id);
    setSelectedItemId(null);
  };

  const handleUpdateItem = (id: string, updates: Partial<DesignItem>) => {
    handleSetItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleDeleteItem = (id: string) => {
    handleSetItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  const onDrawComplete = (newItem: DesignItem, keepSelected: boolean = false) => {
    handleSetItems(prev => [...prev, newItem]);
    if (keepSelected) {
      setSelectedItemId(newItem.id);
    } else {
      setSelectedItemId(null);
    }
  }

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafbfc] dark:bg-zinc-950 font-sans text-gray-900 relative">
      {/* Background Canvas */}
      <div className="absolute inset-0 z-0 flex flex-col">
          {viewMode === '2D' ? (
            <KonvaCanvas2D 
              items={items} 
              selectedItemId={selectedItemId} 
              onSelectItem={setSelectedItemId} 
              onUpdateItem={handleUpdateItem}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onDrawComplete={onDrawComplete}
              onDeleteItem={handleDeleteItem}
              placeAssetId={placeAssetId}
            />
          ) : (
            <Canvas3D items={items} selectedItemId={selectedItemId} onSelectItem={setSelectedItemId} onUpdateItem={handleUpdateItem} />
          )}
      </div>

      <AutoHideWrapper side="top">
        <TopBar 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          onExport={() => setIsExportModalOpen(true)} 
          onGenerate={() => setIsAiModalOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </AutoHideWrapper>

      <AutoHideWrapper side="left">
        <div className="flex h-screen pt-14 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-zinc-800/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          {/* Thin Navigation Column */}
          <div className="w-[72px] flex flex-col items-center py-4 border-r border-gray-100 dark:border-zinc-800 gap-6">
             <button className="flex flex-col items-center gap-1.5 text-gray-900 dark:text-gray-100 group">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-zinc-700 transition-colors">
                  <Box className="w-5 h-5 text-gray-900 dark:text-gray-100" />
                </div>
                <span className="text-[10px] font-semibold text-gray-900 dark:text-gray-200">Build</span>
             </button>
             <button className="flex flex-col items-center gap-1.5 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 group">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">Decorate</span>
             </button>
             <button className="flex flex-col items-center gap-1.5 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 group">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors">
                  <Settings2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">Customize</span>
             </button>
          </div>

          {/* Library Column */}
          <div className="w-[300px] flex flex-col pt-2 relative z-10">
            <div className="px-5 py-5 border-b border-gray-100/60 dark:border-zinc-800/60 flex flex-col gap-4">
              <h2 className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-gray-100">Components</h2>
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="w-full bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400/80"
                />
                <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-8">
              {['Structure', 'Doors & Windows', 'Furniture', 'Plumbing'].map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 dark:text-zinc-500">{category}</h3>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800/60"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {ASSET_LIBRARY.filter(a => a.category === category).map((asset) => {
                      const IconComponent = (Icons as any)[asset.iconName] || Box;
                      const isActive = 
                        (asset.id === 'wall-segment' && activeTool === 'draw-wall') ||
                        (asset.id === 'room-square' && activeTool === 'draw-room') ||
                        (asset.id === placeAssetId && activeTool === 'place-item');

                      return (
                        <button
                          key={asset.id}
                          onClick={() => handleAddItemFromLibrary(asset.id)}
                          className={cn("flex flex-col items-center p-2 rounded-2xl transition-all group",
                            isActive ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800/80"
                          )}
                        >
                          <div className={cn("w-12 h-12 flex items-center justify-center rounded-[14px] mb-2 transition-all", isActive ? "bg-white/20 text-white" : "border border-gray-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 group-hover:border-gray-300 dark:group-hover:border-zinc-700 shadow-sm text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-200")}>
                             <IconComponent className="w-[22px] h-[22px]" strokeWidth={1.5} />
                          </div>
                          <span className={cn("text-[10px] text-center leading-tight font-semibold", isActive ? "text-white" : "text-gray-500 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-zinc-300")}>{asset.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AutoHideWrapper>

      <AutoHideWrapper side="right">
        {/* Right Sidebar */}
        <div className="w-[340px] h-screen pt-14 bg-[#fbfcfd] dark:bg-zinc-900/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-zinc-800/50 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto">
          {/* Minimap Placeholder */}
          <div className="p-4">
             <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-200/60 dark:border-zinc-800/60 p-2 h-48 relative flex items-center justify-center overflow-hidden group">
               <div className="absolute inset-0 canvas-grid opacity-30"></div>
               <span className="text-gray-400 font-medium z-10 bg-white/80 dark:bg-zinc-900/80 px-3 py-1 rounded-lg backdrop-blur-sm text-sm">Minimap View</span>
             </div>
          </div>
          
          <div className="flex-1 p-4 pt-0">
            {selectedItem ? (
              <PropertiesPanel 
                item={selectedItem} 
                onUpdate={(updates: Partial<DesignItem>) => handleUpdateItem(selectedItem.id, updates)} 
                onDelete={() => handleDeleteItem(selectedItem.id)}
              />
            ) : (
              <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-sm border border-gray-200/60 dark:border-zinc-800/60 p-8 flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-zinc-900 flex items-center justify-center border border-gray-100 dark:border-zinc-800">
                  <MousePointer2 className="w-6 h-6 text-gray-300 dark:text-zinc-600" />
                </div>
                <p className="text-sm text-center font-medium leading-relaxed">Select an item on the canvas to modify its properties.</p>
              </div>
            )}
          </div>
        </div>
      </AutoHideWrapper>

      <FavoritesBar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        placeAssetId={placeAssetId}
        setPlaceAssetId={setPlaceAssetId}
      />
      <ActionToolbar 
        onSave={saveProject}
        onUndo={undo}
        onRedo={redo}
        onClear={clearCanvas}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onExport={() => setIsExportModalOpen(true)}
      />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <AIGeneratorModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onApply={(newItems) => { handleSetItems(prev => [...prev, ...newItems]); setIsAiModalOpen(false); }} />
    </div>
  );
}

function TopBar({ viewMode, setViewMode, onExport, onGenerate, isDark, onToggleTheme }: { viewMode: ViewMode, setViewMode: (m: ViewMode) => void, onExport: () => void, onGenerate: () => void, isDark?: boolean, onToggleTheme?: () => void }) {
  return (
    <div className="w-[100vw] h-14 border-b border-gray-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between px-4 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer pr-2 group">
          <div className="w-8 h-8 flex items-center justify-center bg-gray-900 dark:bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform">
             <Layers className="w-4 h-4 text-white dark:text-gray-900" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight text-lg">Homestyler.AI</span>
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-2"></div>
        
        {/* View Mode Toggle */}
        <div className="bg-gray-100/80 dark:bg-zinc-800/80 p-[3px] rounded-lg flex items-center shadow-inner">
          <button 
            onClick={() => setViewMode('2D')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200", viewMode === '2D' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100")}
          >
            Floor Plan (2D)
          </button>
          <button 
            onClick={() => setViewMode('3D')}
            className={cn("px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200", viewMode === '3D' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100")}
          >
            Preview (3D)
          </button>
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-2"></div>
        
        <button 
          className="text-gray-600 dark:text-zinc-400 font-medium text-[13px] tracking-tight hover:text-gray-900 dark:hover:text-zinc-100 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          onClick={() => {
             const newName = prompt('Enter project name:', 'Project Name');
             if (newName) alert(`Project name changed to: ${newName}`);
          }}
        >
          Draft Project <Icons.ChevronDown className="w-3.5 h-3.5 opacity-70"/>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3.5 py-1.5 rounded-lg shadow-sm font-semibold text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition-all hover:shadow-md" onClick={onGenerate}>
          <Icons.Sparkles className="w-3.5 h-3.5" /> Generate Design
        </button>
        
        <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-1"></div>

        {onToggleTheme && (
          <button 
            className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800/80 transition-colors"
            onClick={onToggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Canvas2D({ items, selectedItemId, onSelectItem, onUpdateItem, activeTool, setActiveTool, onDrawComplete, onDeleteItem, placeAssetId }: any) {
  const [transform, setTransform] = useState({ x: 0, y: 0, z: 1 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [draftState, setDraftState] = useState<{ startX: number, startY: number, pointerX: number, pointerY: number, sequence?: {x: number, y: number}[], wallIds?: string[], inferences?: {x: number, y: number}[] } | null>(null);
  const [pointerPos, setPointerPos] = useState<{x: number, y: number} | null>(null);

  React.useEffect(() => {
    if (activeTool === 'select') setDraftState(null);
  }, [activeTool]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId && document.activeElement?.tagName !== 'INPUT') {
        onDeleteItem(selectedItemId);
      }
      // Abort drawing
      if (e.key === 'Escape') {
        setDraftState(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, activeTool, onDeleteItem, setActiveTool]);

  React.useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = e.ctrlKey ? 0.005 : 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      
      setTransform(prev => {
        let newZoom = prev.z * Math.exp(delta);
        newZoom = Math.min(Math.max(newZoom, 0.05), 10);
        
        const rect = canvas.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        const contentX = (pointerX - prev.x) / prev.z;
        const contentY = (pointerY - prev.y) / prev.z;

        const newPanX = pointerX - contentX * newZoom;
        const newPanY = pointerY - contentY * newZoom;

        return { x: newPanX, y: newPanY, z: newZoom };
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const getPointerCoord = (clientX: number, clientY: number, checkSnap: boolean = true) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    
    // transform space
    const xUnsnapped = (px - transform.x) / transform.z;
    const yUnsnapped = (py - transform.y) / transform.z;

    // snap to 10cm grid
    const snap = 10;
    let x = Math.round(xUnsnapped / snap) * snap;
    let y = Math.round(yUnsnapped / snap) * snap;
    
    // Auto-snap to wall endpoints
    if (checkSnap && ['draw-wall', 'draw-room', 'place-item'].includes(activeTool)) {
       let minDistance = 20; // Snap radius in cm
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

  const handlePointerDown = (e: React.PointerEvent) => {
    const coord = getPointerCoord(e.clientX, e.clientY);

    if (e.button === 0) {
      if (activeTool === 'select') {
        if (e.target === containerRef.current || e.target === contentRef.current) {
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
          // Keep tool active to place another, or right-click / esc to cancel
        }
      } else if (activeTool === 'draw-wall' || activeTool === 'draw-room') {
        let snapCoord = coord;
        if (activeTool === 'draw-wall') {
           const gridSize = 10;
           snapCoord = {
               x: Math.round(coord.x / gridSize) * gridSize,
               y: Math.round(coord.y / gridSize) * gridSize
           };
        }

        if (!draftState) {
          // Start drawing on first click
          setDraftState({
            startX: snapCoord.x,
            startY: snapCoord.y,
            pointerX: snapCoord.x,
            pointerY: snapCoord.y,
            sequence: [{x: snapCoord.x, y: snapCoord.y}]
          });
        } else {
          // Commit drawing on second click
          const px = draftState.pointerX;
          const py = draftState.pointerY;
          
          if (px !== draftState.startX || py !== draftState.startY) {
             const sq = draftState.sequence || [{x: draftState.startX, y: draftState.startY}];
             
             let finalX = px;
             let finalY = py;
             let isClosed = false;

             // if wall closes loop to start point
             if (activeTool === 'draw-wall' && sq.length >= 3) {
                 const distToStart = Math.sqrt((px - sq[0].x)**2 + (py - sq[0].y)**2);
                 if (distToStart < 20) {
                     finalX = sq[0].x;
                     finalY = sq[0].y;
                     isClosed = true;
                 }
             }

             const newWallId = commitDraft(draftState.startX, draftState.startY, finalX, finalY);

             if (activeTool === 'draw-wall') {
               if (isClosed) {
                 const allWallIds = [...(draftState.wallIds || [])];
                 if (newWallId) allWallIds.push(newWallId);
                 
                 // Close the room and automatically create floor without deleting the individual walls
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
                    startX: finalX,
                    startY: finalY,
                    pointerX: finalX,
                    pointerY: finalY,
                    sequence: [...sq, {x: finalX, y: finalY}],
                    wallIds: [...(draftState.wallIds || []), newWallId].filter(Boolean) as string[]
                 });
               }
             } else {
               setDraftState(null);
               setActiveTool('select');
             }
          }
        }
      }
    }

    // Pan with middle click
    if (e.button === 1 || (e.button === 2 && (!draftState && activeTool === 'select'))) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;

      setTransform(prev => {
        const initX = prev.x;
        const initY = prev.y;

        const handlePointerMove = (ev: PointerEvent) => {
          setTransform(p => ({
            ...p,
            x: initX + (ev.clientX - startX),
            y: initY + (ev.clientY - startY)
          }));
        };

        const handlePointerUp = () => {
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return prev;
      });
    }
  };

  const commitDraft = (x1: number, y1: number, x2: number, y2: number) => {
    if (activeTool === 'draw-wall') {
      const asset = ASSET_LIBRARY.find(a => a.id === 'wall-segment')!;
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rot = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      const id = `wall-${Date.now()}`;
      onDrawComplete({
        id,
        assetId: asset.id,
        name: asset.name,
        x: cx,
        y: cy,
        width: length + asset.defaultHeight,
        height: asset.defaultHeight,
        rotation: rot,
        color: asset.defaultColor,
        jointType: 'squared'
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
        id,
        assetId: asset.id,
        name: asset.name,
        x: minX + (maxX - minX) / 2,
        y: minY + (maxY - minY) / 2,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        color: 'transparent'
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
    <div 
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden canvas-grid-large touch-none", activeTool === 'select' ? "cursor-default" : "cursor-crosshair")}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px, ${transform.x}px ${transform.y}px`,
        backgroundSize: `${10 * transform.z}px ${10 * transform.z}px, ${10 * transform.z}px ${10 * transform.z}px, ${50 * transform.z}px ${50 * transform.z}px, ${50 * transform.z}px ${50 * transform.z}px`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        const currentCoord = getPointerCoord(e.clientX, e.clientY);
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
              
              if (e.shiftKey || (isNearOrthogonal && dist > 20)) {
                 if (dx < dy) { px = draftState.startX; }
                 else { py = draftState.startY; }
              }

              // Gather all global points from existing walls
              const globalPoints: {x: number, y: number}[] = [];
              items.forEach((item: DesignItem) => {
                  if (item.assetId === 'wall-segment') {
                      const rad = item.rotation * (Math.PI / 180);
                      const halfW = (item.width - item.height) / 2;
                      const dX = halfW * Math.cos(rad);
                      const dY = halfW * Math.sin(rad);
                      globalPoints.push({ x: item.x - dX, y: item.y - dY });
                      globalPoints.push({ x: item.x + dX, y: item.y + dY });
                  }
              });

              if (draftState.sequence) {
                  draftState.sequence.forEach(pt => {
                      if (pt.x !== draftState.startX || pt.y !== draftState.startY) {
                          globalPoints.push(pt);
                      }
                  });
              }

              // Evaluate Snapping against all points
              for (const pt of globalPoints) {
                  let snapped = false;
                  // Snap to endpoint if it's very close (both x and y)
                  if (Math.abs(px - pt.x) <= 15 && Math.abs(py - pt.y) <= 15) {
                      px = pt.x;
                      py = pt.y;
                      snapped = true;
                  } else {
                      // Alignment Snapping (Inference on X or Y axis)
                      if (Math.abs(px - pt.x) <= 15) {
                          px = pt.x;
                          snapped = true;
                      }
                      if (Math.abs(py - pt.y) <= 15) {
                          py = pt.y;
                          snapped = true;
                      }
                  }
                  
                  if (snapped) {
                      // Avoid duplicate inferences
                      if (!currentInferences.some(inf => Math.abs(inf.x - pt.x) < 1 && Math.abs(inf.y - pt.y) < 1)) {
                          currentInferences.push(pt);
                      }
                  }
              }

              if (draftState.sequence && draftState.sequence.length >= 3) {
                  const startPoint = draftState.sequence[0];
                  const distToStart = Math.sqrt((px - startPoint.x)**2 + (py - startPoint.y)**2);
                  if (distToStart < 30) {
                      px = startPoint.x;
                      py = startPoint.y;
                  }
              }
          }
          
          setDraftState(prev => prev ? { ...prev, pointerX: px, pointerY: py, inferences: currentInferences || [] } : null);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (draftState) {
          setDraftState(null);
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        }
      }}
    >
      <div 
        ref={contentRef}
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`
        }}
        className="w-full h-full pointer-events-none"
      >
        <div className="absolute inset-0 pointer-events-auto">
          {items.map((item: DesignItem) => (
            <DraggableItem 
              key={item.id} 
              item={item} 
              transform={transform}
              isSelected={selectedItemId === item.id}
              canSelect={activeTool === 'select'}
              onSelect={() => onSelectItem(item.id)}
              onUpdate={(updates: any) => onUpdateItem(item.id, updates)}
            />
          ))}

          {/* Draft Item Preview */}
          {draftState && activeTool === 'draw-wall' && (() => {
             const dist = Math.sqrt(Math.pow(draftState.pointerX - draftState.startX, 2) + Math.pow(draftState.pointerY - draftState.startY, 2));
             const angle = Math.atan2(draftState.pointerY - draftState.startY, draftState.pointerX - draftState.startX) * (180 / Math.PI);
             const sq = draftState.sequence || [];
             let isClosing = false;
             let isPerpendicular = false;

             if (sq.length >= 3) {
                 const distToStart = Math.sqrt((draftState.pointerX - sq[0].x)**2 + (draftState.pointerY - sq[0].y)**2);
                 if (distToStart < 30) isClosing = true;
             }

             // Estimate if it's perpendicular snapped (angle is multiple of 90)
             const normalizedAngle = (angle + 360) % 360;
             if (normalizedAngle % 90 === 0 && dist > 0) isPerpendicular = true;

             const hasInferences = draftState.inferences && draftState.inferences.length > 0;

             return (
               <>
                 <div style={{
                    position: 'absolute',
                    left: draftState.startX,
                    top: draftState.startY,
                    width: dist,
                    height: 0,
                    transformOrigin: '0 0',
                    transform: `rotate(${angle}deg)`,
                    pointerEvents: 'none',
                    zIndex: 50
                 }}>
                   {/* Main Wall Rectangle */}
                   <div style={{
                      position: 'absolute',
                      top: -7.5,
                      left: -7.5,
                      width: dist + 15,
                      height: 15,
                      backgroundColor: 'rgba(96, 165, 250, 0.4)', // bg-blue-400 with opacity
                      border: '1.5px solid #2563eb', // border-blue-600
                      borderRadius: 7.5
                   }} />

                   {/* Start Point */}
                   <div style={{
                      position: 'absolute',
                      top: -4,
                      left: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #1e293b'
                   }} />

                   {/* End Point */}
                   <div style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isClosing || hasInferences || isPerpendicular ? '#a7f3d0' : '#ffffff',
                      border: '1.5px solid #1e293b'
                   }} />

                   {/* Dimension Line & Label */}
                   {dist > 30 && (
                     <div style={{ position: 'absolute', top: 30, left: 0, width: '100%', height: 20 }}>
                       {/* Horizontal line */}
                       <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#52525b' }} />
                       {/* Left tick */}
                       <div style={{ position: 'absolute', top: '50%', left: 0, width: 1, height: 12, marginTop: -6, backgroundColor: '#52525b' }} />
                       {/* Right tick */}
                       <div style={{ position: 'absolute', top: '50%', right: 0, width: 1, height: 12, marginTop: -6, backgroundColor: '#52525b' }} />
                       
                       <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: '#60a5fa',
                          border: '1px solid #3b82f6',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          lineHeight: 1,
                          whiteSpace: 'nowrap'
                       }}>
                          {formatDimension(dist)}
                       </div>

                       {/* Tooltip for snapping */}
                       {(hasInferences || isClosing || isPerpendicular) && (
                          <div style={{
                             position: 'absolute',
                             top: '50%',
                             left: '100%',
                             marginLeft: 15,
                             transform: `translate(0, -50%) rotate(${-angle}deg)`,
                             backgroundColor: '#52525b',
                             color: '#ffffff',
                             padding: '4px 8px',
                             borderRadius: 4,
                             fontSize: 12,
                             fontWeight: 400,
                             whiteSpace: 'nowrap'
                          }}>
                             {isClosing ? 'Closure' : hasInferences ? 'Aligned' : 'Perpendicular'}
                          </div>
                       )}
                     </div>
                   )}
                 </div>
                 
                 {/* Guide Lines if Snapped or Perpendicular */}
                 <svg style={{ 
                     position: 'absolute', 
                     top: 0, 
                     left: 0, 
                     width: 1, 
                     height: 1, 
                     pointerEvents: 'none', 
                     overflow: 'visible',
                     zIndex: 49 
                 }}>
                     {(draftState.inferences || []).map((inf, i) => (
                         <line 
                             key={`inf-${i}`}
                             x1={draftState.pointerX} 
                             y1={draftState.pointerY} 
                             x2={inf.x} 
                             y2={inf.y} 
                             stroke="#4ade80" 
                             strokeWidth="1" 
                         />
                     ))}
                     {isPerpendicular && (
                         <line 
                             x1={normalizedAngle % 180 === 0 ? draftState.pointerX : draftState.pointerX - 2000} 
                             y1={normalizedAngle % 180 === 0 ? draftState.pointerY - 2000 : draftState.pointerY} 
                             x2={normalizedAngle % 180 === 0 ? draftState.pointerX : draftState.pointerX + 2000} 
                             y2={normalizedAngle % 180 === 0 ? draftState.pointerY + 2000 : draftState.pointerY} 
                             stroke="#4ade80" 
                             strokeWidth="1.5" 
                         />
                     )}
                 </svg>
               </>
             )
          })()}

          {draftState && activeTool === 'draw-room' && (
             <div 
               style={{
                 position: 'absolute',
                 left: Math.min(draftState.startX, draftState.pointerX),
                 top: Math.min(draftState.startY, draftState.pointerY),
                 width: Math.abs(draftState.pointerX - draftState.startX),
                 height: Math.abs(draftState.pointerY - draftState.startY),
                 backgroundColor: 'rgba(99, 102, 241, 0.1)',
                 border: '2px dashed #6366f1',
                 pointerEvents: 'none',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center'
               }}
             >
               <span className="bg-zinc-900 px-2 py-1 rounded text-[10px] text-indigo-300 shadow-sm">
                 {Math.round(Math.abs(draftState.pointerX - draftState.startX))} cm x {Math.round(Math.abs(draftState.pointerY - draftState.startY))} cm
               </span>
             </div>
          )}

          {/* Placement Preview Ghost */}
          {activeTool === 'place-item' && placeAssetId && pointerPos && (
             (() => {
                const asst = ASSET_LIBRARY.find(a => a.id === placeAssetId);
                if (!asst) return null;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: pointerPos.x,
                      top: pointerPos.y,
                      width: asst.defaultWidth,
                      height: asst.defaultHeight,
                      transform: `translate(-50%, -50%)`,
                      backgroundColor: asst.defaultColor,
                      opacity: 0.6,
                      pointerEvents: 'none',
                      border: '2px solid #3b82f6',
                      borderRadius: asst.id.includes('door') || asst.id.includes('window') ? 0 : 8,
                      zIndex: 50,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                );
             })()
          )}
        </div>
      </div>

      {/* Toolbar - Bottom Right Zoom Controls */}
      <div className="absolute bottom-6 right-6 flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 space-x-2 shadow-lg z-30 pointer-events-auto">
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" title="Lock Settings"><Icons.Lock className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-gray-200"></div>
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" onClick={() => handleZoom(-0.2)}><ZoomOut className="w-4 h-4" /></button>
        <div className="w-24 px-2">
           <input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" min="5" max="1000" value={transform.z * 100} onChange={(e) => setTransform(p => ({...p, z: Number(e.target.value)/100}))} />
        </div>
        <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full" onClick={() => handleZoom(0.2)}><ZoomIn className="w-4 h-4" /></button>
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

const formatDimension = (cm: number) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle edge case where inches is 12
  if (inches === 12) {
      return `${feet + 1}' 0"`;
  }
  return `${feet}' ${inches}"`;
};

function DraggableItem({ item, transform, isSelected, canSelect, onSelect, onUpdate }: { item: DesignItem, transform: { x: number, y: number, z: number }, isSelected: boolean, canSelect: boolean, onSelect: () => void, onUpdate: (updates: Partial<DesignItem>) => void }) {
  const [isRoom, setIsRoom] = useState(item.assetId === 'room-square' || item.assetId === 'floor-surface');

  React.useEffect(() => {
    setIsRoom(item.assetId === 'room-square' || item.assetId === 'floor-surface');
  }, [item.assetId]);

  const calculateArea = () => {
    if (item.points) {
      let areaSqCm = 0;
      for (let i = 0; i < item.points.length; i++) {
        const j = (i + 1) % item.points.length;
        areaSqCm += item.points[i].x * item.points[j].y;
        areaSqCm -= item.points[j].x * item.points[i].y;
      }
      areaSqCm = Math.abs(areaSqCm / 2);
      const areaSqFt = areaSqCm * 0.00107639;
      return areaSqFt.toFixed(2);
    }
    const areaSqCm = item.width * item.height;
    const areaSqFt = areaSqCm * 0.00107639;
    return areaSqFt.toFixed(2);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !canSelect) return;
    
    e.stopPropagation();
    onSelect();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = item.x;
    const initY = item.y;
    
    const handlePointerMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / transform.z;
      const dy = (ev.clientY - startY) / transform.z;
      // Snap to 10cm grid
      const snap = 10;
      onUpdate({
        x: Math.round((initX + dx) / snap) * snap,
        y: Math.round((initY + dy) / snap) * snap
      });
    };
    
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div 
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        backgroundColor: (isRoom && !item.points) ? 'transparent' : item.color,
        borderRadius: item.assetId === 'wall-segment' ? (item.jointType === 'rounded' ? item.height / 2 : 0) : undefined,
      }}
      className={cn(
        canSelect ? "cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-zinc-400/50 hover:ring-offset-1 hover:ring-offset-zinc-950" : "pointer-events-none",
        "transition-[shadow,border] duration-150 relative",
        isSelected && !isRoom && !item.points ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 z-30 shadow-2xl" : "shadow-sm",
        isRoom && !item.points && "border-[15px] border-zinc-400 bg-wood-pattern shadow-md z-0",
        isRoom && isSelected && !item.points && "border-zinc-500 shadow-xl",
        item.assetId === 'floor-surface' ? "z-0 drop-shadow-sm" : (item.assetId === 'wall-segment' ? "z-10" : "z-20")
      )}
    >
      {item.points && isRoom && (
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
           <defs>
             <pattern id={`wood-${item.id}`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
                <rect width="40" height="40" fill="#e0cca7" />
                <path d="M0 0h40v2H0zM0 20h40v2H0z" fill="rgba(0,0,0,0.04)" />
                <path d="M10 0v40H8zM30 0v40h-2z" fill="rgba(0,0,0,0.02)" />
             </pattern>
           </defs>
           <polygon 
              points={item.points.map(p => `${p.x + item.width/2},${p.y + item.height/2}`).join(' ')} 
              fill={`url(#wood-${item.id})`}
              stroke={isSelected ? "#60a5fa" : "transparent"}
              strokeWidth="2"
              strokeLinejoin="round"
           />
        </svg>
      )}

      {!isRoom && item.points && (
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
           <polygon 
              points={item.points.map(p => `${p.x + item.width/2},${p.y + item.height/2}`).join(' ')} 
              fill={item.color}
              stroke="#e2e8f0"
              strokeWidth="2"
           />
        </svg>
      )}

      {item.assetId === 'wall-segment' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="bg-white/80 px-1 py-0.5 rounded text-[9px] font-medium tracking-tight text-gray-800 shadow-sm border border-gray-200 whitespace-nowrap">
             {formatDimension(item.width - item.height)}
           </div>
        </div>
      )}

      {isRoom && !item.points && (
         <>
           <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/80 px-1 py-0.5 rounded text-[10px] font-medium tracking-tight text-gray-800 shadow-sm border border-gray-200 pointer-events-none">
             {formatDimension(item.width)}
           </div>
           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/80 px-1 py-0.5 rounded text-[10px] font-medium tracking-tight text-gray-800 shadow-sm border border-gray-200 pointer-events-none">
             {formatDimension(item.width)}
           </div>
           <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 px-1 py-0.5 rounded text-[10px] font-medium tracking-tight text-gray-800 shadow-sm border border-gray-200 pointer-events-none whitespace-nowrap -rotate-90">
             {formatDimension(item.height)}
           </div>
           <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 px-1 py-0.5 rounded text-[10px] font-medium tracking-tight text-gray-800 shadow-sm border border-gray-200 pointer-events-none whitespace-nowrap rotate-90">
             {formatDimension(item.height)}
           </div>
         </>
      )}

      {(isRoom || item.assetId === 'floor-surface') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <div className="bg-white/80 px-2 py-1 rounded shadow-sm border border-gray-200 flex flex-col items-center">
             <span className="text-xs font-semibold text-gray-800">Unnamed</span>
             <span className="text-[10px] text-gray-600">{calculateArea()} ft²</span>
           </div>
        </div>
      )}

      {!isRoom && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-950/90 shadow-lg pointer-events-none whitespace-nowrap text-white">
            {item.name}
          </span>
        </div>
      )}
      
      {isSelected && canSelect && !isRoom && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-800 border-2 border-indigo-500 rounded-full flex items-center justify-center cursor-alias pointer-events-auto"
             onPointerDown={(e) => {
                e.stopPropagation();
                // Simple rotate logic could be added here
             }}>
          <div className="w-px h-5 bg-indigo-500 absolute top-4 pointer-events-none"></div>
        </div>
      )}
    </div>
  );
}



function PropertiesPanel({ item, onUpdate, onDelete }: any) {
  const handleChange = (field: keyof DesignItem, value: string | number) => {
    let updates: Partial<DesignItem> = { [field]: value };
    
    if (field === 'material' && item.color === '#ffffff') {
      if (value === 'wood') updates.color = '#8B5A2B';
      if (value === 'concrete') updates.color = '#9ca3af';
    }
    
    onUpdate(updates);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Element Identity Component */}
      <div className="bg-white/80 dark:bg-zinc-950/80 border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
        <h4 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-0.5 truncate">{item.name}</h4>
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono tracking-widest uppercase">ID: {item.id.split('-')[1]}</p>
      </div>

      <div className="bg-white/80 dark:bg-zinc-950/80 border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm backdrop-blur-sm flex flex-col gap-4">
        <h5 className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center justify-between">
          <span>Geometry Data</span>
          <Icons.ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </h5>
        <div className="grid grid-cols-2 gap-3">
          <PropInput label="X Position" value={item.x} onChange={(v) => handleChange('x', Number(v) || 0)} unit="cm" />
          <PropInput label="Y Position" value={item.y} onChange={(v) => handleChange('y', Number(v) || 0)} unit="cm" />
          <PropInput label="Width" value={item.width} onChange={(v) => handleChange('width', Number(v) || 0)} unit="cm" />
          <PropInput label="Length" value={item.height} onChange={(v) => handleChange('height', Number(v) || 0)} unit="cm" />
          <div className="col-span-2">
            <PropInput label="Rotation" value={item.rotation} onChange={(v) => handleChange('rotation', Number(v) || 0)} unit="°" />
          </div>
          {item.assetId === 'wall-segment' && (
            <div className="col-span-2 flex flex-col gap-1.5 mt-2">
              <label className="text-[10px] text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wide">Joint Type</label>
              <select 
                value={item.jointType || 'squared'}
                onChange={(e) => handleChange('jointType', e.target.value)}
                className="w-full bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                <option value="rounded">Rounded</option>
                <option value="squared">Squared</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-zinc-950/80 border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm backdrop-blur-sm flex flex-col gap-4">
        <h5 className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center justify-between">
          <span>Material & Finish</span>
          <Icons.ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </h5>
        
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wide mb-1">Surface Material</label>
          <div className="relative">
            <select 
              value={item.material || 'default'}
              onChange={(e) => handleChange('material', e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
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
            <Icons.ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[10px] text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wide mb-1">Base Color Profile</label>
          <div className="flex gap-2">
            <div className="relative shrink-0">
              <input 
                type="color" 
                value={item.color === 'transparent' ? '#ffffff' : item.color} 
                onChange={(e) => handleChange('color', e.target.value)}
                disabled={item.color === 'transparent'}
                className="w-9 h-9 rounded-xl cursor-pointer border border-gray-200 overflow-hidden bg-white shadow-sm disabled:opacity-50 appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none" 
              />
            </div>
            <input 
              type="text" 
              value={item.color} 
              onChange={(e) => handleChange('color', e.target.value)}
              className="flex-1 bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl px-3 text-xs font-mono text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
            />
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-zinc-950/80 border border-gray-200/60 dark:border-zinc-800/60 rounded-2xl p-5 shadow-sm backdrop-blur-sm flex flex-col gap-4">
        <h5 className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex flex-col items-start gap-1">
          <span>Custom 3D Model</span>
          <span className="text-[9px] font-normal normal-case opacity-70">Supported formats: .glb, .obj</span>
        </h5>
        
        <div className="flex flex-col gap-2 mt-1">
           <input 
             type="file"
             accept=".glb, .gltf, .obj"
             onChange={(e) => {
               const file = e.target.files?.[0];
               if (!file) return;
               
               const type = file.name.endsWith('.obj') ? 'obj' : 'glb';
               const objectUrl = URL.createObjectURL(file);
               
               onUpdate({ modelUrl: objectUrl, modelType: type });
             }}
             className="text-xs w-full text-gray-500 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 transition-colors cursor-pointer"
           />
           {item.modelUrl && (
             <button 
               onClick={() => onUpdate({ modelUrl: undefined, modelType: undefined })}
               className="text-[10px] text-red-500 hover:text-red-600 mt-2 self-start font-medium bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
             >
               Remove Custom Model
             </button>
           )}
        </div>
      </div>
      
      <div className="pt-2">
        <button 
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-red-50 text-red-600 rounded-2xl text-xs font-bold transition-all border border-gray-200 hover:border-red-200 shadow-sm"
        >
          <Icons.Trash2 className="w-4 h-4" /> Delete Element
        </button>
      </div>
    </div>
  );
}

function PropInput({ label, value, onChange, unit }: { label: string, value: string | number, onChange: (v: string) => void, unit: string }) {
  return (
    <div className="flex flex-col gap-1 focus-within:text-blue-600 dark:focus-within:text-blue-400 text-gray-600 dark:text-zinc-400">
      <label className="text-[10px] font-semibold transition-colors mb-0.5">{label}</label>
      <div className="relative group">
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl py-2 pl-3 pr-8 text-xs font-mono text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 dark:text-zinc-500 font-medium pointer-events-none select-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

function ExportModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setStep(0);
      const timers = [
        setTimeout(() => setStep(1), 1000),
        setTimeout(() => setStep(2), 2500),
        setTimeout(() => setStep(3), 4000),
        setTimeout(() => setStep(4), 5800),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    "Compile 2D Floor Plans (PDF, DXF)",
    "Generate Civil & MEP Annotations",
    "Render 3D High-Res Visuals (JPG)",
    "Calculate BOQ & Material Expenses"
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-8">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <DownloadCloud className="w-7 h-7" />
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Build Working Archive</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Packaging your design into an industry-standard ZIP archive with construction documents for engineers.
            </p>

            <div className="space-y-5 mb-8 bg-gray-50 border border-gray-100 p-5 rounded-xl">
              {steps.map((label, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ease-out",
                    step > i ? "bg-indigo-600 border-indigo-600" : (step === i ? "border-indigo-500 animate-pulse bg-indigo-50" : "border-gray-200 bg-white")
                  )}>
                    {step > i && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className={cn("text-sm transition-colors duration-300 font-medium", step >= i ? "text-gray-900" : "text-gray-400")}>{label}</span>
                </div>
              ))}
            </div>

            {step >= 4 ? (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onClose}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] active:scale-95"
              >
                Download Prototype ZIP
              </motion.button>
            ) : (
              <div className="w-full h-12 flex items-center justify-center gap-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                Generating documents...
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AutoHideWrapper({ children, side }: { children: React.ReactNode, side: 'top' | 'left' | 'right' }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  
  const show = isHovered || isPinned;

  const getTransform = () => {
    if (show) return { x: 0, y: 0 };
    switch (side) {
      case 'top': return { y: '-100%' };
      case 'left': return { x: '-100%' };
      case 'right': return { x: '100%' };
    }
  };

  const getClasses = () => {
    switch (side) {
      case 'top': return "top-0 left-0 right-0 h-14";
      case 'left': return "top-0 left-0 bottom-0 flex";
      case 'right': return "top-0 right-0 bottom-0 flex";
    }
  };

  return (
    <>
      {!show && (
        <div 
          className={cn("fixed z-50", 
            side === 'top' && "top-0 left-0 right-0 h-4",
            side === 'left' && "top-0 left-0 bottom-0 w-4",
            side === 'right' && "top-0 right-0 bottom-0 w-4"
          )} 
          onMouseEnter={() => setIsHovered(true)}
        />
      )}
      <motion.div 
        className={cn("absolute z-40 pointer-events-auto", getClasses())}
        initial={false}
        animate={getTransform()}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
        
        <button 
           onClick={() => setIsPinned(!isPinned)}
           className={cn(
             "absolute bg-white border border-gray-200 shadow-md rounded-full p-1 hover:bg-gray-50 text-gray-500 hover:text-gray-900 z-50",
             side === 'top' ? "bottom-[-16px] left-1/2 -translate-x-1/2" :
             side === 'left' ? "right-[-12px] top-24" :
             "left-[-12px] top-24"
           )}
           title={isPinned ? "Unpin" : "Pin"}
         >
           <Icons.Pin className={cn("w-3.5 h-3.5", !isPinned && "transform rotate-45")} />
         </button>
      </motion.div>
    </>
  )
}

function FavoritesBar({ activeTool, setActiveTool, placeAssetId, setPlaceAssetId }: any) {
  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ x: window.innerWidth / 2 - 100, y: 80 }}
      className="fixed z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex items-center p-1.5 cursor-grab active:cursor-grabbing"
    >
      <div className="px-1.5 text-gray-300 dark:text-zinc-600 w-6 cursor-grab hover:text-gray-500 dark:hover:text-zinc-400 transition-colors flex justify-center">
        <Icons.GripVertical className="w-4 h-4" />
      </div>
      <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1.5"></div>
      
      <button 
         className={cn("p-2.5 rounded-xl transition-all duration-200", activeTool === 'select' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800")} 
         onClick={() => { setActiveTool('select'); setPlaceAssetId(null); }}
         title="Select">
         <MousePointer2 className="w-4 h-4" />
      </button>
      <button 
         className={cn("p-2.5 rounded-xl transition-all duration-200", activeTool === 'draw-wall' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800")} 
         onClick={() => { setActiveTool('draw-wall'); setPlaceAssetId(null); }}
         title="Draw Wall">
         <Pencil className="w-4 h-4" />
      </button>
      <button 
         className={cn("p-2.5 rounded-xl transition-all duration-200", activeTool === 'draw-room' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800")} 
         onClick={() => { setActiveTool('draw-room'); setPlaceAssetId(null); }}
         title="Draw Room">
         <SquareSquare className="w-4 h-4" />
      </button>
      <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1.5"></div>
      <button 
         className={cn("p-2.5 rounded-xl transition-all duration-200", activeTool === 'place-item' && placeAssetId === 'door-single' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800")} 
         onClick={() => { setActiveTool('place-item'); setPlaceAssetId('door-single'); }}
         title="Door">
         <Icons.DoorOpen className="w-4 h-4" />
      </button>
      <button 
         className={cn("p-2.5 rounded-xl transition-all duration-200", activeTool === 'place-item' && placeAssetId === 'window-casement' ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm" : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800")} 
         onClick={() => { setActiveTool('place-item'); setPlaceAssetId('window-casement'); }}
         title="Window">
         <Icons.LayoutGrid className="w-4 h-4" />
      </button>
      
    </motion.div>
  )
}

function ActionToolbar({ onSave, onUndo, onRedo, onClear, canUndo, canRedo, onExport }: any) {
  const [isMinimized, setIsMinimized] = React.useState(false);

  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ x: window.innerWidth / 2 - 250, y: 70 }}
      className="fixed z-[60] flex items-center cursor-grab active:cursor-grabbing"
    >
      <motion.div 
        layout
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] px-2.5 py-1.5 flex items-center gap-1.5 overflow-hidden"
      >
        <div className="px-1 text-gray-300 dark:text-zinc-600 w-5 cursor-grab hover:text-gray-500 dark:hover:text-zinc-400 transition-colors flex justify-center">
           <Icons.GripVertical className="w-4 h-4" />
        </div>
        
        <AnimatePresence>
          {!isMinimized && (
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1"></div>
              {[
                { icon: Icons.Save, label: 'Save', onClick: onSave },
                { icon: Icons.Undo2, label: 'Undo', onClick: onUndo, disabled: !canUndo },
                { icon: Icons.Redo2, label: 'Redo', onClick: onRedo, disabled: !canRedo },
                { icon: Icons.Eraser, label: 'Clear', onClick: onClear },
                { divider: true },
                { icon: Icons.PencilRuler, label: 'Tools', onClick: () => alert('Drawing tools menu') },
                { icon: Icons.Eye, label: 'View', onClick: () => alert('View options: 2D/3D toggle, Grid, Snap') },
                { icon: Icons.Sparkles, label: 'AI Tools', highlight: true, onClick: () => alert('AI Auto-Layout & Style generation coming soon!') },
                { icon: Icons.Download, label: 'Export', onClick: onExport },
                { icon: Icons.Image, label: 'Images', onClick: () => alert('Image assets & materials library coming soon') },
              ].map((tool: any, idx) => tool.divider ? (
                <div key={idx} className="w-px h-6 bg-gray-200 dark:bg-zinc-800 mx-1.5"></div>
              ) : (
                <button 
                  key={idx} 
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 min-w-[50px] rounded-xl transition-all group relative tracking-tight",
                    tool.disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                  )}
                  title={tool.label}
                >
                  {tool.highlight && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-sm">NEW</span>}
                  {tool.icon && <tool.icon className={cn("w-4 h-4 mb-0.5", !tool.disabled && "group-hover:text-blue-600 dark:group-hover:text-blue-400")} />}
                  <span className="text-[9px] font-medium">{tool.label}</span>
                </button>
              ))}
              <button 
                onClick={onExport}
                className="ml-1 mr-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex flex-col items-center justify-center p-2 min-w-[56px] rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
                title="Render Image"
              >
                 <Icons.Camera className="w-4 h-4 mb-0.5" />
                 <span className="text-[9px] font-bold">Render</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="w-[1px] h-6 bg-gray-200 dark:bg-zinc-800 mx-1"></div>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 min-w-[28px] flex items-center justify-center text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
          title={isMinimized ? "Expand Toolbar" : "Minimize Toolbar"}
        >
          {isMinimized ? <Icons.Maximize2 className="w-4 h-4" /> : <Icons.Minimize2 className="w-4 h-4" />}
        </button>
      </motion.div>
    </motion.div>
  );
}
