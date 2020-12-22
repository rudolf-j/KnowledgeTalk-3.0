let janusLocalStreamPeer;
let janusRemoteStreams = {};
let janusRemoteStreamPeers = {};

document.addEventListener('DOMContentLoaded', function () {

  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const loginBtn = document.getElementById('loginBtn');
  const callBtn = document.getElementById('callBtn');
  const joinBtn = document.getElementById('joinBtn');
  const exitBtn = document.getElementById('exitBtn');

  let reqNo = 1;
  let roomId;
  let localStream;
  let streamSize;
  let configuration;
  let userId;

  //로그인 버튼 클릭 이벤트
  loginBtn.addEventListener('click', function (e) {
    userId = inputId.value; //사용자 아이디

    let loginData = {
      eventOp: 'Login',
      reqNo: reqNo++,
      userId: inputId.value,
      userPw: passwordSHA256(inputPw.value),
      reqDate: nowDate(),
      deviceType: 'pc'
    };

    try {
      tLogBox('send', loginData);
      signalSocketIo.emit('knowledgetalk', loginData);  //signalling server에 로그인 사용자 객체 전달
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  //회의초대 버튼 클릭 이벤트
  callBtn.addEventListener('click', function (e) {

    let callData = {
      eventOp: 'Call',
      reqNo: reqNo++,
      userId: inputId.value,
      reqDate: nowDate(),
      reqDeviceType: 'pc',
      targetId: ['apple', 'melon', 'orange'],
    };

    try {
      tLogBox('send', callData);
      signalSocketIo.emit('knowledgetalk', callData);   //signalling server에 회의초대 객체 전달
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  //회의참여 버튼 클릭 이벤트
  joinBtn.addEventListener('click', function (e) {
    let joinData = {
      eventOp: 'Join',
      reqNo: reqNo++,
      reqDate: nowDate(),
      userId: inputId.value,
      roomId,
      status: 'accept',
      isSfu: true
    };

    try {
      tLogBox('send', joinData);
      signalSocketIo.emit('knowledgetalk', joinData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  //회의종료 버튼 클릭 이벤트
  exitBtn.addEventListener('click', function (e) {
    //로그인 버튼 제외 비활성화
    callBtn.disabled = true;
    joinBtn.disabled = true;
    exitBtn.disabled = true;

    let sendData = {
      eventOp: 'ExitRoom',
      reqNo: reqNo++,
      userId: inputId.value,
      userName: inputId.value,  //필수 아님
      reqDate: nowDate(),
      roomId: roomId
    };
    try {
      tLogBox('send', sendData);
      signalSocketIo.emit('knowledgetalk', sendData);
      dispose();
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  //SDP요청
  async function createSDPOffer(width, height, framerate, roomId) {
    let multiVideoBox = document.querySelector('#VIDEOONETOMANY');

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: width,
          height: height,
          frameRate: {
            ideal: framerate,   //최적프레임율
            max: framerate      //최대프레임율
          }
        },
        audio: true
      });

      streamSize = Object.keys(janusRemoteStreams).length;

      let videoTagClassName;

      if (streamSize > 0 && streamSize <= 3) {
        videoTagClassName = 'video-twobytwo';
      } else if (streamSize > 3 && streamSize <= 8) {
        videoTagClassName = 'video-threebythree';
      } else if (streamSize > 8) {
        videoTagClassName = 'video-fourbyfour';
      }

      let videoContainner = document.createElement('dd');
      videoContainner.classList = 'multi-video';
      let multiVideo = document.createElement('video');
      multiVideo.autoplay = true;
      multiVideo.id = 'multiVideo-local';
      multiVideo.srcObject = localStream;

      videoContainner.appendChild(multiVideo);
      multiVideoBox.classList = videoTagClassName;
      multiVideoBox.appendChild(videoContainner);

      janusLocalStreamPeer = new RTCPeerConnection(configuration); // peerconnection 생성
      localStream.getTracks().forEach(track => {
        janusLocalStreamPeer.addTrack(track, localStream);
      });

      try {
        let sdp = await janusLocalStreamPeer.createOffer();
        await janusLocalStreamPeer.setLocalDescription(sdp);
        janusLocalStreamPeer.onicegatheringstatechange = async (ev) => {
          let connection = ev.target;

          switch (connection.iceGatheringState) {
            case 'gathering':
              break;
            case 'complete':    //자기 자신에 대한 offer SDP 생성
              let sdpData = {
                eventOp: 'SDP',
                reqNo: reqNo,
                userId: inputId.value,
                reqDate: nowDate(),
                sdp,
                roomId: roomId,
                useMediaSvr: 'Y',
                usage: 'cam',
                isSfu: true
              };
              tLogBox('send', sdpData);
              signalSocketIo.emit('knowledgetalk', sdpData);
              break;
          }
        }

      } catch (error) {
        if (err instanceof SyntaxError) {
          tLogBox(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }

    } catch (err) {
      tLogBox('getUserMedia err', err);
      tLogBox('http 에서는 getUserMedia를 가지고 올 수 없습니다. https 에서 실행해주세요.');
    }
  }

  //SDP 응답
  async function createSDPAnwser(data) {

    let multiVideoBox = document.querySelector('#VIDEOONETOMANY');
    try {
      let displayId = data.displayId;

      janusRemoteStreamPeers[displayId] = new RTCPeerConnection(configuration);

      janusRemoteStreamPeers[displayId].onaddstream = function (e) {

        janusRemoteStreams[displayId] = e.stream;
        streamSize = Object.keys(janusRemoteStreams).length;
        let videoTagClassName;
        if (streamSize > 0 && streamSize <= 3) {
          videoTagClassName = 'video-twobytwo';
        } else if (streamSize > 3 && streamSize <= 8) {
          videoTagClassName = 'video-threebythree';
        } else if (streamSize > 8) {
          videoTagClassName = 'video-fourbyfour';
        }

        let videoContainner = document.createElement('dd');
        videoContainner.classList = 'multi-video';

        let multiVideo = document.createElement('video');
        multiVideo.autoplay = true;
        multiVideo.setAttribute('width', '150');
        multiVideo.setAttribute('height', '150');
        multiVideo.srcObject = janusRemoteStreams[displayId];
        multiVideo.id = 'multiVideo-' + data.displayId;

        videoContainner.appendChild(multiVideo);
        multiVideoBox.classList = videoTagClassName;
        multiVideoBox.appendChild(videoContainner);
      }

      await janusRemoteStreamPeers[displayId].setRemoteDescription(new RTCSessionDescription(data.sdp));
      let answerSdp = await janusRemoteStreamPeers[displayId].createAnswer();
      await janusRemoteStreamPeers[displayId].setLocalDescription(answerSdp);
      janusRemoteStreamPeers[displayId].onicegatheringstatechange = async (ev) => {
        let connection = ev.target;

        switch (connection.iceGatheringState) {
          case 'gathering':
            break;
          case 'complete':    //상대방 id SDP요청
            let sdpData = {
              eventOp: 'SDP',
              reqNo: reqNo++,
              userId: inputId.value,
              reqDate: nowDate(),
              sdp: connection.localDescription,
              roomId: data.roomId,
              useMediaSvr: 'Y',
              usage: 'cam', //통신화면이 통화인지 화면 공유 상태인지
              isSfu: true,
              pluginId: data.pluginId  //SFU방식에서 제공해주는 ID의 값
            };

            tLogBox('send', sdpData);
            signalSocketIo.emit('knowledgetalk', sdpData);
            break;
        }
      }

      janusRemoteStreamPeers[displayId].oniceconnectionstatechange = (e) => {
        //통화 종료에 대한 처리
        if ((janusRemoteStreamPeers[displayId] && janusRemoteStreamPeers[displayId].iceConnectionState === 'disconnected') ||
          (janusRemoteStreamPeers[displayId] && janusRemoteStreamPeers[displayId].iceConnectionState === 'failed') ||
          (janusRemoteStreamPeers[displayId] && janusRemoteStreamPeers[displayId].iceConnectionState === 'closed')) {

          janusRemoteStreamPeers[displayId].close();
          janusRemoteStreamPeers[displayId] = null;
          delete janusRemoteStreamPeers[displayId];

          let multiVideo = null;
          if (data.displayId.indexOf('screenshare-') > -1) {
            multiVideo = document.getElementById(displayId);
          } else {
            multiVideo = document.getElementById('multiVideo-' + displayId);
          }
          multiVideo ? multiVideo.srcObject = null : '';
        }
      };
    } catch (err) {
      tLogBox(err)
    }
  }

  //통화 데이터 삭제
  function dispose() {
    document.getElementById('multiVideo') ? document.getElementById('multiVideo').remove() : '';

    let multiVideo = document.getElementById('multiVideo-local');
    if (localStream && localStream.getTracks()) {
      localStream.getTracks()[0].stop();
      localStream.getTracks()[1].stop();
      localStream = null;
    }
    if (multiVideo) multiVideo.srcObject = null;

    let multiVideoBox = document.querySelector('#VIDEOONETOMANY');
    multiVideoBox.style.display = 'none';


    if (janusLocalStreamPeer) {
      janusLocalStreamPeer.close();
      janusLocalStreamPeer = null;
    }


    for (let key in janusRemoteStreams) {
      if (janusRemoteStreams[key] && janusRemoteStreams[key].getTracks()) {
        janusRemoteStreams[key].getTracks()[0].stop();
        janusRemoteStreams[key].getTracks()[1].stop();
        janusRemoteStreams[key] = null;
        delete janusRemoteStreams[key];
      }
    }

    tLogBox('janusRemoteStreamPeers : ', janusRemoteStreamPeers)
    for (let key in janusRemoteStreamPeers) {
      janusRemoteStreamPeers[key].close();
      janusRemoteStreamPeers[key] = null;
      tLogBox('deleted janusRemoteStreamPeers. ', key)
      delete janusRemoteStreamPeers[key];
    }
  }

  //메세지 기록을 위한 signalling server와의 통신 및 콜백
  signalSocketIo.on('knowledgetalk', function (data) {
    tLogBox('receive', data);

    if (!data.eventOp && !data.signalOp) {
      tLogBox('error', 'eventOp undefined');
    }

    switch (data.eventOp || data.signalOp) {
      case 'Login':
        if (data.code === '200') {
          if (data.userName == 't') {
            callBtn.disabled = false;
          }
          loginBtn.disabled = true;
          tTextbox('로그인 되었습니다.');
        } else if (data.code === '111') {
          tTextbox('이미 로그인 중입니다.')
        } else if (data.code !== '200') {
          tTextbox('아이디 비번을 확인해 주세요')
        }
        break;

      case 'Invite':
        tTextbox('회의 초대 요청이 들어왔습니다.')
        roomId = data.roomId;
        loginBtn.disabled = true;
        callBtn.disabled = true;
        joinBtn.disabled = false;
        break;

      case 'Call':
        if (data.eventOp === 'Call' && data.code === '200') {
          roomId = data.roomId;
          exitBtn.disabled = false;
          loginBtn.disabled = true;
          tTextbox('회의 초대 요청 중입니다.');
          if (data.status === 'accept') {
            if (data.isSfu === true) {
              createSDPOffer(data.videoWidth / 2, data.videoHeight / 2, data.videoFramerate, roomId);
            }
          }
        }
        if (data.eventOp === 'Call' && data.code !== '200') {
          tTextbox('상대방이 로그인 되어 있지 않습니다.');

          roomId = data.roomId;
          let sendData = {
            eventOp: 'ExitRoom',
            reqNo: reqNo++,
            userId: inputId.value,
            userName: inputId.value,
            reqDate: nowDate(),
            roomId: roomId
          };
          try {
            tLogBox('send', sendData);
            signalSocketIo.emit('knowledgetalk', sendData);
            dispose();
          } catch (err) {
            if (err instanceof SyntaxError) {
              alert(' there was a syntaxError it and try again : ' + err.message);
            } else {
              throw err;
            }
          }
        }
        break;

      case 'Join':
        joinBtn.disabled = true;
        roomId = data.roomId;
        exitBtn.disabled = false;

        tTextbox('회의에 참여 하였습니다.');

        if (data.code !== '200') {
          tLogBox('join err : ', data);
        } else {
          if (data.useMediaSvr === 'Y') {
            createSDPOffer(data.videoWidth, data.videoHeight, data.videoFramerate, roomId);
          }
        }
        break;

      case 'SDP':
        if (data.eventOp === 'SDP' && data.code === '200') {
          callBtn.disabled = true;
        }
        if (data.sdp && data.sdp.type === 'offer' && data.usage === 'cam') {
          createSDPAnwser(data);
        } else if (data.sdp && data.sdp.type === 'answer' && data.usage === 'cam') {
          janusLocalStreamPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
        break;

      case 'Presence':
        if (data.action === 'end' || (data.signalOp === 'Presence' && data.action === 'end')) {
          tTextbox('회의가 종료 되었습니다.')
          exitBtn.disabled = true;
          joinBtn.disabled = true;
          dispose();
          location.reload();
        }
        if (data.action === 'join') {
          tTextbox('회의가 시작 되었습니다.')
        }
        break;

      case 'ExitRoom':
        if (data.code === '200') {
          tTextbox('회의를 종료 하셨습니다.')
          dispose();
        }
        break;
    }

  });
});