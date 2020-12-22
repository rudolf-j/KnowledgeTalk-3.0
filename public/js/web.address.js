document.addEventListener('DOMContentLoaded', function () {
  let inputId = document.getElementById('inputId');
  let inputPw = document.getElementById('inputPw');
  let addBtn = document.getElementById('addBtn');
  let delBtn = document.getElementById('delBtn');
  let LoginBtn = document.getElementById('LoginBtn')
  let searchBtn = document.getElementById('searchBtn');
  let inputTarget = document.getElementById('inputTarget');
  let listBtn = document.getElementById('listBtn');

  signalSocketIo.on('knowledgetalk', function (data) {

    tLogBox('receive', data);
    if (!data.eventOp && !data.signalOp) {
      tLogBox('error', 'eventOp undefind');
    }

    //로그인 응답
    if (data.eventOp == 'Login') {
      if (data.code == '200') {
        inputId.disabled = true;
        inputPw.disabled = true;
        LoginBtn.disabled = true;
        searchBtn.disabled = false;
        addBtn.disabled = false;
        delBtn.disabled = false;
        listBtn.disabled = false;
        tTextbox('로그인이 되었습니다.')
      } else if (data.code !== '200') {
        tTextbox('아이디 비밀번호를 다시 확인해주세요')
      }
    }
    //친구목록 조회 응답
    else if (data.eventOp === 'MemberList') {
      //친구 목록 조회
      if (data.type === "friend") {
        let friends = '친구 목록 : ';

        for (let i = 0; i < data.result.friend.length; i++) {
          friends += data.result.friend[i].id
            + (i < data.result.friend.length - 1 ? ', ' : '');
        }
        tTextbox(friends);
      }
      //검색
      else if (data.type === "common" && data.code === '200') {
        let test = data.result.common

        let searchId = '';
        for (var i = 0; i < test.length; i++) {
          searchId += data.result.common[i].id
          searchId += i < test.length - 1 ? ',' : ''
        }

        let search = '검색 결과 : ' + searchId;
        tTextbox(search);
      }
      //검색 결과가 없는 경우
      else if (data.type === "common" && data.code === '403') {
        tTextbox('해당 친구 이름은 없습니다.');
      }
    }
    //친구 추가, 삭제 응답
    else if (data.eventOp === 'Contact') {
      if (data.type === 'add') {
        tTextbox(`${inputTarget.value} 가 추가 되었습니다.`)
      }
      else if (data.type === 'delete') {
        tTextbox(`${inputTarget.value} 가 삭제 되었습니다.`)
      }
    }
  });

  LoginBtn.addEventListener('click', function (e) {
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
        alert('there was a syntaxError it and try again :' + err.message);
      } else {
        throw err;
      }
    }
  });

  listBtn.addEventListener('click', e => {
    memberList('friend')
  })

  //검색 클릭 이벤트
  searchBtn.addEventListener('click', e => {
    if (inputTarget.value.trim() === '' || inputTarget.value == null) {
      return;
    }
    memberList('common', inputTarget.value)
  })

  // 친구추가 클릭 이벤트
  addBtn.addEventListener('click', function (e) {
    if (inputTarget.value.trim() === '' || inputTarget.value == null) {
      return false;
    }

    let addFriend = {
      eventOp: 'Contact',
      reqNo: reqNumber(),
      reqDate: getDate(),
      type: 'add',
      target: inputTarget.value
    };

    try {
      tLogBox('send', addFriend);
      signalSocketIo.emit('knowledgetalk', addFriend);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('there was a syntaxError it and try again :' + err.message);
      } else {
        throw err;
      }
    }
  });

  //친구 삭제 클릭 이벤트
  delBtn.addEventListener('click', function (e) {
    if (inputTarget.value.trim() === '' || inputTarget.value == null) {
      return false;
    }

    let delFriend = {
      eventOp: 'Contact',
      reqNo: reqNumber(),
      reqDate: getDate(),
      type: 'delete',
      target: inputTarget.value
    };

    try {
      tLogBox('send', delFriend);
      signalSocketIo.emit('knowledgetalk', delFriend);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('there was a syntaxError it and try again :' + err.message);
      } else {
        throw err;
      }
    }
  });

  function memberList(type, search) {

    let memberList = {
      eventOp: 'MemberList',
      reqNo: reqNumber(),
      reqDate: getDate(),
      type: type,
      option: {
        limit: 10,
        offset: 0
      },
      search: search
    };

    try {
      tLogBox('send', memberList);
      signalSocketIo.emit('knowledgetalk', memberList);
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert(' there was a syntaxError it and try again : ' + err.message);
      } else {
        throw err;
      }
    }
  }

});