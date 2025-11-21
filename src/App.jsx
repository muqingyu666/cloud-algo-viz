import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Info, Thermometer, Droplets } from 'lucide-react';

// --- Constants & Config ---
const GRID_WIDTH = 40;
const GRID_HEIGHT = 25;
const DELAY_MS = 200;

// Cell Types
const TYPE_CLEAR = 0;
const TYPE_CONVECTION = 1; // The "Seed"
const TYPE_ICE_UNCLASSIFIED = 2; // Potential Cirrus
const TYPE_ANVIL = 3; // Classified Anvil (Liquid Origin)
const TYPE_INSITU = 4; // Classified In-Situ

// --- Helper: Generate Mock Data ---
const generateInitialGrid = () => {
  const grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Base Atmosphere Model
      // Temp decreases with height (y=0 is top, y=height is bottom)
      // Let's say y=0 is 18km (-80C), y=25 is 5km (-20C)
      const temp = -80 + (y / GRID_HEIGHT) * 60; 
      
      // Create some structure using simple noise-like logic
      // 1. Convective Core (The Seed)
      const isCore = (x > 10 && x < 14 && y > 10) || (x > 11 && x < 13 && y > 5);
      
      // 2. Anvil Outflow (Attached to core but unclassified initially)
      const isOutflow = !isCore && (x >= 14 && x < 28 && y > 6 && y < 12 + (x-14)*0.2) && Math.random() > 0.1;
      
      // 3. Distant In-situ cloud (Detached)
      const isInSitu = (x > 30 && x < 38 && y > 5 && y < 9) && Math.random() > 0.15;

      let type = TYPE_CLEAR;
      let iwc = 0;

      if (isCore) {
        type = TYPE_CONVECTION;
        iwc = 1000; // High IWC
      } else if (isOutflow || isInSitu) {
        type = TYPE_ICE_UNCLASSIFIED;
        // IWC decreases away from core for outflow
        if (isOutflow) iwc = 500 - (x - 14) * 30 + Math.random() * 50;
        else iwc = 100 + Math.random() * 50;
      }

      // Add some randomness/holes
      if (type !== TYPE_CLEAR && Math.random() > 0.95) type = TYPE_CLEAR;

      row.push({
        x, y,
        type,
        temp: temp, 
        iwc: Math.max(0, iwc),
        isNew: false // For animation effect
      });
    }
    grid.push(row);
  }
  return grid;
};

