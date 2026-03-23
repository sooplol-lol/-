// ==UserScript==
// @name         디시인사이드 메모
// @namespace    http://tampermonkey.net/
// @version      1.0
// @license      MIT
// @author       YourNickname
// @description  디시인사이드 유저 닉네임 옆에 메모를 달아주는 단순 편의 기능입니다. (색상 선택 기능 포함)
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dcinside.com
// @match        https://gall.dcinside.com/board/lists*
// @match        https://gall.dcinside.com/board/view*
// @match        https://gall.dcinside.com/mgallery/board/lists*
// @match        https://gall.dcinside.com/mgallery/board/view*
// @match        https://gall.dcinside.com/mini/board/lists*
// @match        https://gall.dcinside.com/mini/board/view*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // 1. CSS 설정 (잘림 방지 및 에디터 스타일)
    const style = document.createElement('style');
    style.innerHTML = `
        td.gall_writer { width: auto !important; white-space: nowrap !important; }
        .ub-writer, .ub-writer .nickname { max-width: none !important; overflow: visible !important; text-overflow: clip !important; }
        #dc-memo-editor input[type="text"] { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #dc-memo-editor input[type="color"] { width: 100%; height: 40px; border: none; cursor: pointer; margin-bottom: 15px; background: none; }
        #dc-memo-editor button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // 2. 데이터 관리
    let memoData = JSON.parse(GM_getValue('myDcMemo_Safe', JSON.stringify({"UID": {}, "IP": {}})));
    function saveData(data) { GM_setValue('myDcMemo_Safe', JSON.stringify(data)); memoData = data; }

    // 3. 커스텀 에디터 UI
    function openEditor(id, type, currentMemo, callback) {
        if(document.getElementById('dc-memo-overlay')) document.getElementById('dc-memo-overlay').remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'dc-memo-overlay';
        overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; display:flex; justify-content:center; align-items:center;';
        
        const defaultColor = currentMemo ? currentMemo.color : "#3b4890";
        const defaultText = currentMemo ? currentMemo.text : "";

        overlay.innerHTML = `
            <div id="dc-memo-editor" style="background:#fff; padding:20px; border-radius:8px; width:280px; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-family:sans-serif;">
                <h4 style="margin:0 0 10px 0; color:#3b4890;">[${id}] 메모 설정</h4>
                <input type="text" id="memo-input" value="${defaultText}" placeholder="메모 내용을 입력하세요">
                <label style="font-size:12px; color:#666; display:block; margin-bottom:5px;">배경 색상 선택</label>
                <input type="color" id="color-input" value="${defaultColor}">
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <button id="memo-del" style="background:#ff4c4c; color:#fff; ${currentMemo ? '' : 'display:none;'}">삭제</button>
                    <div>
                        <button id="memo-cancel" style="background:#eee; color:#333; margin-right:5px;">취소</button>
                        <button id="memo-save" style="background:#3b4890; color:#fff;">저장</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const input = document.getElementById('memo-input');
        input.focus();
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById('memo-save').click(); };

        document.getElementById('memo-save').onclick = () => {
            const text = document.getElementById('memo-input').value.trim();
            const color = document.getElementById('color-input').value;
            callback(text, color); overlay.remove();
        };
        document.getElementById('memo-cancel').onclick = () => overlay.remove();
        document.getElementById('memo-del').onclick = () => { callback("", ""); overlay.remove(); };
    }

    // 4. 관리 메뉴 버튼
    function createManageButton() {
        const btn = document.createElement('button');
        btn.textContent = "💾 메모 백업/관리";
        btn.style = "position:fixed; bottom:20px; left:20px; z-index:9998; padding:8px 12px; background:#3b4890; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 5px rgba(0,0,0,0.3); opacity:0.6;";
        btn.onmouseover = () => btn.style.opacity = "1";
        btn.onmouseout = () => btn.style.opacity = "0.6";
        btn.onclick = () => {
            const action = prompt("[ 1 ] 내 메모 백업하기\n[ 2 ] 백업 데이터 넣기\n[ 9 ] 전체 초기화");
            if (action === '1') prompt("아래 코드를 복사해서 따로 저장해두세요:", GM_getValue('myDcMemo_Safe'));
            else if (action === '2') {
                const d = prompt("백업받았던 JSON 코드를 붙여넣으세요.");
                if(d) { try { const n = JSON.parse(d); Object.assign(memoData.UID, n.UID); Object.assign(memoData.IP, n.IP); saveData(memoData); alert("불러오기 성공!"); location.reload(); } catch(e){alert("잘못된 형식입니다.");}}
            } else if (action === '9' && confirm("모든 메모를 삭제하시겠습니까?")) { saveData({"UID":{},"IP":{}}); location.reload(); }
        };
        document.body.appendChild(btn);
    }
    createManageButton();

    // 5. 실시간 적용 로직
    function applyMemo() {
        document.querySelectorAll('.ub-writer:not([data-memo-applied])').forEach(writer => {
            writer.setAttribute('data-memo-applied', 'true');
            const uid = writer.getAttribute('data-uid'), ip = writer.getAttribute('data-ip'), nick = writer.querySelector('.nickname');
            if (!nick) return;
            const id = uid || ip, type = uid ? "UID" : "IP", memo = memoData[type][id];
            if (!id) return;

            // 아이디(UID) 표시 (고닉/반고닉만)
            if (uid) {
                const s = document.createElement('span');
                s.textContent = ` (${uid})`; s.style = "font-size:0.85em; color:#666; font-weight:bold; margin-left:4px;";
                nick.appendChild(s);
            }
            // 메모 표시
            if (memo && memo.text) {
                const m = document.createElement('span');
                m.textContent = memo.text;
                m.style = `background-color:${memo.color}; color:#fff; font-weight:bold; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px; box-shadow:0px 1px 2px rgba(0,0,0,0.2);`;
                nick.appendChild(m);
            }

            // 우클릭 이벤트
            nick.style.cursor = "pointer";
            nick.oncontextmenu = e => {
                e.preventDefault();
                openEditor(id, type, memo, (newText, newColor) => {
                    if (!newText) delete memoData[type][id];
                    else memoData[type][id] = { text: newText, color: newColor };
                    saveData(memoData); location.reload();
                });
            };
        });
    }
    applyMemo(); setInterval(applyMemo, 1000);
})();
