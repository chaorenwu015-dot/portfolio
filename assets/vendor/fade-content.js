/* FadeContent static adapter: uses the user-supplied React Bits mist mask helpers. */
(()=>{
 if(!window.gsap||!window.ScrollTrigger)return;
 gsap.registerPlugin(ScrollTrigger);
const SVG_NS = 'http://www.w3.org/2000/svg';

const NOISE_EFFECTS = ['dissolve', 'mist', 'pixel'];

const LEVELS = Array.from({ length: 33 }, (_, i) => 1 / (1 + Math.exp(-10.8 * (i / 32 - 0.5))));

let maskCount = 0;

const toSeconds = value => (typeof value === 'number' && value > 10 ? value / 1000 : value);

const clamp01 = value => Math.min(Math.max(value, 0), 1);

const smoothstep = (from, to, value) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

const noiseFor = (kind, size) => {
  if (kind === 'mist') {
    return { frequency: Math.min(Math.max(4 / size, 0.004), 0.02), octaves: 3, edge: 0.35, blur: 10, block: 0 };
  }
  if (kind === 'pixel') {
    const block = 2 * Math.round(Math.min(Math.max(size / 32, 6), 24) / 2);
    return { frequency: 0.5 / block, octaves: 1, edge: 0.06, blur: 0, block };
  }
  return { frequency: 0.6, octaves: 1, edge: 0.15, blur: 0, block: 0 };
};

const createNoiseMask = (target, kind, floor, extraBlur) => {
  const box = target.getBoundingClientRect();
  const { frequency, octaves, edge, blur, block } = noiseFor(kind, Math.sqrt(Math.max(box.width * box.height, 1)));
  const node = (name, attrs, parent) => {
    const child = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => child.setAttribute(key, String(value)));
    parent.appendChild(child);
    return child;
  };
  const svg = node('svg', { width: 0, height: 0, 'aria-hidden': 'true' }, document.body);
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const id = `fade-content-mask-${(maskCount += 1)}`;
  const filter = node(
    'filter',
    { id, x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' },
    svg
  );
  node(
    'feTurbulence',
    {
      type: 'fractalNoise',
      baseFrequency: frequency,
      numOctaves: octaves,
      seed: Math.floor(Math.random() * 1000),
      result: 'noise'
    },
    filter
  );
  let source = 'noise';
  if (block > 0) {
    const dot = block / 2 - 1;
    node(
      'feColorMatrix',
      { in: 'noise', type: 'matrix', values: '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 1', result: 'gray' },
      filter
    );
    node('feFlood', { x: dot, y: dot, width: 2, height: 2, 'flood-color': '#000', result: 'dot' }, filter);
    node('feComposite', { in: 'dot', in2: 'dot', width: block, height: block, result: 'cell' }, filter);
    node('feTile', { in: 'cell', result: 'grid' }, filter);
    node('feComposite', { in: 'gray', in2: 'grid', operator: 'in', result: 'samples' }, filter);
    node('feMorphology', { in: 'samples', operator: 'dilate', radius: dot, result: 'blocks' }, filter);
    source = 'blocks';
  }
  node(
    'feColorMatrix',
    { in: source, type: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.43 0 0 0 -0.21' },
    filter
  );
  const curve = node('feFuncA', { type: 'table' }, node('feComponentTransfer', { result: 'mask' }, filter));
  node('feComposite', { in: 'SourceGraphic', in2: 'mask', operator: 'in' }, filter);

  const url = `url(#${id})`;
  const blurFrom = blur + extraBlur;
  const state = { progress: 0 };
  let drawn = -1;

  const render = () => {
    const progress = state.progress;
    if (progress === drawn) return;
    drawn = progress;
    if (progress >= 1) {
      target.style.filter = '';
      target.style.visibility = 'inherit';
      return;
    }
    const front = progress * (1 + 2 * edge) - edge;
    curve.setAttribute(
      'tableValues',
      LEVELS.map(level => (floor + (1 - floor) * (1 - smoothstep(front - edge, front + edge, level))).toFixed(3)).join(
        ' '
      )
    );
    target.style.filter = blurFrom > 0 ? `${url} blur(${(blurFrom * (1 - progress)).toFixed(2)}px)` : url;
    target.style.visibility = progress <= 0 && floor <= 0 ? 'hidden' : 'inherit';
  };

  render();

  return {
    state,
    render,
    remove: () => {
      svg.remove();
      target.style.filter = '';
    }
  };
};


 const selector='.hero-profile,.profile-skills,.journey-heading,.journey-event article,.profile-honors,.section-head,.urban-project-header';
 const groups=[...document.querySelectorAll(selector)];
 const mm=gsap.matchMedia();
 mm.add('(prefers-reduced-motion: no-preference)',()=>{
  const cleanups=[];
  groups.forEach(el=>{
   const targets=el.matches('.hero-profile,.profile-skills')?[...el.children]:[el];
   let masks=[],tl=null,played=false;
   const settle=()=>{masks.forEach(m=>m.remove());masks=[];targets.forEach(t=>{t.style.visibility='';t.style.filter='';t.style.opacity=''})};
   // Keep unvisited content in normal document flow, and start filters only when visible.
   targets.forEach(t=>t.style.opacity='0');
   const play=()=>{if(played)return;played=true;targets.forEach(t=>t.style.opacity='');masks=targets.map(t=>createNoiseMask(t,'mist',0,0));tl=gsap.timeline({onComplete:settle});tl.to(masks.map(m=>m.state),{progress:1,duration:1.8,ease:'power2.out',stagger:.1,onUpdate:()=>masks.forEach(m=>m.render())});};
   const trigger=ScrollTrigger.create({trigger:el,start:'clamp(top 90%)',once:true,onEnter:play,onEnterBack:play});
   const box=el.getBoundingClientRect();if(box.top<innerHeight*.9&&box.bottom>0)play();
   // Keyboard focus must never land on concealed content.
   const focus=()=>{played=true;tl?.kill();settle()};el.addEventListener('focusin',focus);
   cleanups.push(()=>{trigger.kill();tl?.kill();settle();el.removeEventListener('focusin',focus)});
  });
  return()=>cleanups.forEach(fn=>fn());
 });
})();
