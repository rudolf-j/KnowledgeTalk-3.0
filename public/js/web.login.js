document.addEventListener('DOMContentLoaded', function () {

  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  let reqNo = 1

  signalSocketIo.on('knowledgetalk', function (data) {
      tLogBox('receive', data);

      if (!data.eventOp && !data.signalOp) {
          tLogBox('error', 'eventOp undefined');
          return;
      }

      //로그인 이벤트
      if( data.eventOp === 'Login' && data.code === '200'){
          tTextbox('로그인 되었습니다.')
          inputId.disabled = true;
          inputPw.disabled = true;
          loginBtn.disabled = true;
          logoutBtn.disabled = false;
      } else if (data.eventOp === 'Login' && data.code === '111'){
          tTextbox('이미 로그인 되어 있습니다.')
      } else if (data.eventOp === 'Login' && data.code !== '200'){
          tTextbox('아이디 비밀번호를 다시 확인해주세요.')
      }

      //로그 아웃
      if (data.eventOp === 'Logout' && data.code === '200'){
          tTextbox('로그아웃 되었습니다.');
          inputId.disabled = false;
          inputPw.disabled = false;
          loginBtn.disabled = false;
          logoutBtn.disabled = true;
      }
    });

  //로그인 했을 때,
  loginBtn.addEventListener('click', function (e) {
      let loginData = {
          eventOp: 'Login',
          reqNo: reqNo++,
          reqDate: nowDate(),
          userId: inputId.value,
          userPw: passwordSHA256(inputPw.value),
          deviceType: 'pc'
      };

      try {
          tLogBox('send', loginData);
          signalSocketIo.emit('knowledgetalk', loginData);
      } catch (err) {
          if (err instanceof SyntaxError) {
              alert('there was a syntaxError it and try again:' + err.message);
          } else {
              throw err;
          }
      }
  });

  //로그아웃 했을 때,
  logoutBtn.addEventListener('click', function (e) {
      let logoutData = {
          eventOp: 'Logout',
          reqNo: reqNo++,
          userId: inputId.value,
          reqDate: nowDate()
      };
      try {
          tLogBox('send', logoutData);
          signalSocketIo.emit('knowledgetalk', logoutData);
      } catch (err) {
          if (err instanceof SyntaxError) {
              alert('there was a syntaxError it and try again:' + err.message);
          } else {
              throw err;
          }
      }
  });
});