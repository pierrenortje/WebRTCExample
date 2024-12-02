let serverUrl = "ws://localhost:5201/ws";

const candidates = [];
const signalingSocket = new WebSocket(serverUrl);
let localStream;
let peerConnection;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startButton = document.getElementById("startButton");

signalingSocket.onopen = () => console.log("Connected to signaling server");
signalingSocket.onmessage = async (message) => {
  const data = JSON.parse(message.data);
  if (data.type === "offer") {
    await handleOffer(data);
  } else if (data.type === "answer") {
    await handleAnswer(data);
  } else if (data.type === "candidate") {
    //await handleCandidate(data);
    candidates.push(data);
  }
};

async function startCall() {
  await initializeLocalStream();

  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Sending candidate for initiator");

      sendMessage({
        type: "candidate",
        candidate: event.candidate,
      });
    }
  };
  peerConnection.ontrack = (event) => {
    console.log("Setting remove video in start call");
    remoteVideo.srcObject = event.streams[0];
  };

  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  console.log("Creating offer");

  const offer = await peerConnection.createOffer();

  console.log("Offer created");

  console.log("Setting local description");

  await peerConnection.setLocalDescription(offer);

  console.log("Local description set");

  console.log("Sending offer");

  sendMessage({ type: "offer", sdp: offer.sdp });
}

async function handleOffer(offer) {
  console.log("Offer received");

  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Sending candidate for offer");

      sendMessage({
        type: "candidate",
        candidate: event.candidate,
      });
    }
  };
  peerConnection.ontrack = (event) => {
    console.log("Setting remove video in offer received");
    remoteVideo.srcObject = event.streams[0];
  };

  console.log("Setting remote description");

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  console.log("Remote description set");

  if (!localStream) await initializeLocalStream();

  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));

  console.log("Creating answer");

  const answer = await peerConnection.createAnswer();

  console.log("Answer created");

  console.log("Setting local description");

  await peerConnection.setLocalDescription(answer);

  console.log("Local description set");

  console.log("Sending answer");

  sendMessage({ type: "answer", sdp: answer.sdp });
}

async function handleAnswer(answer) {
  console.log("Setting remote description.");

  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

  console.log("Remote description set.");

  if (candidates.length > 0) {
    candidates.forEach((candidate) => {
      handleCandidate(candidate);
    });

    candidates.length = 0;
  }
}

async function handleCandidate(candidate) {
  console.log("Adding Ice Candidate");

  await peerConnection.addIceCandidate(
    new RTCIceCandidate(candidate),
    function (e) {
      console.log("success");
      console.log(e);
    },
    function (e) {
      console.log("fail");
      console.log(e);
    }
  );
}

function sendMessage(message) {
  signalingSocket.send(JSON.stringify(message));
}

startButton.addEventListener("click", startCall);

async function initializeLocalStream() {
  if (!localStream) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      localVideo.srcObject = localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }
}
