import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';
import App from './App';
import { types, transitions, positions, Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'

const alertOptions = {
  position: positions.TOP_RIGHT,
  timeout: 3000,
  type: types.INFO,
  transition: transitions.FADE
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AlertProvider template={AlertTemplate} {...alertOptions}>
    <App />
  </AlertProvider>,
);