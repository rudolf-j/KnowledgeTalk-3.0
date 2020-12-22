document.addEventListener('DOMContentLoaded', function () {
  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const loginBtn = document.getElementById('loginBtn');
  const joinBtn = document.getElementById('joinBtn');
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const whiteboard = document.getElementById('whiteboard');

  let reqNo = 1;
  let localStream;
  let remoteStream;
  let peerCon;
  let penColor;
  let configuration = [];
  let isDrawing = false;
  let context = whiteboard.getContext('2d');

  loginBtn.addEventListener('click', function (e) {
    let loginData = {
      eventOp: 'Login',
      reqNo: reqNumber(),
      userId: inputId.value,
      userPw: passwordSHA256(inputPw.value),
      reqDate: getDate(),
      deviceType: 'pc'
    };

    try {
      tLogBox('send', loginData);
      signalSocketIo.emit('knowledgetalk', loginData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  joinBtn.addEventListener('click', function (e) {
    let joinData = {
      eventOp: 'Join',
      reqNo: reqNumber(),
      reqDate: getDate(),
      userId: inputId.value,
      roomId,
      status: 'accept'
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

  function onIceCandidateHandler(e) {
    if (!e.candidate) return;

    let iceData = {
      eventOp: 'Candidate',
      candidate: e.candidate,
      useMediaSvr: 'N',
      usage: 'cam',
      userId: inputId.value,
      roomId,
      reqNo: reqNumber(),
      reqDate: getDate()
    };

    try {
      tLogBox('send', iceData);
      signalSocketIo.emit('knowledgetalk', iceData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  }

  function onAddStreamHandler(e) {
    remoteVideo.srcObject = e.streams[0];
  }

  function setPen(color, width) {
    context.globalCompositeOperation = 'source-over';
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = width || '5';
  }

  signalSocketIo.on('knowledgetalk', function (data) {
    tLogBox('receive', data);

    if (!data.eventOp && !data.signalOp) {
      tLogBox('error', 'eventOp undefined');
    }

    //로그인 응답
    if (data.eventOp === 'Login') {
      if (data.code !== '200') {
        tTextbox('아이디 또는 비밀번호를 확인하세요.');
        return;
      }
      loginBtn.disabled = true;
      tTextbox('로그인 되었습니다.');
    }
    //Invite Event 응답
    else if (data.eventOp === 'Invite') {
      tTextbox(`${data.userId} 에게 전화가 왔습니다.`)
      roomId = data.roomId;
      joinBtn.disabled = false;

      configuration.push({
        urls: data.serverInfo['_j'].turn_url,
        credential: data.serverInfo['_j'].turn_credential,
        username: data.serverInfo['_j'].turn_username
      });
    }
    //전화 받기 응답
    else if (data.eventOp === 'Join') {
      joinBtn.disabled = true;

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true
        })
        .then(stream => {
          localStream = stream;
          localVideo.srcObject = localStream;

          roomId = data.roomId;
          peerCon = new RTCPeerConnection(configuration);
          peerCon.onicecandidate = onIceCandidateHandler;

          peerCon.ontrack = onAddStreamHandler;
          localStream.getTracks().forEach(function (track) {
            peerCon.addTrack(track, localStream);
          });


          peerCon.createOffer().then(sdp => {
            peerCon.setLocalDescription(new RTCSessionDescription(sdp));

            let sdpData = {
              eventOp: 'SDP',
              sdp,
              useMediaSvr: 'N',
              usage: 'cam',
              userId: inputId.value,
              roomId,
              reqNo: reqNo++,
              reqDate: nowDate()
            };

            try {
              tLogBox('send', sdpData);
              signalSocketIo.emit('knowledgetalk', sdpData);
            } catch (err) {
              if (err instanceof SyntaxError) {
                alert(
                  ' there was a syntaxError it and try again : ' + err.message
                );
              } else {
                throw err;
              }
            }
          })
        }).catch(err => {
          let refreshCheck = confirm('카메라 / 마이크 권한을 재설정 하세요.');
          if (refreshCheck) {
            window.location.reload()
          }
        })
    }
    //SDP 응답
    else if (data.eventOp === 'SDP' && data.sdp && data.sdp.type === 'answer') {
      peerCon.setRemoteDescription(data.sdp);
    }
    //Candidate 응답
    else if (data.eventOp === 'Candidate') {
      if (data.candidate) peerCon.addIceCandidate(new RTCIceCandidate(data.candidate));

      let iceData = {
        eventOp: 'Candidate',
        roomId: data.roomId,
        reqNo: data.reqNo,
        resDate: nowDate(),
        code: '200'
      };

      try {
        tTextbox('전화 연결이 되었습니다.');
        tLogBox('send(icedata)', iceData);
        signalSocketIo.emit('knowledgetalk', iceData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    }
    //Presence 응답
    else if (data.signalOp == 'Presence' && data.action == 'end') {
      if (localStream && peerCon) {
        localStream.getTracks()[0].stop();
        localStream.getTracks()[1].stop();
        localStream = null;

        peerCon.close();
        peerCon = null;
      }

      localVideo.srcObject = null;
      remoteVideo.srcObject = null;

      joinBtn.disabled = true;

      tTextbox('통화가 종료되었습니다.')
    }
    //화이트보드 종료
    else if (data.eventOp === 'WhiteBoardEndSvr') {
      context.clearRect(0, 0, whiteboard.width, whiteboard.height);
      whiteboard.style.display = 'none';
    }
    //화이트 보드 시작
    else if (data.signalOp === 'Draw') {
      tTextbox('상대방이 화이트 보드 활성화 하였습니다.')
      setPen(penColor);

      let canvasX;
      let canvasY;

      if (data.status === 'start') {
        tTextbox('상대방이 화이트 보드를 시작 하였습니다.');
        whiteboard.style.display = 'inline-block';

        isDrawing = true;

        canvasX = data.axisX * (whiteboard.width / data.boardWidth);
        canvasY = data.axisY * (whiteboard.height / data.boardHeight);

        context.beginPath();
        context.moveTo(canvasX, canvasY);
      }
      else if (data.status === 'move') {
        if (isDrawing === false) return;

        canvasX = data.axisX * (whiteboard.width / data.boardWidth);
        canvasY = data.axisY * (whiteboard.height / data.boardHeight);

        context.lineTo(canvasX, canvasY);
        context.stroke();
      }
      else if (data.status === 'end') {
        whiteboard.style.display = 'inline-block';
        isDrawing = false;
        context.closePath();
      }
    }
    //화이트 보드 지우기
    else if (data.signalOp === 'Reset') {
      tTextbox('화이트 보드 내용을 지웠습니다.')
      context.clearRect(0, 0, whiteboard.width, whiteboard.height);
    }
    //색 변환
    else if (data.signalOp === 'Color') {
      penColor = data.color
    }

  })

})