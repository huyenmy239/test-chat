// // frontend/script.js
// let ws = null;
// let username = '';
// let localStream = null;
// let screenStream = null;
// let peers = {}; // { targetUser: RTCPeerConnection }

// // === KẾT NỐI WEBSOCKET ===
// function joinRoom() {
//     username = document.getElementById('username').value.trim();
//     if (!username) return alert('Vui lòng nhập tên!');

//     document.getElementById('login-container').style.display = 'none';
//     document.getElementById('room-container').style.display = 'block';

//     ws = new WebSocket('ws://10.10.10.164:8000/ws/chat/');

//     ws.onopen = () => {
//         send({ type: 'join', username });
//         startLocalVideo();
//     };

//     ws.onmessage = async (e) => {
//         const data = JSON.parse(e.data);

//         if (data.type === 'joined') {
//             addSystemMessage(`${data.username} đã vào phòng`);
//             if (data.username !== username) {
//                 createPeerConnection(data.username); // CẢ HAI ĐỀU TẠO PEER
//             }

//         } else if (data.type === 'left') {
//             addSystemMessage(`${data.username} đã rời phòng`);
//             removePeer(data.username);

//         } else if (data.type === 'message') {
//             addChatMessage(`${data.username}: ${data.message}`);

//         } else if (data.type === 'webrtc') {
//             await handleSignaling(data);
//         }
//     };

//     ws.onclose = () => console.log('WebSocket closed');
// }

// // === BẮT ĐẦU VIDEO LOCAL ===
// async function startLocalVideo() {
//     try {
//         localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         updateControls();
//         // Không thêm video local ở đây → ontrack sẽ tự thêm khi peer kết nối
//     } catch (err) {
//         console.error('Lỗi truy cập camera/mic:', err);
//         alert('Không thể truy cập camera hoặc micro');
//     }
// }

// // === TẠO PEER CONNECTION (chỉ 1 người tạo offer) ===
// function createPeerConnection(targetUser) {
//     if (peers[targetUser]) return;

//     const pc = new RTCPeerConnection({
//         iceServers: [
//             { urls: 'stun:stun.l.google.com:19302' },
//             { urls: 'stun:stun1.l.google.com:19302' }
//         ]
//     });

//     peers[targetUser] = pc;

//     // Gửi local stream
//     if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
//     if (screenStream) screenStream.getTracks().forEach(t => pc.addTrack(t, screenStream));

//     // Nhận stream từ người khác
//     pc.ontrack = (e) => {
//         const stream = e.streams[0];
//         const isScreen = stream.getTracks().some(t => t.label.includes('screen'));
//         const label = isScreen ? `${targetUser} (màn hình)` : targetUser;
//         addVideoElement(label, stream);
//     };

//     pc.onicecandidate = (e) => {
//         if (e.candidate) {
//             send({
//                 type: 'ice-candidate',
//                 data: e.candidate,
//                 target: targetUser
//             });
//         }
//     };

//     // QUY TẮC: Người có username NHỎ HƠN (theo bảng chữ cái) tạo offer
//     if (username < targetUser) {
//         pc.createOffer()
//             .then(offer => pc.setLocalDescription(offer))
//             .then(() => {
//                 send({
//                     type: 'offer',
//                     data: pc.localDescription,
//                     target: targetUser
//                 });
//             })
//             .catch(err => console.error('Lỗi tạo offer:', err));
//     }
// }

// // === XỬ LÝ TÍN HIỆU WEBRTC ===
// async function handleSignaling(data) {
//     const { signal_type, from_user, data: signalData } = data;
//     let pc = peers[from_user];

//     // Nếu chưa có peer → tạo (người nhận offer)
//     if (!pc) {
//         createPeerConnection(from_user);
//         pc = peers[from_user];
//     }

//     try {
//         if (signal_type === 'offer') {
//             await pc.setRemoteDescription(signalData);
//             const answer = await pc.createAnswer();
//             await pc.setLocalDescription(answer);
//             send({
//                 type: 'answer',
//                 data: pc.localDescription,
//                 target: from_user
//             });

