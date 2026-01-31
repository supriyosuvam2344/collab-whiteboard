import { useEffect, useState, useRef } from "react";
import { Stage, Layer, Line, Text, Rect, Group } from "react-konva";
import io from "socket.io-client";

const socket = io.connect("https://collab-whiteboard-1xea.onrender.com");

function App() {
  // --- THEME STATE ---
  const [theme, setTheme] = useState("dark"); // Default is dark

  // --- LOGIN STATE ---
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState("");
  const [inputRoom, setInputRoom] = useState("");

  // --- WHITEBOARD STATE ---
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const stageRef = useRef(null); 
  const [tool, setTool] = useState('pen'); 
  const [lineColor, setLineColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [eraserWidth, setEraserWidth] = useState(20); 
  const [showEraserPicker, setShowEraserPicker] = useState(false);

  // Data Lists
  const colors = [
    { name: "White", val: "#ffffff" },
    { name: "Black", val: "#000000" },
    { name: "Red", val: "#e74c3c" },
    { name: "Green", val: "#2ecc71" },
    { name: "Blue", val: "#3498db" },
    { name: "Yellow", val: "#f1c40f" },
    { name: "Orange", val: "#e67e22" },
  ];
  const eraserSizes = [5, 10, 20, 30, 40, 50];

  // --- THEME COLORS ---
  const themes = {
    dark: {
      bg: "#222222",
      ui: "#0f0f0f",
      text: "white",
      border: "#444",
      icon: "☀️", 
      toggleBorder: "#666" // Subtle grey border
    },
    light: {
      bg: "#ffffff",
      ui: "#f0f0f0",
      text: "black",
      border: "#ccc",
      icon: "🌙", 
      toggleBorder: "#999" // Subtle grey border
    }
  };

  const currentTheme = themes[theme];

  // --- SOCKETS ---
  useEffect(() => {
    if (!joined) return;

    socket.emit("join_room", room);

    socket.on("draw_line", (data) => {
      setLines((prev) => {
        const exists = prev.find((line) => line.id && line.id === data.id);
        if (exists) return prev; 
        return [...prev, data];
      });
    });

    socket.on("clear", () => setLines([]));
    socket.on("load_history", (history) => setLines(history));

    return () => {
      socket.off("draw_line");
      socket.off("clear");
      socket.off("load_history");
    };
  }, [joined, room]);

  // --- HANDLERS ---
  const joinRoom = (e) => {
    e.preventDefault();
    if (inputRoom.trim()) {
      setRoom(inputRoom);
      setJoined(true);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty) return;
    const pos = e.target.getStage().getPointerPosition();

    if (tool === "text") {
      const textInput = window.prompt("Type your text:");
      if (textInput) {
        const newText = { 
          id: Date.now().toString(), 
          tool: "text", 
          text: textInput, 
          x: pos.x, 
          y: pos.y, 
          fill: lineColor, 
          fontSize: 20 
        };
        setLines((prev) => [...prev, newText]);
        socket.emit("draw_line", { room, data: newText });
        socket.emit("end_stroke", { room, data: newText });
      }
      return;
    }

    if (tool === "sticky") {
      const textInput = window.prompt("Sticky Note Text:");
      if (textInput) {
        const newSticky = { id: Date.now().toString(), tool: "sticky", text: textInput, x: pos.x, y: pos.y };
        setLines((prev) => [...prev, newSticky]);
        socket.emit("draw_line", { room, data: newSticky });
        socket.emit("end_stroke", { room, data: newSticky });
      }
      return;
    }

    isDrawing.current = true;
    const currentWidth = tool === "eraser" ? eraserWidth : 5;
    const newLine = { tool: tool, points: [pos.x, pos.y], stroke: tool === "eraser" ? currentTheme.bg : lineColor, strokeWidth: currentWidth };
    setLines([...lines, newLine]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    if (!lastLine || !lastLine.points) return;
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
    socket.emit("draw_line", { room, data: lastLine });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    if (tool === "text" || tool === "sticky") return;
    const lastLine = lines[lines.length - 1];
    if (lastLine) socket.emit("end_stroke", { room, data: lastLine });
  };

  const handleDblClick = (e, id, currentText) => {
    e.cancelBubble = true; 
    const newText = window.prompt("Edit your text:", currentText);
    if (newText !== null && newText !== currentText) {
      setLines(lines.map(line => line.id === id ? { ...line, text: newText } : line));
      socket.emit("edit_line", { room, id, newText });
    }
  };

  const handleDragEnd = (e, id) => {
    const newX = e.target.x();
    const newY = e.target.y();
    setLines(lines.map(line => line.id === id ? { ...line, x: newX, y: newY } : line));
    socket.emit("move_element", { room, id, x: newX, y: newY });
  };

  const undo = () => {
    // Alert the user exactly what the code sees
    alert(`DEBUG: Room ID is [${room}]`); 

    if (room) {
      socket.emit("undo", room);
      console.log("Sent undo to:", room);
    }
  };

  const clearBoard = () => {
    // Alert the user exactly what the code sees
    alert(`DEBUG: Room ID is [${room}]`);

    if (room) {
      socket.emit("clear", room); // Remember: Server listens for "clear", not "clearBoard"
      console.log("Sent clear to:", room);
    }
  };

  const getCursorStyle = () => {
    if (tool === "text") return "text";
    if (tool === "eraser") {
      const size = eraserWidth;
      const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size/2}" cy="${size/2}" r="${(size/2)-1}" stroke="${currentTheme.text}" stroke-width="1" fill="none"/></svg>`;
      const url = `data:image/svg+xml;base64,${btoa(svg)}`;
      return `url("${url}") ${size/2} ${size/2}, auto`;
    }
    return "default";
  };

  // --- RENDER ---
  
  if (!joined) {
    return (
      <div style={{ 
        width: "100vw", height: "100vh", background: currentTheme.bg, display: "flex", 
        alignItems: "center", justifyContent: "center", color: currentTheme.text, fontFamily: "Arial",
        transition: "background 0.3s ease" 
      }}>
        <div style={{ background: currentTheme.ui, padding: "40px", borderRadius: "10px", textAlign: "center", boxShadow: "0 0 20px rgba(0,0,0,0.5)", border: `1px solid ${currentTheme.border}` }}>
          <h1>🎨 Collab Whiteboard</h1>
          <form onSubmit={joinRoom} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <input 
              placeholder="Enter Room ID" 
              style={{ padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #999", outline: "none" }}
              onChange={(e) => setInputRoom(e.target.value)}
            />
            <button 
              type="submit" 
              style={{ padding: "10px", fontSize: "16px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
            >
              Join Room
            </button>
          </form>
        </div>
        
        {/* THEME TOGGLE (Login Screen) */}
        <button onClick={toggleTheme} style={{
          position: "fixed", bottom: "20px", right: "20px", width: "40px", height: "40px", borderRadius: "10px",
          background: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.toggleBorder}`,
          fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.3s ease"
        }}>
          {currentTheme.icon}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* TOOLBAR */}
      <div style={{ 
        padding: "10px", textAlign: "center", background: currentTheme.ui, 
        display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${currentTheme.border}`,
        transition: "background 0.3s ease"
      }}>
        
        <div style={{ position: "absolute", left: "20px", color: "#888", fontSize: "14px" }}>
          Room: <strong style={{color: currentTheme.text}}>{room}</strong>
        </div>

        {/* Tools */}
        <div style={{ display: "inline-block", position: "relative" }}>
          <button onClick={() => { setTool("pen"); setShowColorPicker(false); setShowEraserPicker(false); }}
            style={{ padding: "10px", background: tool === "pen" ? lineColor : "#ddd", color: tool === "pen" && lineColor === "#000000" ? "white" : "black", border: "1px solid #999", borderRight: "none", cursor: "pointer" }}>🖊️</button>
          <button onClick={() => { setShowColorPicker(!showColorPicker); setShowEraserPicker(false); }}
            style={{ padding: "10px", background: "#656161ff", border: "1px solid #999", cursor: "pointer" }}>▼</button>
          {showColorPicker && (
            <div style={{ position: "absolute", top: "100%", left: 0, background: "#333", border: "1px solid #555", zIndex: 100, display: "flex", flexDirection: "row", padding: "5px", gap: "5px", borderRadius: "5px" }}>
              {colors.map((c) => <button key={c.val} title={c.name} onClick={() => { setLineColor(c.val); setTool("pen"); setShowColorPicker(false); }} style={{ width: "40px", height: "40px", background: c.val, borderRadius: "5px", cursor: "pointer", border: lineColor === c.val ? "2px solid white" : "1px solid #777" }} />)}
            </div>
          )}
        </div>

        <button onClick={() => setTool('text')} style={{ marginLeft: "15px", background: tool === "text" ? "#ddd" : "#efefef", padding: "10px", border: "1px solid #999", cursor: "pointer" }}>Aa</button>
        <button onClick={() => setTool('sticky')} style={{ marginLeft: "15px", padding: "10px", border: "1px solid #999", cursor: "pointer" }}>🟨</button>

        <div style={{ display: "inline-block", position: "relative", marginLeft: "15px" }}>
          <button onClick={() => { setTool("eraser"); setShowEraserPicker(false); setShowColorPicker(false); }}
            style={{ padding: "10px", background: tool === "eraser" ? currentTheme.bg : undefined, border: "1px solid #1f1d1dff", borderRight: "none", cursor: "pointer" }}>🧽</button>
          <button onClick={() => { setShowEraserPicker(!showEraserPicker); setShowColorPicker(false); }}
            style={{ padding: "10px", background: "#656161ff", border: "1px solid #999", cursor: "pointer" }}>▼</button>
          {showEraserPicker && (
            <div style={{ position: "absolute", top: "100%", left: 0, background: "#333", border: "1px solid #555", zIndex: 100, display: "flex", flexDirection: "row", padding: "5px", gap: "5px", borderRadius: "5px" }}>
              {eraserSizes.map((size) => <button key={size} title={`Size: ${size}`} onClick={() => { setEraserWidth(size); setTool("eraser"); setShowEraserPicker(false); }} style={{ width: "40px", height: "40px", background: "#444", borderRadius: "5px", cursor: "pointer", border: eraserWidth === size ? "2px solid white" : "1px solid #777", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: size > 30 ? "30px" : `${size}px`, height: size > 30 ? "30px" : `${size}px`, background: "white", borderRadius: "50%" }} /></button>)}
            </div>
          )}
        </div>

        <button onClick={undo} style={{ marginLeft: "15px", color: "orange", padding: "10px", border: "1px solid #999", cursor: "pointer" }}>↩️</button>
        {/* ✅ The onClick must match the function name exactly */}
        <button onClick={clearBoard} style={{ marginLeft: "15px", color: "red", padding: "10px", border: "1px solid #999", cursor: "pointer" }}>🗑️</button>
        <button onClick={handleExport} title="Save Image" style={{ marginLeft: "15px", padding: "10px", border: "1px solid #999", cursor: "pointer" }}>📷</button>
        
        <button onClick={() => window.location.reload()} style={{ position: "absolute", right: "20px", background: "transparent", color: "#666", border: "1px solid #444", padding: "5px 10px", cursor: "pointer", fontSize: "12px" }}>Leave Room</button>
      </div>

      {/* CANVAS */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}

        // For simple background
        style={{ background: currentTheme.bg, cursor: getCursorStyle(), transition: "background 0.3s ease" }}

        // For dotted grid
        // style={{ 
        //   // 1. background color
        //   backgroundColor: currentTheme.bg, 
          
        //   // 2. Add the dots using CSS gradient
        //   backgroundImage: `radial-gradient(${currentTheme.toggleBorder} 1px, transparent 1px)`,
          
        //   // 3. Set the spacing of the dots
        //   backgroundSize: "90px 90px",
          
        //   cursor: getCursorStyle(), 
        //   transition: "background 0.3s ease" 
        // }}

        // For line grid
        // style={{ 
        //   // 1. Background Color
        //   backgroundColor: currentTheme.bg, 
          
        //   // 2. GRID LINES (Vertical & Horizontal)
        //   backgroundImage: `
        //     linear-gradient(${currentTheme.toggleBorder} 1px, transparent 1px), 
        //     linear-gradient(90deg, ${currentTheme.toggleBorder} 1px, transparent 1px)
        //   `,
          
        //   // 3. Size of the squares (Change "40px" to make them bigger/smaller)
        //   backgroundSize: "110px 110px",
          
        //   cursor: getCursorStyle(), 
        //   transition: "background 0.3s ease" 
        // }}

        ref={stageRef}
      >
        <Layer>
          {lines.map((line, i) => {
            if (line.tool === "text") return <Text key={i} x={line.x} y={line.y} text={line.text} fill={line.fill} fontSize={20} draggable onDblClick={(e) => handleDblClick(e, line.id, line.text)} onDragEnd={(e) => handleDragEnd(e, line.id)} />;
            if (line.tool === "sticky") return (<Group key={i} x={line.x} y={line.y} draggable onDblClick={(e) => handleDblClick(e, line.id, line.text)} onDragEnd={(e) => handleDragEnd(e, line.id)}><Rect width={150} height={150} fill="#ffeb3b" shadowBlur={10} cornerRadius={5} /><Text text={line.text} width={150} height={150} padding={10} fontSize={18} fill="black" fontFamily="Arial" /></Group>);
            return <Line key={i} points={line.points} stroke={line.tool === "eraser" ? currentTheme.bg : line.stroke} strokeWidth={line.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'} />;
          })}
        </Layer>
      </Stage>

      {/* ✨ THEME TOGGLE (Main Screen) - UPDATED STYLE */}
      <button onClick={toggleTheme} style={{
        position: "fixed", bottom: "20px", right: "20px", width: "40px", height: "40px", borderRadius: "10px",
        background: currentTheme.bg, color: currentTheme.text, border: `1px solid ${currentTheme.toggleBorder}`,
        fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.3s ease", zIndex: 1000
      }}>
        {currentTheme.icon}
      </button>
    </div>
  );
}

export default App;