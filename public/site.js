// 読み物ページをキーボードだけで辿れるようにする。
//
// ゲーム本編がキーボードで完結するのに、読み物ページだけマウス前提だと
// 手を持ち替えることになる。マウス操作はそのまま使えるので、これは追加であって
// 置き換えではない。
//
//   Esc      ゲームへもどる
//   ↑ ↓      節（h2）を送る
//   ?        キー一覧を出す

(function () {
  "use strict";

  var root = document.body.getAttribute("data-root") || "../";
  var heads = Array.prototype.slice.call(document.querySelectorAll("main h2"));
  var index = -1;

  /** ワイプを出してから移動する。戻る操作にも同じ演出を使う。 */
  function leave(url) {
    document.body.classList.add("is-leaving");
    setTimeout(function () {
      location.href = url;
    }, 240);
  }

  function focusHeading(i) {
    if (heads.length === 0) return;
    index = Math.max(0, Math.min(heads.length - 1, i));
    heads.forEach(function (h, n) {
      h.classList.toggle("is-current", n === index);
    });
    heads[index].scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function toggleHelp() {
    var box = document.getElementById("keyhelp");
    if (box) {
      box.remove();
      return;
    }
    box = document.createElement("div");
    box.id = "keyhelp";
    box.className = "note";
    box.setAttribute(
      "style",
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10;max-width:420px;",
    );
    box.innerHTML =
      "<p><strong>キーボードで操作できます</strong></p>" +
      "<p>Esc … ゲームへもどる<br>↑ ↓ … 節を送る<br>Tab … リンクを辿る<br>? … この案内を閉じる</p>";
    document.body.appendChild(box);
  }

  document.addEventListener("keydown", function (e) {
    // 文字入力中は横取りしない。
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Escape") {
      e.preventDefault();
      leave(root);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusHeading(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusHeading(index - 1);
    } else if (e.key === "?") {
      e.preventDefault();
      toggleHelp();
    }
  });

  // 同じサイト内のリンクは、ワイプを挟んでから移動する。
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var url = a.getAttribute("href") || "";
    if (!url || url.charAt(0) === "#" || a.target === "_blank") return;
    if (/^https?:/.test(url) && a.hostname !== location.hostname) return;
    e.preventDefault();
    leave(a.href);
  });

  // ワイプ用の板を1枚だけ用意する。
  var wipe = document.createElement("div");
  wipe.id = "wipe";
  document.body.appendChild(wipe);
})();