//         } else if (signal_type === 'answer') {
//             await pc.setRemoteDescription(signalData);

//         } else if (signal_type === 'ice-candidate') {
//             if (signalData) await pc.addIceCandidate(signalData);
//         }
//     } catch (err) {
//         console.error('Lỗi xử lý signaling:', err);
//     }
// }

// // === THÊM VIDEO ELEMENT ===
// function addVideoElement(label, stream) {
//     let container = document.getElementById(`video-${label}`);
//     if (!container) {
//         container = document.createElement('div');
//         container.id = `video-${label}`;
//         container.className = 'video-container';
//         videoGrid.appendChild(container);

//         const video = document.createElement('video');
//         video.autoplay = true;
//         video.playsInline = true;
//         video.muted = label === username || label === `${username} (màn hình)`; // Tự mute
//         container.appendChild(video);

//         const labelEl = document.createElement('div');
//         labelEl.className = 'video-label';
//         labelEl.textContent = label === username ? 'Bạn' : label;
//         container.appendChild(labelEl);
//     }

//     const video = container.querySelector('video');
//     if (video.srcObject !== stream) {
//         video.srcObject = stream;
//     }
// }

// // === XÓA PEER KHI RỜI PHÒNG ===
// function removePeer(user) {
//     const labels = [user, `${user} (màn hình)`];
//     labels.forEach(label => {
//         const container = document.getElementById(`video-${label}`);
//         if (container) container.remove();
//     });

//     if (peers[user]) {
//         peers[user].close();
//         delete peers[user];
//     }
// }

// // === NÚT ĐIỀU KHIỂN ===
// function toggleMic() {
//     if (!localStream) return;
//     const enabled = localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
//     document.getElementById('mic-btn').textContent = enabled ? 'Mic On' : 'Mic Off';
//     document.getElementById('mic-btn').style.background = enabled ? '#28a745' : '#dc3545';
// }

// function toggleCam() {
//     if (!localStream) return;
//     const enabled = localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
//     document.getElementById('cam-btn').textContent = enabled ? 'Cam On' : 'Cam Off';
//     document.getElementById('cam-btn').style.background = enabled ? '#ffc107' : '#6c757d';
// }

// async function toggleScreen() {
//     if (screenStream) {
//         // Dừng chia sẻ
//         screenStream.getTracks().forEach(t => t.stop());
//         screenStream = null;
//         document.getElementById('screen-btn').textContent = 'Share Screen';
//         removePeer(username + ' (màn hình)');

//         // Xóa track khỏi tất cả peer
//         Object.values(peers).forEach(pc => {
//             pc.getSenders().forEach(sender => {
//                 if (sender.track?.kind === 'video' && sender.track.label.includes('screen')) {
//                     pc.removeTrack(sender);
//                 }
//             });
//         });
//         return;
//     }

//     try {
//         screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//         addVideoElement(username + ' (màn hình)', screenStream);
//         document.getElementById('screen-btn').textContent = 'Stop Share';

//         // Gửi màn hình đến tất cả peer
//         Object.values(peers).forEach(pc => {
//             const sender = pc.addTrack(screenStream.getVideoTracks()[0], screenStream);
//         });

//         screenStream.getTracks()[0].onended = () => toggleScreen();
//     } catch (err) {
//         console.log('Chia sẻ màn hình bị hủy');
//     }
// }

// function updateControls() {
//     const micOn = localStream?.getAudioTracks()[0]?.enabled ?? false;
//     const camOn = localStream?.getVideoTracks()[0]?.enabled ?? false;
//     document.getElementById('mic-btn').textContent = micOn ? 'Mic On' : 'Mic Off';
//     document.getElementById('cam-btn').textContent = camOn ? 'Cam On' : 'Cam Off';
// }

// // === CHAT ===
// function sendMessage() {
//     const input = document.getElementById('message');
//     const msg = input.value.trim();
//     if (!msg || !ws) return;
//     send({ type: 'message', message: msg });
//     input.value = '';
// }

