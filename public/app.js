const configuration = {
    audio: true,
    video: {
        facingMode: "user",
        width: { min: 100, ideal: 350, max: 450 },
        height: { min: 50, ideal: 250, max: 350 }
    }
}

const iceConfigs = {
    iceServers: [{
        urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
        ],
    }, ]
}

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let firestore = null;

window.onload = () => {
    document.querySelector('#btnConnection').addEventListener('click', connectDevices);
    document.querySelector('#btnRoom').addEventListener('click', createPeerConnection);
    document.querySelector('#btnJoin').addEventListener('click', joinRoom);
}

const openMediaDevices = (configuration) => {
    return navigator.mediaDevices.getUserMedia(configuration);
}

const getDevices = async() => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('Info about Devices: ', devices);
}

const displayStream = () => {
    const localVideo = document.querySelector('#localStream');
    const remoteVideo = document.querySelector('#remoteStream');

    localVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
}

const addTracksOnPeerConnection = (stream) => {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
    });
}

const createPeerConnection = async() => {
    firestore = firebase.firestore();
    peerConnection = new RTCPeerConnection(iceConfigs); // Instancia de la interface RTCPeerConnection

    registerPeerConnectionListeners(); // Añado los listeners para los cambios de estado de la conexión y los ICE Candidate
    peerConnectionTrackListener();

    addTracksOnPeerConnection(localStream); // Añado las pistas locales a la conexión Peer

    rooms = await firestore.collection('rooms').doc();
    candidates = rooms.collection('hostCandidates');

    addCandidates(candidates);

    const offer = await peerConnection.createOffer(); // Creo una oferta para iniciar la conexión remota del WebRTC, creando el SDP pertinente.
    await peerConnection.setLocalDescription(offer); // Añado en la descripción de la conexión la oferta local.

    const roomId = await addOfferInRoom(rooms, offer);

    document.querySelector('#roomId').innerText = roomId;


    rooms.onSnapshot(async snapshot => {
        const data = snapshot.data();
        if (!peerConnection.currentRemoteDescription && data.answer) {
            const sessiondescription = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(sessiondescription);
        }
    });

    const join = rooms.collection('joinCandidates');
    remoteCandidatesListener(join);
}

const joinRoom = async() => {
    const id = prompt('Room ID');

    firestore = firebase.firestore();
    const rooms = firestore.collection('rooms').doc(id);
    const snapshot = await rooms.get();

    if (snapshot.exists) {
        peerConnection = new RTCPeerConnection(iceConfigs);

        registerPeerConnectionListeners();
        peerConnectionTrackListener();

        addTracksOnPeerConnection(localStream);

        candidates = rooms.collection('joinCandidates');
        addCandidates(candidates);

        const offer = snapshot.data().offer;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        const roomAnswer = {
            'answer': {
                type: answer.type,
                sdp: answer.sdp
            },
        };

        rooms.update(roomAnswer);

        const host = rooms.collection('hostCandidates');
        remoteCandidatesListener(host);
    }

}

const peerConnectionTrackListener = () => {
    peerConnection.addEventListener('track', event => {
        console.log('Got remote track: ', event.streams[0]);

        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    });
}

const remoteCandidatesListener = (candidates) => {
    candidates.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
}

const addCandidates = (candidates) => {
    // Este evento se lanza cuando el estado de ICE Candidate es 'gathering' y se prepara para recibir a todos los candidatos, en este caso locales.
    // Una vez a obtenido el candidato, el estado del icecandidate pasa a completo.
    peerConnection.addEventListener('icecandidate', event => {
        if (!event.candidate) {
            // Una vez ya ha recogido todos los candidatos, el método acaba.
            console.log('Got final candidate!');
            return;
        }

        candidates.add(event.candidate.toJSON());
        console.log('Got candidate: ', event.candidate);
    });
}

const addOfferInRoom = async(rooms, offer) => {
    const roomOffer = {
        'offer': {
            type: offer.type,
            sdp: offer.sdp,
        },
    };

    await rooms.set(roomOffer);
    return rooms.id;
}

const connectDevices = async() => {
    try {
        localStream = await openMediaDevices(configuration);
        remoteStream = new MediaStream();

        console.log('Got Local MediaStream:', localStream);
        console.log('Got Remote MediaStream:', remoteStream);

        displayStream();
        getDevices();
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

const registerPeerConnectionListeners = () => {
    peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
            `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
    });

    peerConnection.addEventListener('connectionstatechange', () => {
        console.log(`Connection state change: ${peerConnection.connectionState}`);
    });

    peerConnection.addEventListener('signalingstatechange', () => {
        console.log(`Signaling state change: ${peerConnection.signalingState}`);
    });

    peerConnection.addEventListener('iceconnectionstatechange ', () => {
        console.log(
            `ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
}