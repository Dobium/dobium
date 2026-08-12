import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './src/pages/LandingPage';

class B extends React.Component {
  constructor(p){ super(p); this.state={err:null}; }
  static getDerivedStateFromError(err){ return {err}; }
  render(){ return this.state.err ? React.createElement('div',null,'CAUGHT') : this.props.children; }
}
async function once(label, fetchImpl) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url:'https://dobium.com/' });
  global.window = dom.window; global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement; global.localStorage = dom.window.localStorage;
  global.fetch = fetchImpl;
  const orig = console.error; console.error = () => {};
  const ref = React.createRef();
  let out;
  try {
    createRoot(document.getElementById('root')).render(
      React.createElement(B,{ref}, React.createElement(MemoryRouter,null,React.createElement(LandingPage))));
    await new Promise(r=>setTimeout(r,1000));
    const err = ref.current?.state?.err?.message;
    const n = document.getElementById('root').innerHTML.length;
    out = err ? `CRASH ${label}: ${err}` : (n>500 ? `OK    ${label} (${n} chars)` : `BLANK ${label} (${n})`);
  } catch(e){ out = `THREW ${label}: ${e.message}`; }
  console.error = orig;
  return out;
}
export async function run(){
  return [
    await once('api all-empty-array', async () => ({ ok:true, json: async()=>[] })),
    await once('api rejects',         async () => { throw new Error('offline'); }),
    await once('pulse missing fields',async () => ({ ok:true, json: async()=>({}) })),
    await once('pulse good',          async () => ({ ok:true, json: async()=>({ paper_volume_traded: 20029.08, users: 39 }) })),
  ];
}
