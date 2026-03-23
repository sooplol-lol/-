// ==UserScript==
// @name         디시인사이드 메모
// @namespace    http://tampermonkey.net/
// @version      1.3
// @license      MIT
// @author       YourNickname
// @description  디시인사이드 유저 닉네임 옆에 메모를 달아주는 단순 편의 기능입니다. (No Adult Content)
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

    // 1. 글자 잘림 방지 CSS
    const style = document.createElement('style');
    style.innerHTML = `
        td.gall_writer { width: auto !important; white-space: nowrap !important; }
        .ub-writer, .ub-writer .nickname { max-width: none !important; overflow: visible !important; text-overflow: clip !important; }
    `;
    document.head.appendChild(style);

    // 2. 데이터 불러오기
    let memoDataString = GM_getValue('myDcMemo_Safe', null);
    if (!memoDataString) {
        const oldData = localStorage.getItem('myDcMemo');
        memoDataString = oldData ? oldData : JSON.stringify({"UID": {}, "IP": {}});
        GM_setValue('myDcMemo_Safe', memoDataString);
    }
    let memoData = JSON.parse(memoDataString);

    function saveData(data) {
        GM_setValue('myDcMemo_Safe', JSON.stringify(data));
        memoData = data;
    }

    // 3. 색상 랜덤 생성
    function getDynamicHexColor() {
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(Math.random() * 31) + 70; 
        const l = Math.floor(Math.random() * 16) + 30; 
        const f = n => {
            const k = (n + h / 30) % 12;
            const a = s * Math.min(l/100, 1 - l/100) / 100;
            const color = (l/100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    // 4. 관리 버튼 생성
    function createManageButton() {
        const btn = document.createElement('button');
        btn.textContent = "💾 메모 백업/관리";
        btn.style = "position:fixed; bottom:20px; left:20px; z-index:9999; padding:8px 12px; background:#3b4890; color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:bold; box-shadow:0px 2px 5px rgba(0,0,0,0.3);";
        btn.onclick = () => {
            const action = prompt("[ 1 ] 백업 추출\n[ 2 ] JSON 데이터 추가\n[ 3 ] 텍스트(아이디-메모) 추가\n[ 9 ] 전체 초기화");
            if (action === '1') prompt("코드를 복사해서 보관하세요:", GM_getValue('myDcMemo_Safe'));
            else if (action === '2') {
                const d = prompt("JSON 코드를 붙여넣으세요.");
                if(d) { try { const n = JSON.parse(d); let c = JSON.parse(GM_getValue('myDcMemo_Safe')); Object.assign(c.UID, n.UID); Object.assign(c.IP, n.IP); saveData(c); alert("병합 완료!"); location.reload(); } catch(e){alert("잘못된 형식입니다.");}}
            } else if (action === '3') {
                const d = prompt("아이디 - 메모 형식으로 입력하세요.");
                if(d) {
                    let c = JSON.parse(GM_getValue('myDcMemo_Safe'));
                    d.split('\n').forEach(l => {
                        const s = l.indexOf('-');
                        if(s !== -1) {
                            const i = l.substring(0, s).trim(), t = l.substring(s+1).trim();
                            const type = /^[0-9]{1,3}\.[0-9]{1,3}/.test(i) ? 'IP' : 'UID';
                            c[type][i] = { text: t, color: getDynamicHexColor() };
                        }
                    });
                    saveData(c); alert("추가 완료!"); location.reload();
                }
            } else if (action === '9' && confirm("모든 메모를 삭제하시겠습니까?")) { saveData({"UID":{},"IP":{}}); location.reload(); }
        };
        document.body.appendChild(btn);
    }
    createManageButton();

    // 5. 실시간 메모 적용
    function applyMemo() {
        document.querySelectorAll('.ub-writer:not([data-memo-applied])').forEach(writer => {
            writer.setAttribute('data-memo-applied', 'true');
            const uid = writer.getAttribute('data-uid'), ip = writer.getAttribute('data-ip'), nick = writer.querySelector('.nickname');
            if (!nick) return;
            const displayId = uid || ip, idType = uid ? "UID" : "IP", memo = memoData[idType][displayId];
            if (!displayId) return;

            if (uid) {
                const t = document.createElement('span');
                t.textContent = ` (${uid})`;
                t.style = "font-size:0.85em; color:#333; font-weight:bold; margin-left:4px;";
                nick.appendChild(t);
            }
            if (memo) {
                const m = document.createElement('span');
                m.textContent = memo.text;
                m.style = `background-color:${memo.color}; color:#fff; font-weight:bold; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px; box-shadow:0px 1px 2px rgba(0,0,0,0.3);`;
                nick.appendChild(m);
            }
            nick.oncontextmenu = e => {
                e.preventDefault();
                const nt = prompt(`[${displayId}] 메모를 입력하세요.\n(지우려면 내용을 비우고 확인)`);
                if (nt === null) return;
                if (nt === "") delete memoData[idType][displayId];
                else memoData[idType][displayId] = { text: nt, color: getDynamicHexColor() };
                saveData(memoData); location.reload();
            };
        });
    }
    applyMemo(); setInterval(applyMemo, 1000);
})();
