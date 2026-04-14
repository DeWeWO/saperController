// ====================== js/main.js ======================
const DOMAIN = 'saper.dewew.dev';
const MQTT_USER = 'robotuser';
const MQTT_PASS = 'RobotSaper2026!';   // ← o‘zingizning parolingiz

let mqttClient;
let socket;
let peerConnection;
const videoEl = document.getElementById('remoteVideo');
const statusEl = document.getElementById('status');

// ================== SIGNALING SERVER ==================
function connectSignaling() {
  socket = io(`https://${DOMAIN}`, { 
    path: '/socket.io',
    secure: true,
    reconnection: true
  });

  socket.on('connect', () => {
    console.log('✅ Signaling Server ulandi');
    socket.emit('register', 'controller');
    statusEl.textContent = '✅ Ulandi';
    statusEl.classList.add('status-connected');
  });

  socket.on('offer', handleOffer);
  socket.on('answer', handleAnswer);
  socket.on('ice-candidate', handleIceCandidate);
}

// ================== WEBRTC ==================
async function startWebRTC() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: `turn:${DOMAIN}:5349`, username: MQTT_USER, credential: MQTT_PASS }]
  });

  peerConnection.ontrack = (e) => {
    videoEl.srcObject = e.streams[0];
    document.getElementById('videoStatus').style.display = 'none';
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) socket.emit('ice-candidate', e.candidate);
  };
}

// ================== MQTT ==================
function connectMQTT() {
  mqttClient = new Paho.MQTT.Client(DOMAIN, 9001, "controller_" + Math.random().toString(16).substr(2,8));
  mqttClient.connect({
    useSSL: true,
    userName: MQTT_USER,
    password: MQTT_PASS,
    onSuccess: () => console.log('✅ MQTT ulandi'),
    onFailure: (err) => console.error('MQTT xato:', err)
  });
}

// ================== REALISTIK JOYSTICK ==================
function initJoysticks() {
  const options = {
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: '#0f0',
    size: 160,
    threshold: 0.1
  };

  // Joystick 1 (Chap - Qo'l 1)
  const joy1 = nipplejs.create({
    zone: document.getElementById('joystick1'),
    ...options,
    color: '#00ff88'
  });

  // Joystick 2 (O'ng - Qo'l 2)
  const joy2 = nipplejs.create({
    zone: document.getElementById('joystick2'),
    ...options,
    color: '#0088ff'
  });

  // Real animatsiya funksiyasi
  function addRealEffect(joystick, data) {
    const base = joystick.el; // joystick div
    base.style.transition = 'transform 0.1s ease';

    if (data) {
      // Harakat paytida
      const angle = data.angle.radian;
      const force = Math.min(data.force / 2, 1); // 0-1 oralig‘ida
      
      base.style.transform = `scale(${1 + force * 0.15})`;
      base.style.boxShadow = `0 0 30px rgba(255,255,255,${0.4 + force * 0.6})`;
      
      // Ichki nuqta rangini o‘zgartirish
      if (base.querySelector('.nipple')) {
        base.querySelector('.nipple').style.background = data.force > 1.5 ? '#ff0' : '#fff';
      }
    } else {
      // Qo‘yib yuborilganda
      base.style.transform = 'scale(1)';
      base.style.boxShadow = '0 0 20px rgba(0,0,0,0.6)';
    }
  }

  // Joystick 1
  joy1.on('start', () => addRealEffect(joy1, null));
  joy1.on('move', (evt, data) => {
    addRealEffect(joy1, data);
    if (mqttClient) {
      const x = data.force * Math.cos(data.angle.radian);
      const y = data.force * Math.sin(data.angle.radian);
      mqttClient.publish('robot/arm1', JSON.stringify({ x: x, y: y }), { qos: 0 });
    }
  });
  joy1.on('end', () => {
    addRealEffect(joy1, null);
    if (mqttClient) mqttClient.publish('robot/arm1', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
  });

  // Joystick 2
  joy2.on('start', () => addRealEffect(joy2, null));
  joy2.on('move', (evt, data) => {
    addRealEffect(joy2, data);
    if (mqttClient) {
      const x = data.force * Math.cos(data.angle.radian);
      const y = data.force * Math.sin(data.angle.radian);
      mqttClient.publish('robot/arm2', JSON.stringify({ x: x, y: y }), { qos: 0 });
    }
  });
  joy2.on('end', () => {
    addRealEffect(joy2, null);
    if (mqttClient) mqttClient.publish('robot/arm2', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
  });
}

// ================== KAMERA DRAG-TO-PAN ==================
function initDragControl() {
  let isDragging = false;
  let startX, startY;

  videoEl.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; });
  videoEl.addEventListener('touchstart', (e) => { isDragging = true; startX = e.touches[0].clientX; startY = e.touches[0].clientY; });

  const moveHandler = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = (clientX - startX) * 0.8;
    const deltaY = (clientY - startY) * 0.8;
    if (mqttClient) {
      mqttClient.publish('robot/camera', JSON.stringify({ pan: deltaX, tilt: deltaY }), { qos: 0 });
    }
  };

  document.addEventListener('mousemove', (e) => moveHandler(e.clientX, e.clientY));
  document.addEventListener('touchmove', (e) => moveHandler(e.touches[0].clientX, e.touches[0].clientY));

  document.addEventListener('mouseup', () => { isDragging = false; });
  document.addEventListener('touchend', () => { isDragging = false; });
}

// ================== BOSHQA TUGMALAR ==================
document.getElementById('stopBtn').addEventListener('click', () => {
  if (mqttClient) mqttClient.publish('robot/emergency', 'STOP', { qos: 1 });
  alert('🛑 Emergency Stop yuborildi!');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (mqttClient) {
    mqttClient.publish('robot/arm1', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
    mqttClient.publish('robot/arm2', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
  }
});

// ================== BOSHLANISH ==================
window.onload = () => {
  connectSignaling();
  startWebRTC();
  connectMQTT();
  initJoysticks();
  initDragControl();
};