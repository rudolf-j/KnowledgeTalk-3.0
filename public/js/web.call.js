document.addEventListener('DOMContentLoaded', function () {
  const inputId = document.getElementById('inputid');
  const inputPw = document.getElementById('inputpw');
  const inputTarget = document.getElementById('inputTarget');
  const loginBtn = document.getElementById('loginBtn');
  const callBtn = document.getElementById('callBtn');
  const exitBtn = document.getElementById('exitBtn');
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');

  let reqNo = 1;
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

  exitBtn.addEventListener('click', function (e) {
      localStream.getTracks()[0].stop();
      localStream.getTracks()[1].stop();
      localStream = null;
      peerCon.close();
      peerCon = null;

      localVideo.srcObject = null;
      remoteVideo.srcObject = null;

      callBtn.disabled = false;
      exitBtn.disabled = true;

      let callEndData = {
          eventOp: 'ExitRoom',
          reqNo: reqNo,
          userId: inputId.value,
          reqDate: nowDate(),
          roomId
      };

      try {
          tLogBox('send', callEndData);
          signalSocketIo.emit('knowledgetalk', callEndData);

          //추가한부분 : 텍스트박스 내용변경
          tTextbox('전화를 종료했습니다.');

      } catch (err) {
          if (err instanceof SyntaxError) {
              alert('there was a syntaxError it and try again:' + err.message);
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
          if(data.code !== '200'){
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
                  tTextbox('전화가 연결 되었습니다.')
                  exitBtn.disabled = false;
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
          exitBtn.disabled = true;
          tTextbox('통화가 종료되었습니다.')
      }

  });
})