// function addChatMessage(text) {
//     const div = document.createElement('div');
//     div.className = 'message';
//     div.textContent = text;
//     chatBox.appendChild(div);
//     chatBox.scrollTop = chatBox.scrollHeight;
// }

// function addSystemMessage(text) {
//     const div = document.createElement('div');
//     div.className = 'system';
//     div.textContent = text;
//     chatBox.appendChild(div);
//     chatBox.scrollTop = chatBox.scrollHeight;
// }

// // === GỬI DỮ LIỆU QUA WEBSOCKET ===
// function send(data) {
//     if (ws && ws.readyState === WebSocket.OPEN) {
//         ws.send(JSON.stringify(data));
//     }
// }

// // === THOÁT PHÒNG ===
// function leaveRoom() {
//     send({ type: 'leave' });
//     ws?.close();
//     location.reload();
// }

// // === ENTER ĐỂ GỬI TIN NHẮN ===
// document.getElementById('message')?.addEventListener('keypress', e => {
//     if (e.key === 'Enter') sendMessage();
// });

// // === ĐÓNG TAB → GỬI RỜI PHÒNG ===
// window.addEventListener('beforeunload', () => {
//     send({ type: 'leave' });
// });

// window.addEventListener('DOMContentlLoaded', () => {
//     videoGrid = document.getElementById('video-grid');
//     chatBox = document.getElementById('chat-box');
// });

// test
// let ws = null;
// let username = '';
// let localStream = null;
// let peers = {};
// let videoGrid = document.getElementById('video-grid');
// let chatBox = document.getElementById('chat-box');

// // === JOIN ROOM ===
// function joinRoom() {
//   username = document.getElementById('username').value.trim();
//   if (!username) return alert('Vui lòng nhập tên!');

//   document.getElementById('login-container').style.display = 'none';
//   document.getElementById('room-container').style.display = 'block';

//   startLocalVideo().then(() => {
//     connectWS();
//   });
// }

// // === CONNECT WEBSOCKET ===
// function connectWS() {
//   ws = new WebSocket('ws://10.10.10.164:8000/ws/chat/');

//   ws.onopen = () => {
//     send({ type: 'join', username });
//   };

//   ws.onmessage = async (e) => {
//     const data = JSON.parse(e.data);

//     if (data.type === 'user_list') {
//       data.users.forEach(u => createPeerConnection(u, true));

//     } else if (data.type === 'joined') {
//       createPeerConnection(data.username, false);

//     } else if (data.type === 'webrtc_signal') {
//       await handleSignaling(data);

//     } else if (data.type === 'message') {
//       addChatMessage(`${data.username}: ${data.message}`);

//     } else if (data.type === 'left') {
//       removePeer(data.username);
//     }
//   };

//   ws.onclose = () => console.log("WS closed");
// }

// // === START CAMERA ===
// async function startLocalVideo() {
//   try {
//     localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     addVideo(username, localStream);
//   } catch (e) {
//     console.error("Camera error:", e);
//   }
// }

// // === CREATE PEER ===
// function createPeerConnection(targetUser, isInitiator) {
//   if (peers[targetUser]) return;

//   const pc = new RTCPeerConnection({
//     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
//   });

//   peers[targetUser] = pc;

//   if (localStream) {
//     localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
//   }

//   pc.ontrack = (e) => addVideo(targetUser, e.streams[0]);

//   pc.onicecandidate = (e) => {
//     if (e.candidate)
//       send({ type: 'ice-candidate', target: targetUser, data: e.candidate });
//   };

//   if (isInitiator) {
//     pc.createOffer()
//       .then(offer => pc.setLocalDescription(offer))
//       .then(() => send({
//         type: 'offer',
//         target: targetUser,
//         data: pc.localDescription
//       }));
//   }
// }

// // === HANDLE SIGNALS ===
// async function handleSignaling(data) {
//   const { signal_type, from_user, data: s } = data;
//   let pc = peers[from_user];

//   if (!pc) {
//     createPeerConnection(from_user, false);
//     pc = peers[from_user];
//   }