const PCIVSimulation = () => {
  const [grid, setGrid] = useState(generateInitialGrid());
  const [iteration, setIteration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({ anvil: 0, insitu: 0, unclassified: 0 });
  const [hoverInfo, setHoverInfo] = useState(null);
  
  const intervalRef = useRef(null);

  // --- The PCIV Algorithm Step ---
  const performStep = () => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => row.map(cell => ({ ...cell, isNew: false })));
      let changesMade = false;

      // 1. Identify Sources for Expansion in this step
      // Sources are either Convective Cores or already identified Anvils
      const sources = [];
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const cell = prevGrid[y][x];
          if (cell.type === TYPE_CONVECTION || cell.type === TYPE_ANVIL) {
            sources.push(cell);
          }
        }
      }

      // 2. Iterative Expansion (Dilation)
      // Look at neighbors of sources
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 4-connectivity

      sources.forEach(source => {
        directions.forEach(([dx, dy]) => {
          const nx = source.x + dx;
          const ny = source.y + dy;

          if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            const target = newGrid[ny][nx];

            // CONDITION: Target must be Unclassified Ice
            if (target.type === TYPE_ICE_UNCLASSIFIED) {
              
              // PHYSICAL CONSTRAINT 1: Temperature < -38C
              const isColdEnough = target.temp < -38;

              // PHYSICAL CONSTRAINT 2: IWC Continuity
              // "mean IWC not exceeding 1.2 times that of the parent"
              // Simplified here for demo: IWC shouldn't jump drastically
              const isIWCValid = target.iwc <= (source.iwc * 1.5); 

              if (isColdEnough && isIWCValid) {
                target.type = TYPE_ANVIL;
                target.isNew = true; // Trigger animation
                changesMade = true;
              }
            }
          }
        });
      });

      // If no changes, algorithm has converged. 
      // Classify remaining ice as In-Situ.
      if (!changesMade) {
        let finished = true;
        for (let y = 0; y < GRID_HEIGHT; y++) {
          for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = newGrid[y][x];
            if (cell.type === TYPE_ICE_UNCLASSIFIED) {
              // Check vertical separation constraint mentioned in paper (simplified)
              if (cell.temp < -38) {
                cell.type = TYPE_INSITU;
                cell.isNew = true;
                finished = false; // We made a final classification change
              }
            }
          }
        }
        if (finished) setIsRunning(false); // Stop simulation
      }

      return newGrid;
    });

    setIteration(prev => prev + 1);
  };

  // --- Simulation Loop ---
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(performStep, DELAY_MS);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // --- Stats Calculation ---
  useEffect(() => {
    let anvil = 0, insitu = 0, unclassified = 0;
    grid.flat().forEach(cell => {
      if (cell.type === TYPE_ANVIL) anvil++;
      if (cell.type === TYPE_INSITU) insitu++;
      if (cell.type === TYPE_ICE_UNCLASSIFIED) unclassified++;
    });
    setStats({ anvil, insitu, unclassified });
  }, [grid]);

  // --- Render Helpers ---
  const getCellColor = (cell) => {
    switch (cell.type) {
      case TYPE_CONVECTION: return 'bg-red-600';
      case TYPE_ANVIL: return 'bg-blue-500';
      case TYPE_INSITU: return 'bg-purple-500';
      case TYPE_ICE_UNCLASSIFIED: return 'bg-gray-300';
      default: return 'bg-gray-900'; // Empty sky
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIteration(0);
    setGrid(generateInitialGrid());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100 font-sans p-4">
      
      {/* Header Area */}
      <div className="w-full max-w-4xl mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-400">
          <RefreshCw className={`w-6 h-6 ${isRunning ? 'animate-spin' : ''}`} />
          PCIV Algorithm Visualization
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Simulating "Physically Constrained Iterative Vision" for Cirrus Classification.
          Watch the Anvil (Blue) grow from Deep Convection (Red).
        </p>
      </div>

      {/* Main Dashboard */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
        
        {/* Left: The Grid */}
        <div className="flex-1 bg-gray-900 p-4 rounded-xl shadow-2xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-xs text-gray-500 font-mono">
            CloudSat/CALIPSO Curtain View
          </div>
          
          <div 
            className="grid gap-[1px] mx-auto"
            style={{
              gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))`,
              width: '100%',
              aspectRatio: `${GRID_WIDTH}/${GRID_HEIGHT}`
            }}
            onMouseLeave={() => setHoverInfo(null)}
          >
            {grid.map((row, y) => (
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`
                    ${getCellColor(cell)} 
                    ${cell.isNew ? 'animate-pulse ring-2 ring-white z-10' : ''}
                    w-full h-full transition-colors duration-300 ease-in-out cursor-crosshair
                  `}
                  onMouseEnter={() => setHoverInfo(cell)}
                />
              ))
            ))}
          </div>

          {/* Hover Tooltip */}
          {hoverInfo && (
            <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur p-3 rounded border border-gray-700 text-xs shadow-lg z-20">
              <div className="font-bold mb-1 text-gray-300">Pixel Probe ({hoverInfo.x}, {hoverInfo.y})</div>
              <div className="flex items-center gap-2 text-cyan-300">
                <Thermometer size={12} /> Temp: {hoverInfo.temp.toFixed(1)}°C
              </div>
              <div className="flex items-center gap-2 text-blue-300">
                <Droplets size={12} /> IWC: {hoverInfo.iwc.toFixed(0)} mg/m³
              </div>
              <div className="mt-1 pt-1 border-t border-gray-700 text-gray-400 capitalize">
                Status: {
                  hoverInfo.type === 1 ? 'Convection Core' : 
                  hoverInfo.type === 3 ? 'Anvil (Liquid Origin)' :
                  hoverInfo.type === 4 ? 'In-situ (Ice Origin)' : 
                  hoverInfo.type === 2 ? 'Unclassified Ice' : 'Clear Air'
                }
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls & Logic */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          
          {/* Control Panel */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-200">Controls</h3>
              <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-yellow-500">
                Iter: {iteration}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded font-semibold transition ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start Expansion</>}
              </button>
              <button 
                onClick={handleReset}
                className="px-3 bg-gray-700 hover:bg-gray-600 rounded transition"
                title="Reset Simulation"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Legend / Stats */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex-1">
            <h3 className="font-bold text-gray-200 mb-3">Classification Logic</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-600 rounded shadow shadow-red-900/50"></div>
                <div>
                  <div className="font-semibold">Convective Core</div>
                  <div className="text-xs text-gray-400">The "Seed" (Start)</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <div className="flex-1">
                  <div className="font-semibold">Unclassified Ice</div>
                  <div className="text-xs text-gray-400">Candidate pixels</div>
                </div>
                <div className="font-mono text-gray-500">{stats.unclassified} px</div>
              </div>

              <div className="p-2 bg-gray-900/50 rounded border border-dashed border-gray-600 my-2">
                <div className="text-xs text-center text-gray-400 mb-1">↓ Iterative Expansion ↓</div>
                <div className="text-[10px] text-gray-500 leading-tight text-center">
                  Check: Temp &lt; -38°C <br/>
                  Check: IWC Continuity
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded shadow shadow-blue-900/50"></div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-300">Anvil Cirrus</div>
                  <div className="text-xs text-gray-400">Connected to Core</div>
                </div>
                <div className="font-mono text-blue-400">{stats.anvil} px</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-purple-500 rounded shadow shadow-purple-900/50"></div>
                <div className="flex-1">
                  <div className="font-semibold text-purple-300">In-situ Cirrus</div>
                  <div className="text-xs text-gray-400">Isolated / Formed alone</div>
                </div>
                <div className="font-mono text-purple-400">{stats.insitu} px</div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-800/50 rounded text-xs text-blue-200">
              <Info size={14} className="inline mr-1 mb-1"/>
              <strong>Why this matters:</strong> Conventional methods use thresholds (Optical Depth) which confuse thick In-situ clouds with Anvils. PCIV tracks the <em>physical history</em> of the air parcel.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PCIVSimulation;
