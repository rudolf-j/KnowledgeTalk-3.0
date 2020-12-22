document.addEventListener('DOMContentLoaded', function () {
  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const inputTarget = document.getElementById('inputTarget');
  const loginBtn = document.getElementById('loginBtn');
  const callBtn = document.getElementById('callBtn');
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');

  const whiteboardBtn = document.getElementById('whiteboardBtn');
  const whiteboardClearBtn = document.getElementById('whiteboardClearBtn');
  const whiteboard = document.getElementById('whiteboard');

  let localStream;
  let peerCon;
  let configuration = [];

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
        alert('there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  });

  callBtn.addEventListener('click', function (e) {

    let callData = {
      eventOp: 'Call',
      reqNo: reqNumber(),
      reqDate: getDate(),
      userId: inputId.value,
      targetId: [inputTarget.value],
      reqDeviceType: 'pc'
    };

    try {
      tLogBox('send', callData);
      signalSocketIo.emit('knowledgetalk', callData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }

  });

  function onIceCandidateHandler(e) {
    if (!e.candidate) return;

    let iceData = {
      eventOp: 'Candidate',
      reqNo: reqNo++,
      userId: inputId.value,
      reqDate: nowDate(),
      candidate: e.candidate,
      roomId,
      usage: 'cam',
      useMediaSvr: 'N'
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
      callBtn.disabled = false;
      tTextbox('로그인 되었습니다');
    }
    //전화걸기 응답
    else if (data.eventOp === 'Call') {
      if (data.code !== '200') {
        tTextbox(`상대방(${inputTarget.value})이 로그인 되어 있지 않습니다! 새로고침 후 다시 로그인 하시기 바랍니다.`);
        callBtn.disabled = true
        return;
      }

      tTextbox(`상대방(${inputTarget.value})에게 전화를 거는 중 입니다.`)

      //turn 서버 정보 저장
      configuration.push({
        urls: data.serverInfo['_j'].turn_url,
        credential: data.serverInfo['_j'].turn_credential,
        username: data.serverInfo['_j'].turn_username
      });

      callBtn.disabled = true;

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true
        })
        .then(stream => {
          localStream = stream;
          localVideo.srcObject = stream;
        }).catch(err => {
          alert('카메라 또 마이크를 활성화 해주시기 바랍니다.')
        })
    }
    //SDP 응답
    else if (data.eventOp == 'SDP') {
      if (data.sdp && data.sdp.type === 'offer') {

        roomId = data.roomId;
        peerCon = new RTCPeerConnection(configuration);

        peerCon.onicecandidate = onIceCandidateHandler;
        peerCon.ontrack = onAddStreamHandler;
        peerCon.onconnectionstatechange = e => {
          tTextbox('전화가 연결 되었습니다.');
          whiteboardBtn.disabled = false;
        }

        localStream.getTracks().forEach(function (track) {
          peerCon.addTrack(track, localStream);
        });

        peerCon.setRemoteDescription(new RTCSessionDescription(data.sdp));
        peerCon.createAnswer().then(sdp => {
          peerCon.setLocalDescription(new RTCSessionDescription(sdp));

          let ansData = {
            eventOp: 'SDP',
            reqNo: reqNo++,
            userId: inputId.value,
            reqDate: nowDate(),
            sdp,
            roomId,
            usage: 'cam',
            useMediaSvr: 'N'
          };

          try {
            signalSocketIo.emit('knowledgetalk', ansData);
          } catch (err) {
            if (err instanceof SyntaxError) {
              alert(
                ' there was a syntaxError it and try again : ' + err.message
              );
            } else {
              throw err;
            }
          }
        });
      }
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
    else if (data.signalOp === 'Presence' && data.action === 'exit') {
      localStream.getTracks()[0].stop();
      localStream.getTracks()[1].stop();
      localStream = null;
      peerCon.close();
      peerCon = null;

      localVideo.srcObject = null;
      remoteVideo.srcObject = null;

      callBtn.disabled = true;
      tTextbox('통화가 종료되었습니다.')
    }

  });

  //화이트보드 버튼 클릭 이벤트(토글)
  whiteboardBtn.addEventListener('click', function (e) {
    whiteboardBtn.classList.toggle('on');
    if (whiteboardBtn.getAttribute('class') === 'on') {
      blackPen.disabled = false;
      redPen.disabled = false;
      bluePen.disabled = false;
      whiteboardClearBtn.disabled = false;
      tTextbox('화이트 보드가 활성화 되었습니다.')
      if (whiteboard.style.display === 'none') {
        whiteboard.style.display = 'inline-block';
        setPen();
      }
    } else if (whiteboardBtn.getAttribute('class') === '') {
      whiteboard.style.display = 'none'
      blackPen.disabled = true;
      redPen.disabled = true;
      bluePen.disabled = true;
      whiteboardClearBtn.disabled = true;
      tTextbox('화이트 보드가 닫혔습니다.');

      //검은색으로 변경
      setPen()
      sendColor("#000000")

      //화면 지우기
      context.clearRect(0, 0, whiteboard.width, whiteboard.height);

      sendReset();


    }
  });

  //지우기 버튼 클릭 이벤트
  whiteboardClearBtn.addEventListener('click', function (e) {
    tTextbox('화이트 보드 내용을 지웠습니다.')
    context.clearRect(0, 0, whiteboard.width, whiteboard.height);
    sendReset()
  });

  let isDrawing = false;
  let context = whiteboard.getContext('2d');

  if (whiteboard) {
    let canvasX;
    let canvasY;

    whiteboard.addEventListener('mousedown', function (e) {
      isDrawing = true;
      canvasX = e.pageX - whiteboard.offsetLeft;
      canvasY = e.pageY - whiteboard.offsetTop;

      drawing('start', canvasX, canvasY);

      context.beginPath();
      context.moveTo(canvasX, canvasY);
    });
    whiteboard.addEventListener('mousemove', function (e) {
      if (isDrawing === false) return;

      drawing('move', canvasX, canvasY);

      canvasX = e.pageX - whiteboard.offsetLeft;
      canvasY = e.pageY - whiteboard.offsetTop;
      context.lineTo(canvasX, canvasY);
      context.stroke();
    });
    whiteboard.addEventListener('mouseup', function (e) {
      isDrawing = false;

      drawing('end', canvasX, canvasY);

      context.closePath();
    });
  }

  blackPen.addEventListener('click', e => {
    tTextbox('검정색을 선택하셨습니다.')
    blackPen.disabled = true;
    redPen.disabled = false;
    bluePen.disabled = false;

    context.strokeStyle = 'black';

    sendColor("#000000")
  })

  redPen.addEventListener('click', e => {
    tTextbox('빨간색을 선택하셨습니다.')
    blackPen.disabled = false;
    redPen.disabled = true;
    bluePen.disabled = false;
    context.strokeStyle = 'red';

    sendColor("#ff0000")
  })

  bluePen.addEventListener('click', e => {
    tTextbox('파란색을 선택하셨습니다.')
    blackPen.disabled = false;
    redPen.disabled = false;
    bluePen.disabled = true
    context.strokeStyle = 'blue';

    sendColor("#0000ff")
  })

  const setPen = () => {
    context.globalCompositeOperation = 'source-over';
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = 'black';
    context.lineWidth = '5';
  }

  const sendColor = (color) => {
    let colorData = {
      signalOp: "Color",
      reqNo: reqNumber(),
      color: color
    }

    signalSocketIo.emit('knowledgetalk', colorData);
    tLogBox('knowledgetalk', colorData);
  }

  const sendReset = () => {
    let clearData = {
      signalOp: 'Reset',
      reqNo: reqNumber(),
      reqDate: getDate(),
      roomId
    };

    try {
      tLogBox('send', clearData);
      signalSocketIo.emit('knowledgetalk', clearData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  }

  const drawing = (status, axisX, axisY) => {
    let drawData = {
      signalOp: 'Draw',
      axisX,
      axisY,
      boardWidth: whiteboard.width,
      boardHeight: whiteboard.height,
      status,
      roomId
    };

    try {
      tLogBox('send', drawData);
      signalSocketIo.emit('knowledgetalk', drawData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  }

})