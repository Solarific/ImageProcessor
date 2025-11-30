import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ImageBlur from './pages/ImageBlur';
import EdgeDetection from './pages/EdgeDetection';
import GreyScale from './pages/GrayScale'
import Contrast from './pages/Contrast';
import Brightness from './pages/Brightness';
import Posterize from './pages/Posterize';

import './App.css';
import Sharpening from './pages/Sharpening';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blur" element={<ImageBlur />} />
          <Route path="/edge-detection" element={<EdgeDetection />} />
          <Route path="/Brightness" element={<Brightness />} />
          <Route path="/gray-scale" element={<GreyScale />} />
          <Route path="/Sharpening" element={<Sharpening />} />
          <Route path="/Contrast" element={<Contrast />} />
          <Route path="/posterize" element={<Posterize />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;