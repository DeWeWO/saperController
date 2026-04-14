const DOMAIN = 'saper.dewew.dev';
const MQTT_USER = 'robotuser';
const MQTT_PASS = 'RobotSaper2026!';   // ← o‘zingizning parolingiz

let mqttClient;
let socket;
let peerConnection;
const videoEl = document.getElementById('remoteVideo');
const statusEl = document.getElementById('status');

// 1. Signaling Server (Nginx orqali, portsiz)
function connectSignaling() {
  socket = io(`https://${DOMAIN}`, { 
    path: '/socket.io',
    secure: true,
    reconnection: true
  });

  socket.on('connect', () => {
    console.log('✅ Signaling Server ulandi');
    socket.emit('register', 'controller');
    statusEl.textContent = '✅ Ulandi (Signaling + MQTT)';
    statusEl.classList.add('status-connected');
  });

  socket.on('offer', handleOffer);
  socket.on('answer', handleAnswer);
  socket.on('ice-candidate', handleIceCandidate);
}

// 2. WebRTC
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

// 3. MQTT
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

// WebRTC handlerlar (oldingi kod bilan bir xil)
async function handleOffer(offer) { /* ... */ }
async function handleAnswer(answer) { /* ... */ }
function handleIceCandidate(candidate) { /* ... */ }

// Joystick va drag funksiyalari (oldingi versiyadan qoldiring)
function initJoysticks() { /* ... */ }
function initDragControl() { /* ... */ }

// Boshlash
window.onload = () => {
  connectSignaling();
  startWebRTC();
  connectMQTT();
  initJoysticks();
  initDragControl();
};