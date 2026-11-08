import React from 'react';import {createRoot} from 'react-dom/client';import {ClientProvider} from '@solana/react';
import {client} from './wallet';import {App} from './App';import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ClientProvider client={client}><App/></ClientProvider></React.StrictMode>);
