# 🎨 Collardo - Real-Time Collaborative Whiteboard

**Collardo** is a real-time collaborative whiteboard that allows multiple users to draw, brainstorm, and share ideas instantly. Built with React and Socket.io, it features low-latency synchronization, dynamic room creation, and a versatile set of drawing tools.

🔗 **Live Demo:** [https://collardo.vercel.app/](https://collardo.vercel.app/)

## ✨ Features

- **Real-Time Collaboration**: See other users' drawings and movements instantly.
- **Infinite Canvas**: Pan and Zoom support for unlimited workspace.
- **Room Management**: Create private rooms simply by sharing a URL (e.g., `collardo.vercel.app/my-room`).
- **Robust Toolset**: 
  - 🖊️ **Pen** with customizable colors.
  - 🧽 **Eraser** with adjustable sizes.
  - 📝 **Sticky Notes** for brainstorming.
  - 🔡 **Text Tool** for labeling.
- **History Management**: Server-side Undo/Redo support synchronized across all users.
- **Theme Support**: Toggle between Dark 🌙 and Light ☀️ modes.
- **Export**: Save your whiteboard as an image (PNG).

## 🛠️ Tech Stack

- **Frontend:** React.js, React-Konva, Tailwind CSS
- **Backend:** Node.js, Express.js, Socket.io
- **Deployment:** Vercel (Client), Render (Server)

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites
Make sure you have **Node.js** installed.

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR-USERNAME/collab-whiteboard.git](https://github.com/YOUR-USERNAME/collab-whiteboard.git)
cd collab-whiteboard