document.addEventListener('DOMContentLoaded',function(){
  const inputId = document.getElementById('inputid');
  const inputPw = document.getElementById('inputpw');
  const inputTarget = document.getElementById('inputTarget');
  const loginBtn = document.getElementById('loginBtn');
  const callBtn = document.getElementById('callBtn');
  const exitBtn = document.getElementById('exitBtn');
  const chatBtn = document.getElementById('chatBtn');
  const message = document.getElementById('message');

  let reqNo = 1;
  let configuration = [];

  loginBtn.addEventListener('click',function(e){
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
          if(err instanceof SyntaxError){
              alert('there was a syntaxError it and try again : ' + err.message);
          } else {
              throw err;
          }
      }
  });

  callBtn.addEventListener('click', function (e){
      let callData = {
          eventOp: 'Call',
          reqNo: reqNo++,
          reqDate: nowDate(),
          userId: inputId.value,
          targetId: [inputTarget.value],
          serviceType: 'call',
          reqDeviceType: 'pc'
      };

      try {
          tLogBox('send(call)', callData);
          signalSocketIo.emit('knowledgetalk', callData);
      } catch (err) {
          if(err instanceof SyntaxError){
              alert('there was a syntaxError it and try again : ' + err.message);
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
          loginBtn.disabled = false;
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

  //채팅 송신 버튼 클릭 이벤트
  chatBtn.addEventListener('click',function(e){
      if((message.value).trim() === '' || message.value == null){
          return false;
       }

      let chatData = {
          signalOp: 'Chat',
          userId: inputId.value,
          message: message.value
      }

      try {
          tLogBox('send',chatData);
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
  });

  //채팅 작성 엔터 이벤트
  message.addEventListener('keydown', function (e) {
      if(event.keyCode == 13){
          //공백 필터링
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
              chatTextBox(chatData.userId + ' : ' + chatData.message)
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

  signalSocketIo.on('knowledgetalk',function(data){
      tLogBox('receive',data);

      if(!data.eventOp && !data.signalOp){
          tLogBox('error', 'eventOp undefined');
      }

      //로그인시 처리 이벤트
      if (data.eventOp === 'Login' && data.code === '200') {
          inputId.disabled = true;
          inputPw.disabled = true;
          loginBtn.disabled = true;
          callBtn.disabled = false;
          tTextbox('로그인 되었습니다.');
      }

      if (data.eventOp === 'Login' && data.code !== '200') {
          tTextbox('아이디 비번을 다시 확인해주세요');
      }

      //전화 걸기 버튼 클릭시 이벤트
      if(data.eventOp === 'Call' && data.code === '200') {
          inputTarget.disabled = true;
          callBtn.disabled = true;
          exitBtn.disabled = false;
          tTextbox('상대방에게 통화 연결중입니다...')
          roomId = data.roomId
          if(data.message !== 'OK'){
              return;
          }
      }

      if (data.eventOp === 'Call' && data.code !== '200') {
          roomId = data.roomId;
          let sendData = {
              eventOp: 'ExitRoom',
              reqNo: reqNo++,
              userId: inputId.value,
              userName : inputId.value,
              reqDate: nowDate(),
              roomId: roomId
          };
          try {
              signalSocketIo.emit('knowledgetalk', sendData);
              tTextbox('상대방이 로그인 되어 있지 않습니다.');
          } catch (err) {
          if (err instanceof SyntaxError) {
              alert(' there was a syntaxError it and try again : ' + err.message);
          } else {
              throw err;
          }
          }
      }

       //전화 걸기 됐을때 이벤트
       if(data.signalOp === 'Presence' && data.action === 'join'){
          callBtn.disabled = true;
          message.disabled = false;
          chatBtn.disabled = false;
          exitBtn.disabled = false;
          tTextbox('통화가 연결되었습니다.');
      }

      //채팅내용 송신했을 때 이벤트
      if(data.signalOp === 'Chat'){
          document.getElementById('chat_Box').style.display = 'block';
          chatTextBox(data.userId + ' : ' + data.message);
      }

      //내가 통화 종료를 클릭시 이벤트
      if (data.eventOp === 'ExitRoom' && data.code ==='200'){
          inputTarget.disabled = true;
          loginBtn.disabled = true;
          callBtn.disabled = true;
          exitBtn.disabled = true;
          message.disabled = true;
          chatBtn.disabled = true;

          //종료시 글 내용 삭제이벤트
          document.getElementById('chat_Box').innerHTML = ""
          document.getElementById('chat_Box').style.display = 'none';
          tTextbox('통화가 종료 되었습니다')
      }

      //상대방이 나갔을경우 이벤트
      if (data.signalOp === 'Presence' && (data.action === 'exit' || data.action ==='end')){

          inputTarget.disabled = true;
          loginBtn.disabled = true;
          callBtn.disabled = true;
          exitBtn.disabled = true;
          message.disabled = true;
          chatBtn.disabled = true;

          //종료시 글 내용 삭제이벤트
          document.getElementById('chat_Box').innerHTML = "";
          document.getElementById('chat_Box').style.display = 'none';

          tTextbox('통화가 종료 되었습니다.');
      }

  });

})