//   if (signal_type === 'offer') {
//     await pc.setRemoteDescription(s);
//     const ans = await pc.createAnswer();
//     await pc.setLocalDescription(ans);
//     send({ type: 'answer', target: from_user, data: pc.localDescription });

//   } else if (signal_type === 'answer') {
//     await pc.setRemoteDescription(s);

//   } else if (signal_type === 'ice-candidate') {
//     if (s) await pc.addIceCandidate(s);
//   }
// }

// // === ADD VIDEO ===
// function addVideo(label, stream) {
//   let el = document.getElementById('video-' + label);

//   if (!el) {
//     el = document.createElement('div');
//     el.id = 'video-' + label;
//     el.className = 'video-container';

//     const video = document.createElement('video');
//     video.autoplay = true;
//     video.playsInline = true;
//     video.muted = label === username;

//     el.appendChild(video);

//     const span = document.createElement('div');
//     span.className = 'video-label';
//     span.textContent = label === username ? 'Bạn' : label;
//     el.appendChild(span);

//     videoGrid.appendChild(el);
//   }

//   const videoEl = el.querySelector('video');
//   if (videoEl.srcObject !== stream) videoEl.srcObject = stream;
// }

// // === REMOVE PEER ===
// function removePeer(user) {
//   const el = document.getElementById('video-' + user);
//   if (el) el.remove();

//   if (peers[user]) {
//     peers[user].close();
//     delete peers[user];
//   }
// }

// // === SEND WS MESSAGE ===
// function send(data) {
//   if (ws && ws.readyState === WebSocket.OPEN)
//     ws.send(JSON.stringify(data));
// }

// // === CHAT ===
// function sendMessage() {
//   const msg = document.getElementById('message').value.trim();
//   if (!msg) return;
//   send({ type: 'message', message: msg });
//   document.getElementById('message').value = '';
// }

// function addChatMessage(msg) {
//   const item = document.createElement('div');
//   item.textContent = msg;
//   chatBox.appendChild(item);
//   chatBox.scrollTop = chatBox.scrollHeight;
// }

// // === LEAVE ROOM ===
// function leaveRoom() {
//   send({ type: 'leave' });
//   ws.close();
//   location.reload();
// }

// final

let ws = null;
let username = '';
let localStream = null;
let screenStream = null;
let usingScreen = false;

let peers = {};
let videoGrid = document.getElementById('video-grid');
let chatBox = document.getElementById('chat-box');

// === JOIN ROOM ===
function joinRoom() {
  username = document.getElementById('username').value.trim();
  if (!username) return alert('Vui lòng nhập tên!');

  document.getElementById('login-container').style.display = 'none';
  document.getElementById('room-container').style.display = 'block';

  startLocalVideo().then(() => connectWS());
}

// === CONNECT WEBSOCKET ===
function connectWS() {
  ws = new WebSocket('ws://10.10.10.164:8000/ws/chat/');

  ws.onopen = () => send({ type: 'join', username });

  ws.onmessage = async (e) => {
    const data = JSON.parse(e.data);

    if (data.type === 'user_list') {
      data.users.forEach(u => createPeerConnection(u, true));

    } else if (data.type === 'joined') {
      createPeerConnection(data.username, false);

    } else if (data.type === 'webrtc_signal') {
      await handleSignaling(data);

    } else if (data.type === 'message') {
      addChatMessage(`${data.username}: ${data.message}`);

    } else if (data.type === 'left') {
      removePeer(data.username);
    }
  };

  ws.onclose = () => console.log("WS closed");
}

// === START CAMERA ===
async function startLocalVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    addVideo(username, localStream);
  } catch (e) {
    console.error("Camera error:", e);
  }
}

// === CREATE PEER ===
function createPeerConnection(targetUser, isInitiator) {
  if (peers[targetUser]) return;

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peers[targetUser] = pc;

  // Add tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.ontrack = (e) => addVideo(targetUser, e.streams[0]);

  pc.onicecandidate = (e) => {
    if (e.candidate)
      send({ type: 'ice-candidate', target: targetUser, data: e.candidate });
  };

  // Create offer
  if (isInitiator) {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() =>
        send({
          type: 'offer',
          target: targetUser,
          data: pc.localDescription
        })
      );
  }
}

