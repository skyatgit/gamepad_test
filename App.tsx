import React, { useEffect, useState, useRef, useCallback } from 'react';
import XboxControllerVisual from './components/XboxControllerVisual';
import { GamepadState, ButtonIndex, AxisIndex } from './types';
import { Gamepad2, Zap, AlertCircle, History, Trash2 } from 'lucide-react';

// Button Name Mapping
const BUTTON_MAP: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'View',
  9: 'Menu',
  10: 'LS (左摇杆)',
  11: 'RS (右摇杆)',
  12: '↑ 上',
  13: '↓ 下',
  14: '← 左',
  15: '→ 右',
  16: 'Xbox',
  17: 'Share'
};

interface LogEntry {
  id: string;
  button: string;
  time: string;
}

const App: React.FC = () => {
  const [activeGamepadIndex, setActiveGamepadIndex] = useState<number | null>(null);
  const [gamepadState, setGamepadState] = useState<GamepadState | null>(null);
  const [isVibrating, setIsVibrating] = useState(false);
  const [inputLog, setInputLog] = useState<LogEntry[]>([]);
  
  const requestRef = useRef<number | null>(null);
  const prevButtonsRef = useRef<boolean[]>(new Array(20).fill(false));

  // Reset log and trackers when controller changes
  useEffect(() => {
    prevButtonsRef.current = new Array(20).fill(false);
    setInputLog([]);
  }, [activeGamepadIndex]);

  // Convert raw Gamepad object to our state
  const mapGamepadToState = (gp: Gamepad): GamepadState => {
    return {
      id: gp.id,
      connected: gp.connected,
      timestamp: gp.timestamp,
      buttons: gp.buttons.map(b => ({
        pressed: b.pressed,
        value: b.value,
      })),
      axes: [...gp.axes],
    };
  };

  // Main polling loop
  const scanGamepads = useCallback(() => {
    const gamepads = navigator.getGamepads();
    let currentGp: Gamepad | null = null;

    // Determine which gamepad to focus on
    if (activeGamepadIndex !== null && gamepads[activeGamepadIndex] && gamepads[activeGamepadIndex]?.connected) {
      currentGp = gamepads[activeGamepadIndex];
    } else {
      // Auto-detect if we lost connection or haven't selected one
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i]?.connected) {
          setActiveGamepadIndex(i);
          currentGp = gamepads[i];
          break;
        }
      }
    }

    if (currentGp) {
      setGamepadState(mapGamepadToState(currentGp));

      // Input Logging Logic
      const newLogs: LogEntry[] = [];
      const now = new Date();
      const timeString = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + `.${now.getMilliseconds().toString().padStart(3, '0')}`;

      currentGp.buttons.forEach((btn, index) => {
        // Expand tracker if needed to prevent index out of bounds
        if (prevButtonsRef.current.length <= index) {
            prevButtonsRef.current[index] = false;
        }

        // Detect Rising Edge (Pressed now, but wasn't before)
        if (btn.pressed && !prevButtonsRef.current[index]) {
          const btnName = BUTTON_MAP[index] || `Button ${index}`;
          newLogs.push({
            id: `${now.getTime()}-${index}-${Math.random()}`,
            button: btnName,
            time: timeString
          });
        }
        // Update previous state tracker
        prevButtonsRef.current[index] = btn.pressed;
      });

      if (newLogs.length > 0) {
        // Fixed: slice(0, 50) ensures we keep the first 50 items (newest first)
        setInputLog(prev => [...newLogs, ...prev].slice(0, 50)); 
      }

    } else {
      setGamepadState(null);
      if (activeGamepadIndex !== null) setActiveGamepadIndex(null);
    }

    requestRef.current = requestAnimationFrame(scanGamepads);
  }, [activeGamepadIndex]);

  useEffect(() => {
    window.addEventListener("gamepadconnected", (e) => {
      console.log("Gamepad connected:", e.gamepad.id);
      if (activeGamepadIndex === null) {
        setActiveGamepadIndex(e.gamepad.index);
      }
    });

    window.addEventListener("gamepaddisconnected", (e) => {
      console.log("Gamepad disconnected:", e.gamepad.id);
      if (activeGamepadIndex === e.gamepad.index) {
        setActiveGamepadIndex(null);
        setGamepadState(null);
      }
    });

    requestRef.current = requestAnimationFrame(scanGamepads);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [scanGamepads, activeGamepadIndex]);

  // Vibration test
  const testVibration = useCallback(() => {
    if (activeGamepadIndex === null) return;
    const gp = navigator.getGamepads()[activeGamepadIndex];
    
    if (gp && gp.vibrationActuator) {
      setIsVibrating(true);
      gp.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: 1000,
        weakMagnitude: 1.0,
        strongMagnitude: 1.0,
      }).then(() => setIsVibrating(false)).catch(() => setIsVibrating(false));
    } else {
      alert("此浏览器或手柄不支持通过标准 Gamepad API 进行震动测试。");
    }
  }, [activeGamepadIndex]);

  const clearLog = () => setInputLog([]);

  // Sub-component for Circular Joystick Visualization
  const JoystickCircle = ({ x, y, label }: { x: number, y: number, label: string }) => {
    const cx = 50 + (x * 40);
    const cy = 50 + (y * 40);

    return (
      <div className="flex flex-col items-center">
        <div className="flex justify-between w-full text-xs text-gray-400 mb-2 px-2">
            <span>{label}</span>
            <span className="font-mono text-[10px] tracking-tighter text-gray-500">X:{x.toFixed(2)} Y:{y.toFixed(2)}</span>
        </div>
        <div className="relative w-28 h-28 md:w-32 md:h-32 group">
          <svg viewBox="0 0 100 100" className="w-full h-full bg-gray-900 rounded-full border border-gray-700 shadow-inner group-hover:border-gray-600 transition-colors">
             <line x1="50" y1="10" x2="50" y2="90" stroke="#374151" strokeWidth="1" />
             <line x1="10" y1="50" x2="90" y2="50" stroke="#374151" strokeWidth="1" />
             <circle cx="50" cy="50" r="40" fill="none" stroke="#4b5563" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />
             <circle cx="50" cy="50" r="5" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
             <circle 
                cx={cx} 
                cy={cy} 
                r="6" 
                fill="#3b82f6" 
                stroke="#60a5fa" 
                strokeWidth="2"
                className="transition-all duration-75"
                fillOpacity="0.8"
             />
             <line x1="50" y1="50" x2={cx} y2={cy} stroke="#3b82f6" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center p-4 font-sans select-none">
      
      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between mb-6 pb-4 border-b border-gray-800/50 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-900/20 rounded-xl border border-indigo-500/20">
            <Gamepad2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Xbox 手柄检测工具</h1>
            <p className="text-sm text-gray-400">专业级输入响应与漂移测试</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
           <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${gamepadState?.connected ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`} />
           <span className={`text-sm font-medium ${gamepadState ? 'text-green-400' : 'text-gray-400'}`}>
             {gamepadState ? '已连接设备' : '等待设备连接...'}
           </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualizer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]">
             {/* Grid Pattern Background */}
             <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
             
             <XboxControllerVisual gamepad={gamepadState} />
             
             {gamepadState && (
               <div className="absolute bottom-6 right-6">
                  <button 
                    onClick={testVibration}
                    disabled={isVibrating}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all border ${
                      isVibrating 
                      ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500 cursor-wait' 
                      : 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white shadow-lg hover:shadow-indigo-500/25 active:translate-y-0.5'
                    }`}
                  >
                    <Zap className={`w-4 h-4 ${isVibrating ? 'fill-current animate-bounce' : ''}`} />
                    {isVibrating ? '震动测试中...' : '测试震动反馈'}
                  </button>
               </div>
             )}
          </div>
          
          {/* Status Bar Info for Desktop */}
          {gamepadState && (
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <span className="text-gray-500 text-xs uppercase block mb-1">Device ID</span>
                  <span className="text-gray-300 font-mono text-xs break-all leading-tight">{gamepadState.id}</span>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                   <span className="text-gray-500 text-xs uppercase block mb-1">Timestamp</span>
                   <span className="text-indigo-400 font-mono text-sm">{gamepadState.timestamp.toFixed(2)}</span>
                </div>
                 <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                   <span className="text-gray-500 text-xs uppercase block mb-1">Mapping</span>
                   <span className="text-green-400 font-mono text-sm">Standard</span>
                </div>
             </div>
          )}
        </div>

        {/* Right Column: Data Panels (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          {/* Joysticks & Triggers Card */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg">
             <h3 className="text-sm font-semibold mb-4 text-gray-400 uppercase tracking-wider flex items-center gap-2">
               <AlertCircle className="w-4 h-4" /> 摇杆 & 扳机
             </h3>
             
             {gamepadState ? (
              <>
               <div className="flex justify-around mb-6">
                 <JoystickCircle 
                   label="左摇杆" 
                   x={gamepadState.axes[AxisIndex.LX] || 0} 
                   y={gamepadState.axes[AxisIndex.LY] || 0} 
                 />
                 <JoystickCircle 
                   label="右摇杆" 
                   x={gamepadState.axes[AxisIndex.RX] || 0} 
                   y={gamepadState.axes[AxisIndex.RY] || 0} 
                 />
               </div>

               <div className="space-y-4">
                   <div>
                       <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                         <span>LT 行程</span>
                         <span className="font-mono text-gray-300">{(gamepadState.buttons[ButtonIndex.LT].value * 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                           <div 
                             className="h-full bg-indigo-500 transition-all duration-75 ease-out"
                             style={{ width: `${gamepadState.buttons[ButtonIndex.LT].value * 100}%` }}
                           />
                       </div>
                   </div>
                   <div>
                       <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                         <span>RT 行程</span>
                         <span className="font-mono text-gray-300">{(gamepadState.buttons[ButtonIndex.RT].value * 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                           <div 
                             className="h-full bg-indigo-500 transition-all duration-75 ease-out"
                             style={{ width: `${gamepadState.buttons[ButtonIndex.RT].value * 100}%` }}
                           />
                       </div>
                   </div>
               </div>
              </>
             ) : (
                <div className="h-40 flex items-center justify-center text-gray-600 text-sm italic">
                  暂无数据
                </div>
             )}
          </div>

          {/* Input Log Card */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg flex flex-col h-[360px] overflow-hidden">
             <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4" /> 按键记录
                </h3>
                {inputLog.length > 0 && (
                  <button 
                    onClick={clearLog}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="清除记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
             </div>
             
             <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {inputLog.map((log, i) => (
                   <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-2 rounded border border-gray-800/50 text-sm animate-in slide-in-from-left-2 fade-in duration-200 ${
                      i === 0 ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-gray-800/30'
                    }`}
                   >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-4 text-center">{inputLog.length - i}</span>
                        <span className={`font-bold ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                          {log.button}
                        </span>
                      </div>
                      <span className="text-gray-500 font-mono text-xs tracking-tight">
                        {log.time.split(' ')[0]}
                      </span>
                   </div>
                ))}
                
                {inputLog.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                      <Gamepad2 className="w-6 h-6 text-gray-700" />
                    </div>
                    <p className="text-sm">等待输入...</p>
                    <p className="text-xs text-gray-700">按下任意键开始记录</p>
                  </div>
                )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;