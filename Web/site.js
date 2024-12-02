// A collection to store candidates until its time to call 'addIceCandidate'
const candidates = [];
const serverUrl = "ws://localhost:5201/ws";
const signalingSocket = new WebSocket(serverUrl);

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startButton = document.getElementById("startButton");

let localStream;
let peerConnection;

signalingSocket.onopen = () => console.log("Connected to signaling server");
// Handle web socket events
signalingSocket.onmessage = async (message) => {
  const data = JSON.parse(message.data);
  if (data.type === "connection") {
    handleOnConnected(data);
  } else if (data.type === "offer") {
    await handleOffer(data);
  } else if (data.type === "answer") {
    await handleAnswer(data);
  } else if (data.type === "candidate") {
    if (data.ready) {
      candidates.forEach(async (candidate) => {
        await handleCandidate(candidate.candidate);
      });
      // Clear queue
      candidates.length = 0;
    } else candidates.push(data);
  }
};

async function startCall() {
  startButton.disabled = true;

  await initializeLocalStream();

  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({
        type: "candidate",
        candidate: event.candidate,
        ready: false,
      });
    } else {
      // All candidates have been sent. Notify peers that they can call 'addIceCandidate'.
      sendMessage({
        type: "candidate",
        ready: true,
      });
    }
  };
  peerConnection.ontrack = (event) => {
    // Show the remote video stream
    remoteVideo.srcObject = event.streams[0];
  };

  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  // Create an offer to send to other pers
  const offer = await peerConnection.createOffer();

  // Set our local description
  await peerConnection.setLocalDescription(offer);

  // Send offer to connected peers
  sendMessage({ type: "offer", sdp: offer.sdp });
}

// Wire start-call click event
startButton.addEventListener("click", startCall);

async function handleOffer(offer) {
  // When we receive an offer we can start with creating a peer connection
  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendMessage({
        type: "candidate",
        candidate: event.candidate,
        ready: false,
      });
    } else {
      // All candidates have been sent. Notify peers that they can call 'addIceCandidate'.
      sendMessage({
        type: "candidate",
        ready: true,
      });
    }
  };
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Ensure our local stream is intialized before adding the tracks to the peer connection
  await initializeLocalStream();
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  // Set our remote description using the offer
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // Create our answer
  const answer = await peerConnection.createAnswer();

  // Set our local description
  await peerConnection.setLocalDescription(answer);

  // Send answer to peers
  sendMessage({ type: "answer", sdp: answer.sdp });
}

async function handleAnswer(answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
  // This should only be called once we've received all the ICE candidates
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleOnConnected(data) {
  if (data.isConnected) {
    // Only enable the "Start Call" button if someone has connected
    startButton.disabled = false;
  } else {
    startButton.disabled = true;
  }
}

function sendMessage(message) {
  signalingSocket.send(JSON.stringify(message));
}

async function initializeLocalStream() {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideo.srcObject = localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }
}