// === HANDLE WEBRTC SIGNALING ===
async function handleSignaling(data) {
  const { signal_type, from_user, data: s } = data;
  let pc = peers[from_user];

  if (!pc) {
    createPeerConnection(from_user, false);
    pc = peers[from_user];
  }

  if (signal_type === 'offer') {
    await pc.setRemoteDescription(s);
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    send({ type: 'answer', target: from_user, data: pc.localDescription });

  } else if (signal_type === 'answer') {
    await pc.setRemoteDescription(s);

  } else if (signal_type === 'ice-candidate') {
    if (s) await pc.addIceCandidate(s);
  }
}

// === ADD VIDEO TO UI ===
function addVideo(label, stream) {
  let el = document.getElementById('video-' + label);

  if (!el) {
    el = document.createElement('div');
    el.id = 'video-' + label;
    el.className = 'video-container';

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = label === username;

    el.appendChild(video);

    const span = document.createElement('div');
    span.className = 'video-label';
    span.textContent = label === username ? 'Bạn' : label;
    el.appendChild(span);

    videoGrid.appendChild(el);
  }

  const videoEl = el.querySelector('video');
  if (videoEl.srcObject !== stream) videoEl.srcObject = stream;
}

// === REMOVE PEER ===
function removePeer(user) {
  const el = document.getElementById('video-' + user);
  if (el) el.remove();

  if (peers[user]) {
    peers[user].close();
    delete peers[user];
  }
}

// === SEND WS MESSAGE ===
function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(data));
}

// === CHAT ===
function sendMessage() {
  const msg = document.getElementById('message').value.trim();
  if (!msg) return;
  send({ type: 'message', message: msg });
  document.getElementById('message').value = '';
}

function addChatMessage(msg) {
  const item = document.createElement('div');
  item.textContent = msg;
  chatBox.appendChild(item);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// === LEAVE ROOM ===
function leaveRoom() {
  send({ type: 'leave' });
  ws.close();
  location.reload();
}

//
// ===========================================================
//                  🔥 BỔ SUNG TÍNH NĂNG MỚI 🔥
// ===========================================================
//

// === TOGGLE MIC ===
function toggleMic() {
  const track = localStream.getAudioTracks()[0];
  track.enabled = !track.enabled;

  document.getElementById('mic-btn').innerText =
    track.enabled ? "Mic On" : "Mic Off";
}

// === TOGGLE CAMERA ===
function toggleCam() {
  const track = localStream.getVideoTracks()[0];
  track.enabled = !track.enabled;

  document.getElementById('cam-btn').innerText =
    track.enabled ? "Cam On" : "Cam Off";
}

// === SHARE SCREEN ===
async function toggleScreen() {
  if (!usingScreen) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

      const screenTrack = screenStream.getVideoTracks()[0];

      // Thay thế track video cho tất cả peer
      for (let user in peers) {
        const sender = peers[user]
          .getSenders()
          .find(s => s.track.kind === 'video');
        sender.replaceTrack(screenTrack);
      }

      addVideo(username, screenStream);

      screenTrack.onended = stopScreen;

      usingScreen = true;
      document.getElementById('screen-btn').innerText = "Stop Share";

    } catch (err) {
      console.error("Screen share error:", err);
    }

  } else {
    stopScreen();
  }
}

// === STOP SCREEN SHARE ===
function stopScreen() {
  if (!usingScreen) return;

  const camTrack = localStream.getVideoTracks()[0];

  // Thay lại camera cho mọi peer
  for (let user in peers) {
    const sender = peers[user]
      .getSenders()
      .find(s => s.track.kind === 'video');
    sender.replaceTrack(camTrack);
  }

  addVideo(username, localStream);

  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
  }

  usingScreen = false;
  document.getElementById('screen-btn').innerText = "Share Screen";
}
