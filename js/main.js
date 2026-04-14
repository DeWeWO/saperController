const DOMAIN = 'saper.dewew.dev';
const MQTT_USER = 'robotuser';
const MQTT_PASS = 'RobotSaper2026!';

let mqttClient, socket, peerConnection;
const videoEl = document.getElementById('remoteVideo');
const statusEl = document.getElementById('status');
const wrapper1 = document.getElementById('joystickWrapper1');
const wrapper2 = document.getElementById('joystickWrapper2');

// Touch bilan joysticklarni ko‘rsatish/yashirish
function showJoysticks() {
  wrapper1.classList.add('active');
  wrapper2.classList.add('active');
}
function hideJoysticks() {
  wrapper1.classList.remove('active');
  wrapper2.classList.remove('active');
}

// ================== REALISTIK JOYSTICK ==================
function initJoysticks() {
  const options = { mode: 'static', position: { left: '50%', top: '50%' }, size: 130, threshold: 0.1 };

  const joy1 = nipplejs.create({ zone: document.getElementById('joystick1'), ...options, color: '#00ff88' });
  const joy2 = nipplejs.create({ zone: document.getElementById('joystick2'), ...options, color: '#0088ff' });

  function animateJoystick(joystick, data) {
    const base = joystick.el;
    if (data) {
      const force = Math.min(data.force / 2, 1);
      base.style.transform = `scale(${1 + force * 0.2})`;
      base.style.boxShadow = `0 0 35px rgba(255,255,255,${0.5 + force * 0.5})`;
    } else {
      base.style.transform = 'scale(1)';
      base.style.boxShadow = '0 0 25px rgba(0,0,0,0.7)';
    }
  }

  // Joystick 1
  joy1.on('start', () => { showJoysticks(); animateJoystick(joy1, null); });
  joy1.on('move', (evt, data) => {
    animateJoystick(joy1, data);
    if (mqttClient) {
      const x = data.force * Math.cos(data.angle.radian);
      const y = data.force * Math.sin(data.angle.radian);
      mqttClient.publish('robot/arm1', JSON.stringify({ x, y }), { qos: 0 });
    }
  });
  joy1.on('end', () => {
    animateJoystick(joy1, null);
    if (mqttClient) mqttClient.publish('robot/arm1', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
  });

  // Joystick 2
  joy2.on('start', () => { showJoysticks(); animateJoystick(joy2, null); });
  joy2.on('move', (evt, data) => {
    animateJoystick(joy2, data);
    if (mqttClient) {
      const x = data.force * Math.cos(data.angle.radian);
      const y = data.force * Math.sin(data.angle.radian);
      mqttClient.publish('robot/arm2', JSON.stringify({ x, y }), { qos: 0 });
    }
  });
  joy2.on('end', () => {
    animateJoystick(joy2, null);
    if (mqttClient) mqttClient.publish('robot/arm2', JSON.stringify({ x: 0, y: 0 }), { qos: 0 });
  });
}

// ================== KAMERA DRAG-TO-PAN ==================
function initDragControl() {
  let isDragging = false;
  let startX, startY;

  const start = (x, y) => { isDragging = true; startX = x; startY = y; };
  const move = (x, y) => {
    if (!isDragging) return;
    const deltaX = (x - startX) * 0.8;
    const deltaY = (y - startY) * 0.8;
    if (mqttClient) mqttClient.publish('robot/camera', JSON.stringify({ pan: deltaX, tilt: deltaY }), { qos: 0 });
  };

  videoEl.addEventListener('mousedown', e => start(e.clientX, e.clientY));
  videoEl.addEventListener('touchstart', e => start(e.touches[0].clientX, e.touches[0].clientY));

  document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY));

  const end = () => { isDragging = false; };
  document.addEventListener('mouseup', end);
  document.addEventListener('touchend', end);
}

// ================== BOSHLASH ==================
window.onload = () => {
  connectSignaling();
  startWebRTC();
  connectMQTT();
  initJoysticks();
  initDragControl();

  // Ekranga tegilganda joysticklarni ko‘rsatish
  document.addEventListener('touchstart', () => showJoysticks());
  document.addEventListener('touchend', () => {
    setTimeout(hideJoysticks, 1500); // 1.5 soniya keyin yashirish
  });
};