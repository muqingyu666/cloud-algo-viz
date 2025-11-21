# PCIV Algorithm Visualization (Web Simulation)

## 🌐 Live Demo

👉 [点击查看在线演示 / Click to View Live Demo](cloud-algo-viz.vercel.app)

## 📖 项目背景 (Background)

本项目是 In-situ vs Anvil Cirrus Classification 算法的可视化实现。
传统的卷云分类方法依赖于光学厚度阈值，容易混淆物理性质不同的云层。本算法基于 PCIV (Physically Constrained Iterative Vision) 理论，通过模拟深对流核心（Convection Cores）的物质输送与物理约束（如温度 $T < -38^\circ C$ 和 冰水含量 $IWC$ 连续性），实现对砧状云（Anvil）与原位卷云（In-situ）的精准分离。

## 🛠 技术栈 (Tech Stack)

为了将复杂的科学算法逻辑转化为直观的交互体验，本项目采用了现代前端工程化方案：

- **Core Logic**: JavaScript (ES6+) 实现元胞自动机（Cellular Automata）风格的区域生长算法。
- **UI Framework**: React 18 (Hooks based state management).
- **Styling**: Tailwind CSS (Utility-first CSS framework).
- **Build Tool**: Vite (High-performance tooling).

## ⚡️ 核心算法逻辑 (Core Algorithm)

模拟器在前端复现了以下物理过程：

1. **Seed Identification**: 识别深对流核心（红色）。
2. **Iterative Expansion**:
   - 从核心出发，遍历 4-邻域像素。
   - **Constraint 1**: 温度必须低于 homogeneous freezing threshold (-38°C)。
   - **Constraint 2**: IWC 梯度必须符合物理扩散规律。
3. **Classification**: 满足生长约束的标记为 Anvil（蓝色），其余独立冰晶云标记为 In-situ（紫色）。

## 🚀 本地运行 (How to Run)

```bash
# Clone repository
git clone https://github.com/muqingyu666/cloud-algo-viz.git

# Install dependencies
npm install

# Start development server
npm run dev
```

## 👨‍💻 Author

**Muqy**
Atmospheric Science Researcher / Algorithm Engineer
Focusing on Cloud Physics, Remote Sensing, and High-Performance Computing.
