document.addEventListener('DOMContentLoaded', function () {
  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const loginBtn = document.getElementById('loginBtn');
  const callBtn = document.getElementById('callBtn');
  const joinBtn = document.getElementById('joinBtn');
  const exitBtn = document.getElementById('exitBtn');
  const sessionBtn = document.getElementById('sessionBtn');
  const sessionCancelBtn = document.getElementById('sessionCancelBtn');

  let reqNo = 1;

  let kurentoPeer;

  signalSocketIo.on('knowledgetalk', function (data) {

    tLogBox('receive', data);

    if (!data.eventOp && !data.signalOp) {
      console.log('error', 'eventOp undefined');
    }

    //로그인 응답
    if (data.eventOp === 'Login') {
      loginBtn.disabled = true;
      if (data.code === '200') {
        callBtn.disabled = false;
      }
      tTextbox('로그인이 되었습니다.')
    }
    //초대 응답
    else if (data.eventOp === 'Invite') {
      roomId = data.roomId;

      callBtn.disabled = true;
      joinBtn.disabled = false;
    }
    //전화걸기 응답
    else if (data.eventOp === 'Call') {
      if (data.code === '200') {
        roomId = data.roomId;
        callBtn.disabled = true;
        exitBtn.disabled = false;
        tTextbox('회의에 초대 중 입니다.')
      }
      else {
        tTextbox('초대 불가능합니다. 다시 시도하시기 바랍니다.')
      }
    }
    //회의참여 응답
    else if (data.eventOp === 'Join') {
      tTextbox('회의에 입장 하였습니다.')
      roomId = data.roomId;
      joinBtn.disabled = true;
      exitBtn.disabled = false;
      sessionBtn.disabled = false;
    }
    //공유자원 응답
    else if (data.eventOp === 'SessionReserve') {
      if (data.code === '200') {
        tTextbox('공유자원이 예약되었습니다.');
        sessionBtn.disabled = true;
        sessionCancelBtn.disabled = false;
      } else if (data.code === '440') {
        tTextbox('이미 예약되어 있습니다.')
      }
    }
    //공유자원 종료 응답
    else if (data.eventOp === 'SessionReserveEnd') {
      if (data.code === '200') {
        tTextbox('공유자원이 해제되었습니다.');
        sessionCancelBtn.disabled = true;
        sessionBtn.disabled = false;
      }
    }
    //SDP 응답
    else if (data.eventOp === 'SDP') {
      if (data.sdp && data.sdp.type === 'answer' && kurentoPeer) {
      }
    }
    //Candidate 응답
    else if (data.eventOp === 'Candidate') {
      if (!data.candidate) return;

      let iceData = {
        eventOp: 'Candidate',
        reqNo: reqNo++,
        resDate: nowDate(),
        userId: inputId.value,
        roomId: data.roomId,
        candidate: data.candidate,
        useMediaSvr: 'Y',
        usage: 'cam'
      };

      try {
        console.log('send', iceData);
        signalSocketIo.emit('knowledgetalk', iceData);
      } catch (err) {
        if (err instanceof SyntaxError) {
          alert(' there was a syntaxError it and try again : ' + err.message);
        } else {
          throw err;
        }
      }
    }
    else if (data.signalOp === 'Presence' && data.action === 'join') {
      tTextbox('회의에 입장 하였습니다.')
      sessionBtn.disabled = false
    }
  });


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

  callBtn.addEventListener('click', function (e) {
    let callData = {
      eventOp: 'Call',
      reqNo: reqNumber(),
      userId: inputId.value,
      reqDate: getDate(),
      reqDeviceType: 'pc',
      serviceType: 'multi',
      targetId: ['a2']
    };

    try {
      tLogBox('send', callData);
      signalSocketIo.emit('knowledgetalk', callData);
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
      reqNo: reqNo++,
      reqDate: nowDate(),
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

  exitBtn.addEventListener('click', function (e) {
    loginBtn.disabled = false;
    callBtn.disabled = true;
    joinBtn.disabled = true;
    exitBtn.disabled = true;
  });

  sessionBtn.addEventListener('click', function (e) {
    let sessionData = {
      eventOp: 'SessionReserve',
      reqNo: reqNo++,
      userId: inputId.value,
      reqDate: nowDate(),
      roomId
    }
    try {
      tLogBox('send', sessionData);
      signalSocketIo.emit('knowledgetalk', sessionData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  })

  sessionCancelBtn.addEventListener('click', e => {
    let sessionData = {
      eventOp: 'SessionReserveEnd',
      reqNo: reqNumber(),
      userId: inputId.value,
      reqDate: getDate(),
      roomId
    }
    try {
      tLogBox('send', sessionData);
      signalSocketIo.emit('knowledgetalk', sessionData);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  })
});
