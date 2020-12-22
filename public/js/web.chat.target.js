document.addEventListener('DOMContentLoaded', function () {
  const inputId = document.getElementById('inputId');
  const inputPw = document.getElementById('inputPw');
  const loginBtn = document.getElementById('loginBtn');
  const joinBtn = document.getElementById('joinBtn');
  const exitBtn = document.getElementById('exitBtn');
  const chatBtn = document.getElementById('chatBtn');

  let reqNo = 1;
  let configuration = [];

  loginBtn.addEventListener('click', function (e) {
      let loginData = {
          eventOp: 'Login',
          reqNo: reqNo++,
          userId: inputId.value,
          userPw: passwordSHA256(inputPw.value),
          reqDate: nowDate(),
          deviceType: 'pc'
      };

      try {
          tLogBox('send(login)', loginData);
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
          reqNo: reqNo++,
          reqDate: nowDate(),
          userId: inputId.value,
          roomId,
          status: 'accept'
      };

      try {
          tLogBox('send(join)', joinData);
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
      let callEndData = {
          eventOp: 'ExitRoom',
          reqNo: reqNo,
          userId: inputId.value,
          reqDate: nowDate(),
          roomId
      };

      try {
          //loginBtn.disabled = true;
          joinBtn.disabled = true;
          tLogBox('send', callEndData);
          signalSocketIo.emit('knowledgetalk', callEndData);
          if (window.roomId) {
              peerCon = new RTCPeerConnection(configuration);
              peerCon.close();
              peerCon = null;
              window.roomId = null;
          }

      } catch (err) {
          if (err instanceof SyntaxError) {
              alert('there was a syntaxError it and try again:' + err.message);
          } else {
              throw err;
          }
      }
  });

  //채팅송신 버튼 클릭 이벤트
  chatBtn.addEventListener('click', function (e) {
      if((message.value).trim() === '' || message.value == null){
          return false;
      }

      let chatData = {
          signalOp: 'Chat',
          userId: inputId.value,
          message: message.value
      }

      try {
          tLogBox('send', chatData);
          document.getElementById('chat_Box').style.display = 'block';
          chatTextBox( chatData.userId + ' : ' + chatData.message);
          signalSocketIo.emit('knowledgetalk', chatData);
          message.value = '';
      } catch (err) {
          if (err instanceof SyntaxError) {
              alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
              throw err;
          }
      }
  });

  //채팅 작성 엔터 이벤트
  message.addEventListener('keydown', function (e) {
      if(event.keyCode == 13){
          if((message.value).trim() === '' || message.value == null){
              return false;
          }

          let chatData = {
              signalOp: 'Chat',
              userId: inputId.value,
              message: message.value
          }

          try {
              tLogBox('send', chatData);
              document.getElementById('chat_Box').style.display = 'block';
              chatTextBox(chatData.userId + ' : ' + chatData.message);
              signalSocketIo.emit('knowledgetalk', chatData);
              message.value = '';
          } catch (err) {
              if (err instanceof SyntaxError) {
                  alert(' there was a syntaxError it and try again : ' + err.message);
              } else {
                  throw err;
              }
          }
      }
  });

  signalSocketIo.on('knowledgetalk', function (data) {
      tLogBox('receive', data);

      if (!data.eventOp && !data.signalOp) {
          tLogBox('error', 'eventOp undefined');
      }

      //로그인시 처리 이벤트
      if (data.eventOp === 'Login' && data.code === '200') {
          inputId.disabled = true;
          inputPw.disabled = true;
          loginBtn.disabled = true;
          tTextbox('로그인 되었습니다.');
      } 
      if (data.eventOp === 'Login' && data.code !== '200') {
          tTextbox('아이디 비밀번호를 다시 확인해 주세요')
      }

      if (data.eventOp === 'Invite') {
          roomId = data.roomId;
          joinBtn.disabled = false;
          tTextbox(data.userId+'님이 통화를 요청합니다.')
      }

      if (data.eventOp === 'Join' && data.code === '200') {
          message.disabled = false;
          chatBtn.disabled = false;
          joinBtn.disabled = true;
          exitBtn.disabled = false;
          tTextbox('통화가 연결되었습니다.');
      }

      //채팅내용 송신했을 때 이벤트
      if (data.signalOp === 'Chat') {
          document.getElementById('chat_Box').style.display = 'block';
          chatTextBox( data.userId + ' : ' + data.message)
      }

      //방장이 나갔을때 이벤트
      if (data.signalOp ==='Presence' && (data.action ==='end'|| data.action ==='exit')){
          message.disabled = true;
          chatBtn.disabled = true;
          loginBtn.disabled = true;
          exitBtn.disabled = true;
          joinBtn.disabled = true;

          //종료시 글 내용 삭제이벤트
          document.getElementById('chat_Box').innerHTML = ""
          document.getElementById('chat_Box').style.display = 'none';
          tTextbox('통화가 종료 되었습니다.')
      }
      //내가 통화 종료를 클릭시 이벤트 
      if (data.eventOp === 'ExitRoom' && data.code ==='200'){
          loginBtn.disabled = true;
          exitBtn.disabled = true;
          message.disabled = true;
          chatBtn.disabled = true;
          joinBtn.disabled = true;

          //종료시 글 내용 삭제이벤트
          document.getElementById('chat_Box').innerHTML = ""
          document.getElementById('chat_Box').style.display = 'none';
          tTextbox('통화가 종료 되었습니다.')
      }
  })

})